import { Publication } from 'src/publication/entities/publication.entity';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { PublicationStatus } from 'utils/constants';
import { PublicationVersion } from './entities/publication-version.entity';
import { PublicationService } from './publication.service';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';

@Injectable()
export class PublicationVersioningService {
    constructor(
        @InjectRepository(Publication)
        private readonly publicationRepository: Repository<Publication>,
        @InjectRepository(PublicationVersion)
        private readonly versionRepository: Repository<PublicationVersion>,
        @Inject(forwardRef(() => PublicationService))
        private readonly publicationService: PublicationService,
    ) { }

    async createNewVersion(
        publication: Publication,
        user: User,
        changeSummary: string,
    ): Promise<PublicationVersion> {
        const publicationWithRelations = await this.publicationRepository.findOneOrFail({
            where: { id: publication.id },
            relations: ['category', 'tags'],
        });

        const lastVersion = await this.versionRepository.findOne({
            where: { publicationId: publication.id },
            order: { versionNumber: 'DESC' },
        });

        const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = this.versionRepository.create({
            publication: publicationWithRelations,
            publicationId: publication.id,
            versionNumber: nextVersionNumber,
            title: publicationWithRelations.title,
            content: publicationWithRelations.content,
            author: user,
            authorId: user.id,
            status: publicationWithRelations.status,
            changeSummary,
            categorySnapshot: publicationWithRelations.category
                ? {
                    id: publicationWithRelations.category.id,
                    name: publicationWithRelations.category.name,
                }
                : undefined,
            tagsSnapshot: publicationWithRelations.tags?.map((tag) => ({
                id: tag.id,
                name: tag.name,
            })) ?? [],
        });

        const savedVersion = await this.versionRepository.save(version);

        await this.publicationRepository.update(publication.id, {
            currentVersionNumber: nextVersionNumber,
        });

        return savedVersion;
    }

    async getHistory(publicationId: number): Promise<PublicationVersion[]> {
        return this.versionRepository.find({
            where: { publicationId },
            relations: ['author'],
            order: { versionNumber: 'DESC' },
        });
    }

    async revertToVersion(
        publicationId: number,
        versionNumber: number,
        user: User,
    ): Promise<Publication> {
        const version = await this.versionRepository.findOneOrFail({
            where: { publicationId, versionNumber },
        });

        const publication = await this.publicationRepository.findOneOrFail({
            where: { id: publicationId },
            relations: ['category', 'tags'],
        });

        publication.title = version.title;
        publication.content = version.content;
        publication.status = version.status as PublicationStatus;

        if (version.categorySnapshot?.id) {
            publication.category = {
                id: version.categorySnapshot.id,
            } as Category;
        }

        if (version.tagsSnapshot) {
            publication.tags = version.tagsSnapshot.map((tag) => ({
                id: tag.id,
            })) as Tag[];
        }

        const updated = await this.publicationRepository.save(publication);

        await this.createNewVersion(
            updated,
            user,
            `Retour à la version ${versionNumber}`,
        );

        return this.publicationService.findOne(publicationId);
    }
}
