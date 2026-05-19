import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'utils/constants';
import { Publication } from 'src/publication/entities/publication.entity';
import { User } from 'src/users/entities/user.entity';
import { PublicationService } from 'src/publication/publication.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly publicationService: PublicationService,
  ) {}

  async create(
    createCommentDto: {
      publicationId: number;
      content: string;
      parentId?: number;
      mentionedUserIds?: number[];
    },
    userId: number,
  ): Promise<Comment> {
    // Récupérer l'publication (pour connaître son auteur)
    const publication = await this.publicationService.findOne(
      createCommentDto.publicationId,
    );

    if (!publication) {
      throw new NotFoundException('Publication non trouvé');
    }

    // Récupérer l'utilisateur qui commente
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Créer le commentaire avec les IDs
    const comment = this.commentRepository.create({
      content: createCommentDto.content,
      publication: { id: createCommentDto.publicationId } as any, // Référence à l'publication par ID
      author: user,
    });

    // Gérer la réponse à un commentaire parent
    if (createCommentDto.parentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: createCommentDto.parentId },
        relations: ['publication'],
      });

      if (!parentComment) {
        throw new NotFoundException('Commentaire parent non trouvé');
      }

      // Vérifier que le parent appartient au même publication
      if (parentComment.publication.id !== createCommentDto.publicationId) {
        throw new ForbiddenException(
          'Le commentaire parent ne correspond pas au même publication',
        );
      }

      comment.parent = parentComment;
    }

    // Gérer les mentions
    if (
      createCommentDto.mentionedUserIds &&
      createCommentDto.mentionedUserIds.length > 0
    ) {
      const mentionedUsers = await this.userRepository.findByIds(
        createCommentDto.mentionedUserIds,
      );
      comment.mentionedUsers = mentionedUsers;
    }

    const savedComment = await this.commentRepository.save(comment);

    if (comment.parent) {
      const parentAuthor = comment.parent.author;
      if (parentAuthor.id !== userId) {
        // ne pas notifier soi-même
        await this.notificationService.createAndNotify(
          NotificationType.REPLY,
          parentAuthor.id, // destinataire = auteur du parent
          user, // expéditeur = celui qui répond
          `${user.firstName} a répondu à votre commentaire`,
          {
            commentId: savedComment.id,
            publicationId: createCommentDto.publicationId,
            parentCommentId: comment.parent.id,
          },
        );
      }
    }

    if (!comment.parent) {
      const publicationAuthor = publication.author;
      if (publicationAuthor.id !== userId) {
        // ne pas notifier soi-même
        await this.notificationService.createAndNotify(
          NotificationType.NEW_COMMENT,
          publicationAuthor.id,
          user,
          `${user.firstName} a commenté votre publication`,
          {
            commentId: savedComment.id,
            publicationId: createCommentDto.publicationId,
          },
        );
      }
    }

    // Cas 2 : Mentions → notifier chaque personne mentionnée
    if (comment.mentionedUsers?.length) {
      for (const mentioned of comment.mentionedUsers) {
        if (mentioned.id !== userId) {
          await this.notificationService.createAndNotify(
            NotificationType.MENTION,
            mentioned.id,
            user,
            `${user.firstName} vous a mentionné dans un commentaire`,
            {
              commentId: savedComment.id,
              publicationId: createCommentDto.publicationId,
            },
          );
        }
      }
    }

    // Retourner avec les relations nécessaires
    return await this.commentRepository.findOneOrFail({
      where: { id: savedComment.id },
      relations: [
        'author',
        'publication',
        'parent',
        'mentionedUsers',
        'replies',
        'likes',
      ],
    });
  }

  async findByPublication(
    publicationId: number,
    currentUserId?: number,
  ): Promise<any[]> {
    const comments = await this.commentRepository.find({
      where: {
        publication: { id: publicationId },
        parent: IsNull(), // ✅ CORRECTION: utiliser { id: null } au lieu de null
      },
      relations: [
        'author',
        'replies',
        'replies.author',
        'likes',
        'replies.likes',
      ],
      order: {
        createdAt: 'DESC',
        replies: {
          createdAt: 'ASC',
        },
      },
    });

    // Transformer les données pour le frontend
    return comments.map((comment) =>
      this.transformComment(comment, currentUserId),
    );
  }

  private transformComment(comment: Comment, currentUserId?: number): any {
    return {
      id: comment.id,
      content: comment.content,
      likes: comment.likes?.length || 0,
      isEdited: comment.isEdited || false,
      isLiked: currentUserId
        ? comment.likes?.some((like) => like.id === currentUserId)
        : false,
      author: {
        id: comment.author?.id || 0,
        firstName: comment.author?.firstName || 'Utilisateur',
        lastName: comment.author?.lastName || 'Inconnu',
        profileImage: comment.author?.profileImage || null,
      },
      parentId: comment.parent?.id || null,
      createdAt: comment.createdAt,
      replies:
        comment.replies?.map((reply) =>
          this.transformComment(reply, currentUserId),
        ) || [],
    };
  }

  async toggleLike(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['likes', 'author', 'publication'],
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const alreadyLiked = comment.likes.some((like) => like.id === user.id);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((like) => like.id !== user.id);
    } else {
      comment.likes = [...comment.likes, user];
      if (comment.author.id !== userId) {
        await this.notificationService.createAndNotify(
          NotificationType.COMMENT_LIKED,
          comment.author.id,
          user,
          `${user.firstName} a aimé votre commentaire`,
          {
            commentId: comment.id,
            publicationId: comment.publication?.id,
          },
        );
      }
    }

    await this.commentRepository.save(comment);

    return {
      id: comment.id,
      likes: comment.likes.length,
      isLiked: !alreadyLiked, // Inverse le statut
    };
  }

  async update(
    commentId: number,
    content: string,
    userId: number,
  ): Promise<Comment> {
    // Récupérer l'utilisateur
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé');
    }

    if (comment.author.id !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier ce commentaire',
      );
    }

    comment.content = content;
    comment.isEdited = true;
    comment.updatedAt = new Date();

    const savedComment = await this.commentRepository.save(comment);

    return await this.commentRepository.findOneOrFail({
      where: { id: savedComment.id },
      relations: ['author', 'mentionedUsers', 'likes', 'replies'],
    });
  }

  async remove(commentId: number, userId: number): Promise<void> {
    // Récupérer l'utilisateur
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'replies'],
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé');
    }

    // Vérifier les permissions (auteur ou admin)
    const isAuthor = comment.author.id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer ce commentaire',
      );
    }

    // Si le commentaire a des réponses, marquer comme supprimé
    if (comment.replies && comment.replies.length > 0) {
      comment.content = '[Commentaire supprimé]';
      comment.deletedAt = new Date();
      await this.commentRepository.save(comment);
    } else {
      // Sinon, supprimer définitivement
      await this.commentRepository.remove(comment);
    }
  }

  async getCommentStats(
    publicationId: number,
  ): Promise<{ total: number; withReplies: number }> {
    const comments = await this.commentRepository.find({
      where: { publication: { id: publicationId } as any },
    });

    const withReplies = comments.filter(
      (comment) => comment.replies && comment.replies.length > 0,
    ).length;

    return {
      total: comments.length,
      withReplies,
    };
  }

  /**
   * Récupérer tous les commentaires d'un utilisateur
   */
  async findByUser(userId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { author: { id: userId } },
      relations: [
        'publication',
        'publication.author',
        'publication.category',
        'publication.tags',
        'publication.likes',
        'publication.bookmarks',
        'publication.comments',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer les publications commentés par l'utilisateur (uniques)
   */
  async findCommentedPublicationsByUser(userId: number) {
    // Récupérer tous les commentaires de l'utilisateur avec les publications
    const comments = await this.commentRepository.find({
      where: { author: { id: userId } },
      relations: [
        'publication',
        'publication.author',
        'publication.category',
        'publication.tags',
        'publication.likes',
        'publication.bookmarks',
        'publication.comments',
      ],
      order: { createdAt: 'DESC' },
    });

    // Grouper par publication et ajouter des métadonnées
    const publicationMap = new Map();

    comments.forEach((comment) => {
      if (comment.publication && !publicationMap.has(comment.publication.id)) {
        const publication = comment.publication;

        // Compter le nombre de commentaires de l'utilisateur sur cet publication
        const userCommentsCount = comments.filter(
          (c) => c.publication?.id === publication.id,
        ).length;

        // Dernier commentaire de l'utilisateur sur cet publication
        const lastUserComment = comments
          .filter((c) => c.publication?.id === publication.id)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];

        publicationMap.set(publication.id, {
          ...publication,
          userCommentsCount,
          lastCommentDate: lastUserComment?.createdAt,
          isLiked: publication.likes?.some((like) => like.id === userId) || false,
          isBookmarked:
            publication.bookmarks?.some((bookmark) => bookmark.id === userId) ||
            false,
          commentsCount: publication.comments?.length || 0,
          likesCount: publication.likes?.length || 0,
          bookmarksCount: publication.bookmarks?.length || 0,
        });
      }
    });

    const publications = Array.from(publicationMap.values());

    return {
      success: true,
      count: publications.length,
      publications,
    };
  }
}
