// src/publication/services/publication-interaction.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Publication } from './entities/publication.entity';
import { NotificationType } from 'utils/constants';
import { NotificationService } from 'src/notification/notification.service';
import { PublicationView } from './entities/publication-view.entity';

@Injectable()
export class PublicationInteractionService {
  constructor(
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PublicationView)
    private readonly viewRepository: Repository<PublicationView>,

    private readonly notificationService: NotificationService,
  ) { }

  async toggleLike(publicationId: number, userId: number): Promise<Publication> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['likes', 'author', 'category'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const alreadyLiked = publication.likes.some((like) => like.id === user.id);

    if (alreadyLiked) {
      publication.likes = publication.likes.filter((like) => like.id !== user.id);
    } else {
      publication.likes = [...publication.likes, user];

      if (publication.author.id !== userId) {
        await this.notificationService.createAndNotify(
          NotificationType.PUBLICATION_LIKED,
          publication.author.id,
          user,
          `${user.firstName} a aimé votre publication "${publication.title}"`,
          {
            publicationId: publication.id,
          },
        );
      }
    }

    const savedPublication = await this.publicationRepository.save(publication);

    return await this.publicationRepository.findOneOrFail({
      where: { id: savedPublication.id },
      relations: ['likes', 'bookmarks', 'author', 'category', 'tags'],
    });
  }

  async toggleBookmark(publicationId: number, userId: number): Promise<Publication> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['bookmarks', 'author', 'category'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const alreadyBookmarked = publication.bookmarks.some(
      (bookmark) => bookmark.id === user.id,
    );

    if (alreadyBookmarked) {
      publication.bookmarks = publication.bookmarks.filter(
        (bookmark) => bookmark.id !== user.id,
      );
    } else {
      publication.bookmarks = [...publication.bookmarks, user];

      if (publication.author.id !== userId) {
        await this.notificationService.createAndNotify(
          NotificationType.PUBLICATION_BOOKMARKED,
          publication.author.id, // destinataire = auteur
          user, // expéditeur
          `${user.firstName} a mis votre publication "${publication.title}" en favori`,
          {
            publicationId: publication.id,
          },
        );
      }
    }

    const savedPublication = await this.publicationRepository.save(publication);

    return await this.publicationRepository.findOneOrFail({
      where: { id: savedPublication.id },
      relations: ['likes', 'bookmarks', 'author', 'category', 'tags'],
    });
  }

  async getPublicationLikesCount(publicationId: number): Promise<number> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['likes'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    return publication.likes.length;
  }

  async getPublicationBookmarksCount(publicationId: number): Promise<number> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['bookmarks'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    return publication.bookmarks.length;
  }

  async isPublicationLikedByUser(
    publicationId: number,
    userId: number,
  ): Promise<boolean> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['likes'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    return publication.likes.some((like) => like.id === userId);
  }

  async isPublicationBookmarkedByUser(
    publicationId: number,
    userId: number,
  ): Promise<boolean> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['bookmarks'],
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    return publication.bookmarks.some((bookmark) => bookmark.id === userId);
  }

  async getUserLikedPublications(userId: number): Promise<Publication[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'likedPublications',
        'likedPublications.author',
        'likedPublications.category',
        'likedPublications.likes',
        'likedPublications.bookmarks',
        'likedPublications.tags',
        'likedPublications.comments',
      ],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user.likedPublications;
  }

  async getUserBookmarkedPublications(userId: number): Promise<Publication[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'bookmarkedPublications',
        'bookmarkedPublications.author',
        'bookmarkedPublications.category',
        'bookmarkedPublications.likes',
        'bookmarkedPublications.bookmarks',
        'bookmarkedPublications.tags',
        'bookmarkedPublications.comments',
      ],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user.bookmarkedPublications;
  }

  async incrementView(
    publicationId: number,
    userId?: number,
    ip?: string,
  ): Promise<void> {
    if (!userId && !ip) return;

    const existing = await this.viewRepository.findOne({
      where: {
        publication: { id: publicationId },
        ...(userId ? { user: { id: userId } } : { ipAddress: ip }),
      },
    });

    if (!existing) {
      const view = this.viewRepository.create({
        publication: { id: publicationId },
        user: userId ? { id: userId } : undefined,
        ipAddress: ip,
      });

      await this.viewRepository.save(view);

      await this.publicationRepository.increment(
        { id: publicationId },
        'viewsCount',
        1,
      );
    }
  }
}
