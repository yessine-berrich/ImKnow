import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationVersion } from './entities/publication-version.entity';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { User } from '../users/entities/user.entity';
import { MediaService } from '../media/media.service';
import { Media } from '../media/entities/media.entity';
import { SearchService } from '../search/search.service';
import { PublicationInteractionService } from './publication-interaction.service';
import { PublicationVersioningService } from './publication-versioning.service';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { NotificationService } from '../notification/notification.service';
import { PublicationStatus, NotificationType } from 'utils/constants';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { PublicationReport } from './entities/publication-report.entity';
import { ReportPublicationDto } from './dto/report-publication.dto';
import { PublicationChunkService } from './publication-chunk.service';

@Injectable()
export class PublicationService {
  constructor(
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PublicationReport)
    private readonly publicationReportRepository: Repository<PublicationReport>,
    private readonly mediaService: MediaService,
    private readonly searchService: SearchService,
    private readonly publicationInteractionService: PublicationInteractionService,
    private readonly moderationService: ContentModerationService,
    private readonly notificationService: NotificationService,
    private readonly publicationVersioningService: PublicationVersioningService,
    private readonly publicationChunkService: PublicationChunkService,
  ) { }

  async create(
    createPublicationDto: CreatePublicationDto,
    user: User,
  ): Promise<Publication> {
    const {
      tagIds,
      categoryId,
      media: mediaDtos,
      ...publicationData
    } = createPublicationDto;

    if (publicationData.content) {
      publicationData.content = this.stripMediaFromContent(publicationData.content);
    }

    let initialStatus = PublicationStatus.DRAFT;

    if (
      createPublicationDto.status &&
      Object.values(PublicationStatus).includes(createPublicationDto.status)
    ) {
      initialStatus = createPublicationDto.status;
    }

    const publication = this.publicationRepository.create({
      ...publicationData,
      author: user,
      category: { id: categoryId },
      tags: tagIds?.map((id) => ({ id })) || [],
      status: initialStatus,
    });

    let savedPublication = await this.publicationRepository.save(publication);

    if (mediaDtos?.length) {
      const mediaPromises = mediaDtos.map((dto) =>
        this.mediaService.create({
          ...dto,
          publicationId: savedPublication.id,
          type: this.mediaService.getMediaTypeFromMimeType(dto.mimetype),
        }),
      );
      savedPublication.media = await Promise.all(mediaPromises);
    }

    // ── Brouillon : pas de modération, pas de détection de doublon ──────────
    if (savedPublication.status === PublicationStatus.DRAFT) {
      await this.publicationVersioningService.createNewVersion(
        savedPublication,
        user,
        'Initial draft creation',
      );
      this.generateAndSaveEmbedding(savedPublication.id).catch(console.error);
      this.publicationChunkService.generateChunks(savedPublication.id).catch(console.error);
      return this.findOne(savedPublication.id);
    }

    // Détection de duplicata
    try {
      const duplicateCheck = await this.checkDuplicate(
        { title: savedPublication.title, content: savedPublication.content },
        user.id,
      );

      if (duplicateCheck.hasDuplicates) {
        savedPublication.duplicateScore =
          duplicateCheck.similarPublications[0]?.similarity ?? null;
        savedPublication.similarPublicationsCache = duplicateCheck.similarPublications.map(
          (a) => ({
            id: a.id,
            title: a.title,
            score: a.similarity,
            createdAt: new Date(),
          }),
        );
        savedPublication.status = PublicationStatus.REJECTED;
        savedPublication.rejectionReason = `Publication similaire détecté (similarité : ${((duplicateCheck.similarPublications[0]?.similarity ?? 0) * 100).toFixed(0)}%) — doublon possible avec "${duplicateCheck.similarPublications[0]?.title}"`;

        savedPublication = await this.publicationRepository.save(savedPublication);

        await this.notificationService.createAndNotify(
          NotificationType.PUBLICATION_REJECTED,
          user.id,
          null,
          `Votre publication "${savedPublication.title}" a été rejeté : ${savedPublication.rejectionReason}`,
          {
            publicationId: savedPublication.id,
            duplicateScore: savedPublication.duplicateScore,
            similarPublications: savedPublication.similarPublicationsCache,
          },
        );

        return this.findOne(savedPublication.id);
      }
    } catch (err) {
      console.warn('[DUPLICATE] Échec détection duplicata :', err.message);
    }

    // Auto-modération IA
    const hasContent =
      !!savedPublication.title?.trim() && !!savedPublication.content?.trim();

    if (hasContent) {
      try {
        const moderation = await this.moderationService.moderate(
          savedPublication.title,
          savedPublication.content,
        );

        savedPublication.moderationResult = moderation;
        savedPublication.isAutoModerated = true;
        savedPublication.moderationScore = parseFloat(String(moderation.score));

        let newStatus = savedPublication.status;
        let notificationMessage = '';
        let notificationType: NotificationType = NotificationType.SYSTEM_INFO;

        if (moderation.score > 0.7) {
          newStatus = PublicationStatus.REJECTED;
          savedPublication.rejectionReason = moderation.reason || 'Content flagged as inappropriate';
          notificationMessage = `Your publication "${savedPublication.title}" has been rejected: ${savedPublication.rejectionReason}`;
          notificationType = NotificationType.PUBLICATION_REJECTED;
        } else if (moderation.isFlagged || moderation.score > 0.35) {
          newStatus = PublicationStatus.PENDING;
          notificationMessage = `Your publication "${savedPublication.title}" is pending review (potential risk detected)`;
          notificationType = NotificationType.PUBLICATION_PENDING_MODERATION;
        } else {
          newStatus = PublicationStatus.PUBLISHED;
          notificationMessage = `Your publication "${savedPublication.title}" has been published`;
          notificationType = NotificationType.PUBLICATION_PUBLISHED;
        }

        savedPublication.status = newStatus;
        savedPublication = await this.publicationRepository.save(savedPublication);

        await this.notificationService.createAndNotify(
          notificationType,
          user.id,
          null,
          notificationMessage,
          {
            publicationId: savedPublication.id,
            moderationScore: moderation.score,
            moderationCategories: moderation.categories,
          },
        );

        if (newStatus === PublicationStatus.REJECTED) {
          return this.findOne(savedPublication.id);
        }
      } catch (err: any) {
        console.error('Content moderation failed:', err);

        if (err?.status === 429 || err?.message?.includes('429')) {
          savedPublication.status = PublicationStatus.PENDING;
          savedPublication = await this.publicationRepository.save(savedPublication);
        }

        await this.notificationService.createAndNotify(
          NotificationType.SYSTEM_ERROR,
          user.id,
          null,
          'Content moderation failed. Your publication is pending manual review.',
          { publicationId: savedPublication.id },
        );
      }
    }

    await this.publicationVersioningService.createNewVersion(
      savedPublication,
      user,
      'Initial publication creation',
    );

    this.generateAndSaveEmbedding(savedPublication.id).catch(console.error);
    this.publicationChunkService.generateChunks(savedPublication.id).catch(console.error);

    return this.findOne(savedPublication.id);
  }

  /** Strips any media references that leaked into the content field. */
  private stripMediaFromContent(content: string): string {
    return content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(\/uploads\/.*?\)/g, '')
      .replace(/\/uploads\/\S+/g, '')
      .replace(/data:[a-z]+\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, '')
      .trim();
  }

  private async generateAndSaveEmbedding(publicationId: number): Promise<void> {
    try {
      const publication = await this.publicationRepository.findOneOrFail({
        where: { id: publicationId },
        relations: ['category', 'tags'],
      });

      const textToEmbed = `
Title: ${publication.title}
Category: ${publication.category?.name || 'Uncategorized'}
Tags: ${publication.tags?.map((t) => t.name).join(', ') || 'none'}
Content:
${publication.content}
      `.trim();

      const vector = await this.searchService.generateEmbedding(textToEmbed);

      if (!vector || !Array.isArray(vector) || vector.length !== 768) {
        console.warn(`[EMBED] Invalid vector for publication ${publicationId}: length=${vector?.length ?? 'null'}`);
        return;
      }

      const vectorString = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

      await this.publicationRepository.query(
        `UPDATE publications SET embedding_vector_pg = $1::vector WHERE id = $2`,
        [vectorString, publicationId],
      );

      console.log(`[EMBED] Vector saved (dim 768) for publication ${publicationId}`);
    } catch (err: any) {
      console.error(`[EMBED] Failed to generate/save for publication ${publicationId}:`, err.message);
    }
  }

  async semanticSearch(
    query: string,
    limit = 10,
    minSimilarity = 0.72,
    status: PublicationStatus = PublicationStatus.PUBLISHED,
  ): Promise<
    {
      id: number;
      title: string;
      content_preview: string;
      similarity: number;
    }[]
  > {
    if (!query?.trim()) {
      return [];
    }

    const queryVector = await this.searchService.generateEmbedding(query.trim());

    if (!queryVector || !Array.isArray(queryVector) || queryVector.length !== 768) {
      console.warn('[SEARCH] Invalid query vector', { length: queryVector?.length ?? 'null' });
      return [];
    }

    const vectorString = '[' + queryVector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

    try {
      const results = await this.publicationRepository.query(
        `
        SELECT 
          id,
          title,
          LEFT(content, 300) AS content_preview,
          ROUND(CAST((1 - (embedding_vector_pg <=> $1::vector)) AS numeric), 4) AS similarity
        FROM publications
        WHERE embedding_vector_pg IS NOT NULL
          AND status = $2
          AND (embedding_vector_pg <=> $1::vector) <= (1 - $3::numeric)
        ORDER BY similarity DESC
        LIMIT $4
        `,
        [vectorString, status, minSimilarity, limit],
      );

      return results;
    } catch (err: any) {
      console.error('[SEARCH] pgvector error:', err.message);
      throw new InternalServerErrorException({
        message: 'Semantic search error',
        debug: err.message,
      });
    }
  }

  async findAll(): Promise<Publication[]> {
    return this.publicationRepository.find({
      relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Publication> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
      relations: [
        'author', 'category', 'tags', 'media',
        'comments', 'comments.author',
        'versions', 'likes', 'bookmarks',
      ],
    });

    if (!publication) {
      throw new NotFoundException(`Publication #${id} not found`);
    }

    return publication;
  }

  async getPublicationMedia(publicationId: number): Promise<Media[]> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['media'],
    });

    if (!publication) {
      throw new NotFoundException(`Publication #${publicationId} not found`);
    }

    return publication.media || [];
  }

  async update(
    id: number,
    updatePublicationDto: UpdatePublicationDto,
    user: User,
  ): Promise<Publication> {
    let publication = await this.publicationRepository.findOneOrFail({
      where: { id },
      relations: ['category', 'tags', 'versions', 'media'],
    });

    const { media: mediaDtos, ...publicationData } = updatePublicationDto;

    const hasSignificantChange =
      !!publicationData.title ||
      !!publicationData.content ||
      !!publicationData.status ||
      !!publicationData.categoryId ||
      !!publicationData.tagIds;

    if (publicationData.title) publication.title = publicationData.title;
    if (publicationData.content) publication.content = publicationData.content;
    if (publicationData.status && Object.values(PublicationStatus).includes(publicationData.status)) {
      publication.status = publicationData.status;
    }
    if (publicationData.categoryId) {
      publication.category = { id: publicationData.categoryId } as unknown as Category;
    }
    if (publicationData.tagIds) {
      publication.tags = publicationData.tagIds.map((tagId) => ({ id: tagId })) as unknown as Tag[];
    }

    publication = await this.publicationRepository.save(publication);

    if (mediaDtos?.length) {
      const mediaPromises = mediaDtos.map((dto) =>
        this.mediaService.create({
          ...dto,
          publicationId: publication.id,
        }),
      );
      publication.media = [...(publication.media || []), ...(await Promise.all(mediaPromises))];
    }

    // ── Brouillon : pas de modération, pas de détection de doublon ──────────
    if (publication.status === PublicationStatus.DRAFT) {
      if (hasSignificantChange) {
        await this.publicationVersioningService.createNewVersion(
          publication,
          user,
          publicationData.changeSummary ?? 'Draft update',
        );
      }
      if (publicationData.title || publicationData.content || publicationData.categoryId || publicationData.tagIds) {
        this.generateAndSaveEmbedding(publication.id).catch(console.error);
        this.publicationChunkService.generateChunks(publication.id).catch(console.error);
      }
      return this.findOne(publication.id);
    }

    // Détection de duplicata
    try {
      const duplicateCheck = await this.checkDuplicate(
        { title: publication.title, content: publication.content },
        user.id,
        publication.id,
      );

      if (duplicateCheck.hasDuplicates) {
        publication.duplicateScore =
          duplicateCheck.similarPublications[0]?.similarity ?? null;
        publication.similarPublicationsCache = duplicateCheck.similarPublications.map(
          (a) => ({
            id: a.id,
            title: a.title,
            score: a.similarity,
            createdAt: new Date(),
          }),
        );
        publication.status = PublicationStatus.REJECTED;
        publication.rejectionReason = `Publication similaire détecté (similarité : ${((duplicateCheck.similarPublications[0]?.similarity ?? 0) * 100).toFixed(0)}%) — doublon possible avec "${duplicateCheck.similarPublications[0]?.title}"`;

        publication = await this.publicationRepository.save(publication);

        await this.notificationService.createAndNotify(
          NotificationType.PUBLICATION_REJECTED,
          user.id,
          null,
          `Votre publication "${publication.title}" a été rejeté : ${publication.rejectionReason}`,
          {
            publicationId: publication.id,
            duplicateScore: publication.duplicateScore,
            similarPublications: publication.similarPublicationsCache,
          },
        );

        return this.findOne(publication.id);
      }
    } catch (err: any) {
      console.warn('[DUPLICATE] Échec détection duplicata :', err.message);
    }

    // Auto-moderation IA
    const hasContent = !!publication.title?.trim() && !!publication.content?.trim();

    if (hasContent) {
      try {
        const moderation = await this.moderationService.moderate(
          publication.title,
          publication.content,
        );

        publication.moderationResult = moderation;
        publication.isAutoModerated = true;
        publication.moderationScore = parseFloat(String(moderation.score));

        let newStatus = publication.status;
        let notificationMessage = '';
        let notificationType: NotificationType = NotificationType.SYSTEM_INFO;

        if (moderation.score > 0.7) {
          newStatus = PublicationStatus.REJECTED;
          publication.rejectionReason = moderation.reason || 'Content flagged as inappropriate';
          notificationMessage = `Your publication "${publication.title}" has been rejected: ${publication.rejectionReason}`;
          notificationType = NotificationType.PUBLICATION_REJECTED;
        } else if (moderation.isFlagged || moderation.score > 0.35) {
          newStatus = PublicationStatus.PENDING;
          notificationMessage = `Your publication "${publication.title}" is pending review (potential risk detected)`;
          notificationType = NotificationType.PUBLICATION_PENDING_MODERATION;
        } else {
          newStatus = PublicationStatus.PUBLISHED;
          notificationMessage = `Your publication "${publication.title}" has been published`;
          notificationType = NotificationType.PUBLICATION_PUBLISHED;
        }

        publication.status = newStatus;
        publication = await this.publicationRepository.save(publication);

        await this.notificationService.createAndNotify(
          notificationType,
          user.id,
          null,
          notificationMessage,
          {
            publicationId: publication.id,
            moderationScore: moderation.score,
            moderationCategories: moderation.categories,
          },
        );

        if (newStatus === PublicationStatus.REJECTED) {
          return this.findOne(publication.id);
        }
      } catch (err: any) {
        console.error('Content moderation failed:', err);

        if (err?.status === 429 || err?.message?.includes('429')) {
          publication.status = PublicationStatus.PENDING;
          publication = await this.publicationRepository.save(publication);
        }

        await this.notificationService.createAndNotify(
          NotificationType.SYSTEM_ERROR,
          user.id,
          null,
          'Content moderation failed. Your publication is pending manual review.',
          { publicationId: publication.id },
        );
      }
    }

    if (hasSignificantChange) {
      await this.publicationVersioningService.createNewVersion(
        publication,
        user,
        publicationData.changeSummary ?? 'Content update',
      );
    }

    if (publicationData.title || publicationData.content || publicationData.categoryId || publicationData.tagIds) {
      this.generateAndSaveEmbedding(publication.id).catch(console.error);
      this.publicationChunkService.generateChunks(publication.id).catch(console.error);
    }

    return this.findOne(publication.id);
  }

  async remove(id: number): Promise<void> {
    const publication = await this.findOne(id);
    await this.publicationRepository.remove(publication);
  }

  async incrementView(id: number, userId?: number, ip?: string): Promise<void> {
    return this.publicationInteractionService.incrementView(id, userId, ip);
  }

  async toggleLike(publicationId: number, userId: number): Promise<Publication> {
    return this.publicationInteractionService.toggleLike(publicationId, userId);
  }

  async toggleBookmark(publicationId: number, userId: number): Promise<Publication> {
    return this.publicationInteractionService.toggleBookmark(publicationId, userId);
  }

  async getUserLikedPublications(userId: number): Promise<Publication[]> {
    return this.publicationInteractionService.getUserLikedPublications(userId);
  }

  async getUserBookmarkedPublications(userId: number): Promise<Publication[]> {
    return this.publicationInteractionService.getUserBookmarkedPublications(userId);
  }

  async createNewVersion(
    publication: Publication,
    user: User,
    changeSummary: string,
  ): Promise<PublicationVersion> {
    return this.publicationVersioningService.createNewVersion(publication, user, changeSummary);
  }

  async getHistory(publicationId: number): Promise<PublicationVersion[]> {
    return this.publicationVersioningService.getHistory(publicationId);
  }

  async revertToVersion(
    publicationId: number,
    versionNumber: number,
    user: User,
  ): Promise<Publication> {
    return this.publicationVersioningService.revertToVersion(publicationId, versionNumber, user);
  }

  async getPublicationsByUserId(userId: number): Promise<Publication[]> {
    return this.publicationRepository.find({
      where: { author: { id: userId } },
      relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all draft publications belonging to the authenticated user
   */
  async findMyDrafts(userId: number): Promise<Publication[]> {
    return this.publicationRepository.find({
      where: {
        author: { id: userId },
        status: PublicationStatus.DRAFT,
      },
      relations: ['author', 'category', 'tags', 'media'],
      order: { updatedAt: 'DESC' },
    });
  }

  private readonly DUPLICATE_THRESHOLD = 0.75; // seuil de similarité
  private readonly DUPLICATE_LIMIT = 5;    // nb max de résultats

  async checkDuplicate(
    dto: CheckDuplicateDto,
    userId: number,
    excludePublicationId?: number,
  ): Promise<{
    hasDuplicates: boolean;
    similarPublications: {
      id: number;
      title: string;
      similarity: number;
      isOwn: boolean;
      url: string;
    }[];
  }> {
    const empty = { hasDuplicates: false, similarPublications: [] };

    // ── 1. Validation des entrées ──────────────────────────────────────────────
    const title = dto.title?.trim();
    const content = dto.content?.trim();

    if (!title || !content) {
      console.warn('[DUPLICATE] Titre ou contenu manquant, détection ignorée');
      return empty;
    }

    // ── 2. Génération de l'embedding ───────────────────────────────────────────
    const textToEmbed = `Title: ${title}\n\nContent:\n${content}`;
    let vector: number[] | null;

    try {
      vector = await this.searchService.generateEmbedding(textToEmbed);
    } catch (err: any) {
      console.warn('[DUPLICATE] Échec génération embedding :', err.message);
      return empty;
    }

    if (!Array.isArray(vector) || vector.length !== 768) {
      console.warn('[DUPLICATE] Vecteur invalide (longueur :', vector?.length ?? 'null', ')');
      return empty;
    }

    const vectorString = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

    // ── 3. Construction de la requête avec paramètres positionnels stables ─────
    // $1 = vecteur, $2 = seuil, $3 = limit  [, $4 = excludePublicationId]
    const params: any[] = [vectorString, this.DUPLICATE_THRESHOLD, this.DUPLICATE_LIMIT];

    const excludeClause = excludePublicationId
      ? `AND a.id != $${params.push(excludePublicationId)}`  // $4 ajouté dynamiquement
      : '';

    const sql = `
    SELECT
      a.id,
      a.title,
      a."authorId",
      ROUND(
        CAST((1 - (a.embedding_vector_pg <=> $1::vector)) AS numeric),
        4
      ) AS similarity
    FROM publications a
    WHERE a.embedding_vector_pg IS NOT NULL
      AND a.status NOT IN ('rejected', 'draft')
      ${excludeClause}
      AND (1 - (a.embedding_vector_pg <=> $1::vector)) >= $2
    ORDER BY similarity DESC
    LIMIT $3
  `;

    // ── 4. Exécution ───────────────────────────────────────────────────────────
    let results: { id: number; title: string; authorId: number; similarity: string }[];

    try {
      results = await this.publicationRepository.query(sql, params);
    } catch (err: any) {
      console.error('[DUPLICATE] Erreur pgvector :', err.message);
      return empty;
    }

    // ── 5. Formatage ───────────────────────────────────────────────────────────
    const similarPublications = results.map((r) => ({
      id: r.id,
      title: r.title,
      similarity: Number(r.similarity),
      isOwn: r.authorId === userId,
      url: `/publications/${r.id}`,
    }));

    console.log(
      `[DUPLICATE] ${similarPublications.length} doublon(s) trouvé(s) pour "${title}"`,
      similarPublications.map((a) => `#${a.id} (${(a.similarity * 100).toFixed(1)}%)`),
    );

    return {
      hasDuplicates: similarPublications.length > 0,
      similarPublications,
    };
  }

  /**
 * Approuve manuellement un publication rejeté par la modération IA.
 * Réinitialise moderationScore, moderationResult, rejectionReason
 * et passe le statut à PUBLISHED.
 */
  async approveRejectedPublication(publicationId: number, adminId: number): Promise<Publication> {
    const publication = await this.publicationRepository.findOne({
      where: { id: publicationId },
      relations: ['author'],
    });

    if (!publication) {
      throw new NotFoundException(`Publication #${publicationId} introuvable`);
    }

    if (publication.status !== PublicationStatus.REJECTED) {
      throw new ForbiddenException(
        `L'publication #${publicationId} n'est pas dans un état rejeté (statut actuel : ${publication.status})`,
      );
    }

    // Réinitialiser les champs de modération et publier
    publication.status = PublicationStatus.PUBLISHED;
    publication.rejectionReason = undefined;  // raison rejet IA
    publication.moderationScore = undefined;  // score IA
    publication.moderationResult = undefined;  // rapport IA complet
    publication.isAutoModerated = false;
    publication.duplicateScore = undefined;  // score doublon
    publication.similarPublicationsCache = undefined;  // liste des publications similaires

    const saved = await this.publicationRepository.save(publication);

    this.generateAndSaveEmbedding(saved.id).catch(console.error);
    this.publicationChunkService.generateChunks(saved.id).catch(console.error);

    await this.publicationVersioningService.createNewVersion(
      saved,                        // publication sauvegardé (pas l'ancien objet)
      { id: adminId } as User,      // admin identifié par son id
      'Approuvé manuellement par un administrateur',
    );

    // Notifier l'auteur
    if (publication.author?.id) {
      await this.notificationService.createAndNotify(
        NotificationType.PUBLICATION_PUBLISHED,
        publication.author.id,
        null,
        `Votre publication "${publication.title}" a été approuvé manuellement par un administrateur et est maintenant publié.`,
        { publicationId: saved.id },
      );
    }

    return this.findOne(saved.id);
  }

  async getPublicationsRejectedByModeration(): Promise<Publication[]> {
    return this.publicationRepository
      .createQueryBuilder('publication')
      .leftJoinAndSelect('publication.author', 'author')
      .leftJoinAndSelect('publication.category', 'category')
      .leftJoinAndSelect('publication.tags', 'tags')
      .where('publication.status = :status', { status: PublicationStatus.REJECTED })
      .andWhere('publication.isAutoModerated = :isAutoModerated', { isAutoModerated: true })
      .andWhere('publication.moderationScore > :threshold', { threshold: 0.7 })
      .orderBy('publication.updatedAt', 'DESC')
      .getMany();
  }

  async getPublicationsRejectedByDuplicate(): Promise<Publication[]> {
    return this.publicationRepository
      .createQueryBuilder('publication')
      .leftJoinAndSelect('publication.author', 'author')
      .leftJoinAndSelect('publication.category', 'category')
      .leftJoinAndSelect('publication.tags', 'tags')
      .where('publication.status = :status', { status: PublicationStatus.REJECTED })
      .andWhere('publication.duplicateScore IS NOT NULL')
      .orderBy('publication.updatedAt', 'DESC')
      .getMany();
  }

  // ─────────────────────────────────────────────────────────────
  // Signalement d'publication
  // ─────────────────────────────────────────────────────────────

  async reportPublication(
    reporterId: number,
    publicationId: number,
    dto: ReportPublicationDto,
  ): Promise<{ message: string; reportId: number }> {
    const [reporter, publication] = await Promise.all([
      this.userRepository.findOne({ where: { id: reporterId } }),
      this.publicationRepository.findOne({
        where: { id: publicationId },
        relations: ['author'],
      }),
    ]);

    if (!reporter) throw new NotFoundException('Utilisateur introuvable');
    if (!publication) throw new NotFoundException('Publication introuvable');

    if (publication.author?.id === reporterId) {
      throw new BadRequestException('Vous ne pouvez pas signaler votre propre publication');
    }

    const existing = await this.publicationReportRepository.findOne({
      where: {
        reporter: { id: reporterId },
        publication: { id: publicationId },
        status: 'pending',
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà signalé cet publication. Le signalement est en cours de traitement.',
      );
    }

    const report = this.publicationReportRepository.create({
      reporter,
      publication,
      reason: dto.reason,
      details: dto.details?.trim() || null,
      status: 'pending',
    });

    const saved = await this.publicationReportRepository.save(report);

    return {
      message: 'Signalement envoyé. Merci de nous aider à maintenir la qualité de la plateforme.',
      reportId: saved.id,
    };
  }
}