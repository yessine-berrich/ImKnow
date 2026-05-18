import { Article } from 'src/article/entities/article.entity';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ArticleStatus } from 'utils/constants';
import { ArticleVersion } from './entities/article-version.entity';
import { ArticleService } from './article.service';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';

@Injectable()
export class ArticleVersioningService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepository: Repository<Article>,
        @InjectRepository(ArticleVersion)
        private readonly versionRepository: Repository<ArticleVersion>,
        @Inject(forwardRef(() => ArticleService))
        private readonly articleService: ArticleService,
    ) { }

    async createNewVersion(
        article: Article,
        user: User,
        changeSummary: string,
    ): Promise<ArticleVersion> {
        const articleWithRelations = await this.articleRepository.findOneOrFail({
            where: { id: article.id },
            relations: ['category', 'tags'],
        });

        const lastVersion = await this.versionRepository.findOne({
            where: { articleId: article.id },
            order: { versionNumber: 'DESC' },
        });

        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = this.versionRepository.create({
            article: articleWithRelations,
            articleId: article.id,
            versionNumber: nextVersionNumber,
            title: articleWithRelations.title,
            content: articleWithRelations.content,
            author: user,
            authorId: user.id,
            status: articleWithRelations.status,
            changeSummary,
            categorySnapshot: articleWithRelations.category
                ? {
                    id: articleWithRelations.category.id,
                    name: articleWithRelations.category.name,
                }
                : undefined,
            tagsSnapshot: articleWithRelations.tags?.map((tag) => ({
                id: tag.id,
                name: tag.name,
            })) ?? [],
        });

        const savedVersion = await this.versionRepository.save(version);

        await this.articleRepository.update(article.id, {
            currentVersionNumber: nextVersionNumber,
        });

        return savedVersion;
    }

    async getHistory(articleId: number): Promise<ArticleVersion[]> {
        return this.versionRepository.find({
            where: { articleId },
            relations: ['author'],
            order: { versionNumber: 'DESC' },
        });
    }

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

        article.title = version.title;
        article.content = version.content;
        article.status = version.status as ArticleStatus;

        if (version.categorySnapshot?.id) {
            article.category = {
                id: version.categorySnapshot.id,
            } as Category;
        }

        if (version.tagsSnapshot) {
            article.tags = version.tagsSnapshot.map((tag) => ({
                id: tag.id,
            })) as Tag[];
        }

        const updated = await this.articleRepository.save(article);

        await this.createNewVersion(
            updated,
            user,
            `Retour à la version ${versionNumber}`,
        );

        return this.articleService.findOne(articleId);
    }
}
