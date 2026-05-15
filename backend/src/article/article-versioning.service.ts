import { Article } from 'src/article/entities/article.entity';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ArticleStatus, NotificationType } from 'utils/constants';
import { NotificationService } from 'src/notification/notification.service';
import { ArticleView } from './entities/article-view.entity';
import { ArticleVersion } from './entities/article-version.entity';
import { ArticleService } from './article.service';

@Injectable()
export class ArticleVersioningService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepository: Repository<Article>,
        @InjectRepository(ArticleVersion)
        private readonly versionRepository: Repository<ArticleVersion>,
        @Inject(forwardRef(() => ArticleService))
        private readonly articleService: ArticleService,
        private readonly notificationService: NotificationService,
    ) { }

    // ────────────────────────────────────────────────
    // Méthode centrale de création de version
    // ────────────────────────────────────────────────
    async createNewVersion(
        article: Article,
        user: User,
        changeSummary: string,
    ): Promise<ArticleVersion> {
        const lastVersion = await this.versionRepository.findOne({
            where: { articleId: article.id },
            order: { versionNumber: 'DESC' },
        });

        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = this.versionRepository.create({
            article,
            articleId: article.id,
            versionNumber: nextVersionNumber,
            title: article.title,
            content: article.content,
            author: user,
            authorId: user.id,
            status: article.status,
            changeSummary,
            categorySnapshot: article.category
                ? { id: article.category.id, name: article.category.name }
                : undefined,
            tagsSnapshot: article.tags?.map((t) => ({ id: t.id, name: t.name })),
        });

        const savedVersion = await this.versionRepository.save(version);

        // Mettre à jour le numéro de version courante
        article.currentVersionNumber = nextVersionNumber;
        await this.articleRepository.save(article);

        return savedVersion;
    }

    // ────────────────────────────────────────────────
    // Historique complet
    // ────────────────────────────────────────────────
    async getHistory(articleId: number): Promise<ArticleVersion[]> {
        return this.versionRepository.find({
            where: { articleId },
            relations: ['author'],
            order: { versionNumber: 'DESC' },
        });
    }

    // ────────────────────────────────────────────────
    // Revenir à une version précédente
    // ────────────────────────────────────────────────
    async revertToVersion(
        articleId: number,
        versionNumber: number,
        user: User,
    ): Promise<Article> {
        const version = await this.versionRepository.findOneOrFail({
            where: { articleId, versionNumber },
        });

        const article = await this.articleRepository.findOneOrFail({
            where: { id: articleId },
            relations: ['category', 'tags'],
        });

        // Mise à jour des champs principaux
        article.title = version.title;
        article.content = version.content;
        article.status = version.status as ArticleStatus;

        // Note : on ne restaure PAS automatiquement category/tags (trop risqué)
        // → on peut le faire manuellement si vraiment nécessaire

        const updated = await this.articleRepository.save(article);

        // Créer une nouvelle version pour ce rollback
        await this.createNewVersion(
            updated,
            user,
            `Retour à la version ${versionNumber}`,
        );

        return this.articleService.findOne(articleId);
    }

}