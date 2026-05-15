import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticleVersion } from './entities/article-version.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { User } from '../users/entities/user.entity';
import { MediaService } from '../media/media.service';
import { Media } from '../media/entities/media.entity';
import { SearchService } from '../search/search.service';
import { ArticleInteractionService } from './article-interaction.service';
import { ArticleVersioningService } from './article-versioning.service';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { NotificationService } from '../notification/notification.service';
import { ArticleStatus, NotificationType } from 'utils/constants';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { ArticleReport } from './entities/article-report.entity';
import { ReportArticleDto } from './dto/report-article.dto';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ArticleReport)
    private readonly articleReportRepository: Repository<ArticleReport>,
    private readonly mediaService: MediaService,
    private readonly searchService: SearchService,
    private readonly articleInteractionService: ArticleInteractionService,
    private readonly moderationService: ContentModerationService,
    private readonly notificationService: NotificationService,
    private readonly articleVersioningService: ArticleVersioningService,
  ) { }

  async create(
    createArticleDto: CreateArticleDto,
    user: User,
  ): Promise<Article> {
    const {
      tagIds,
      categoryId,
      media: mediaDtos,
      ...articleData
    } = createArticleDto;

    if (articleData.content) {
      articleData.content = this.stripMediaFromContent(articleData.content);
    }

    let initialStatus = ArticleStatus.DRAFT;

    if (
      createArticleDto.status &&
      Object.values(ArticleStatus).includes(createArticleDto.status)
    ) {
      initialStatus = createArticleDto.status;
    }

    const article = this.articleRepository.create({
      ...articleData,
      author: user,
      category: { id: categoryId },
      tags: tagIds?.map((id) => ({ id })) || [],
      status: initialStatus,
    });

    let savedArticle = await this.articleRepository.save(article);

    if (mediaDtos?.length) {
      const mediaPromises = mediaDtos.map((dto) =>
        this.mediaService.create({
          ...dto,
          articleId: savedArticle.id,
          type: this.mediaService.getMediaTypeFromMimeType(dto.mimetype),
        }),
      );
      savedArticle.media = await Promise.all(mediaPromises);
    }

    // ── Brouillon : pas de modération, pas de détection de doublon ──────────
    if (savedArticle.status === ArticleStatus.DRAFT) {
      await this.articleVersioningService.createNewVersion(
        savedArticle,
        user,
        'Initial draft creation',
      );
      this.generateAndSaveEmbedding(savedArticle.id).catch(console.error);
      return this.findOne(savedArticle.id);
    }

    // Détection de duplicata
    try {
      const duplicateCheck = await this.checkDuplicate(
        { title: savedArticle.title, content: savedArticle.content },
        user.id,
      );

      if (duplicateCheck.hasDuplicates) {
        savedArticle.duplicateScore =
          duplicateCheck.similarArticles[0]?.similarity ?? null;
        savedArticle.similarArticlesCache = duplicateCheck.similarArticles.map(
          (a) => ({
            id: a.id,
            title: a.title,
            score: a.similarity,
            createdAt: new Date(),
          }),
        );
        savedArticle.status = ArticleStatus.REJECTED;
        savedArticle.rejectionReason = `Article similaire détecté (similarité : ${((duplicateCheck.similarArticles[0]?.similarity ?? 0) * 100).toFixed(0)}%) — doublon possible avec "${duplicateCheck.similarArticles[0]?.title}"`;

        savedArticle = await this.articleRepository.save(savedArticle);

        await this.notificationService.createAndNotify(
          NotificationType.ARTICLE_REJECTED,
          user.id,
          null,
          `Votre article "${savedArticle.title}" a été rejeté : ${savedArticle.rejectionReason}`,
          {
            articleId: savedArticle.id,
            duplicateScore: savedArticle.duplicateScore,
            similarArticles: savedArticle.similarArticlesCache,
          },
        );

        return this.findOne(savedArticle.id);
      }
    } catch (err) {
      console.warn('[DUPLICATE] Échec détection duplicata :', err.message);
    }

    // Auto-modération IA
    const hasContent =
      !!savedArticle.title?.trim() && !!savedArticle.content?.trim();

    if (hasContent) {
      try {
        const moderation = await this.moderationService.moderate(
          savedArticle.title,
          savedArticle.content,
        );

        savedArticle.moderationResult = moderation;
        savedArticle.isAutoModerated = true;
        savedArticle.moderationScore = parseFloat(String(moderation.score));

        let newStatus = savedArticle.status;
        let notificationMessage = '';
        let notificationType: NotificationType = NotificationType.SYSTEM_INFO;

        if (moderation.score > 0.7) {
          newStatus = ArticleStatus.REJECTED;
          savedArticle.rejectionReason = moderation.reason || 'Content flagged as inappropriate';
          notificationMessage = `Your article "${savedArticle.title}" has been rejected: ${savedArticle.rejectionReason}`;
          notificationType = NotificationType.ARTICLE_REJECTED;
        } else if (moderation.isFlagged || moderation.score > 0.35) {
          newStatus = ArticleStatus.PENDING;
          notificationMessage = `Your article "${savedArticle.title}" is pending review (potential risk detected)`;
          notificationType = NotificationType.ARTICLE_PENDING_MODERATION;
        } else {
          newStatus = ArticleStatus.PUBLISHED;
          notificationMessage = `Your article "${savedArticle.title}" has been published`;
          notificationType = NotificationType.ARTICLE_PUBLISHED;
        }

        savedArticle.status = newStatus;
        savedArticle = await this.articleRepository.save(savedArticle);

        await this.notificationService.createAndNotify(
          notificationType,
          user.id,
          null,
          notificationMessage,
          {
            articleId: savedArticle.id,
            moderationScore: moderation.score,
            moderationCategories: moderation.categories,
          },
        );

        if (newStatus === ArticleStatus.REJECTED) {
          return this.findOne(savedArticle.id);
        }
      } catch (err: any) {
        console.error('Content moderation failed:', err);

        if (err?.status === 429 || err?.message?.includes('429')) {
          savedArticle.status = ArticleStatus.PENDING;
          savedArticle = await this.articleRepository.save(savedArticle);
        }

        await this.notificationService.createAndNotify(
          NotificationType.SYSTEM_ERROR,
          user.id,
          null,
          'Content moderation failed. Your article is pending manual review.',
          { articleId: savedArticle.id },
        );
      }
    }

    await this.articleVersioningService.createNewVersion(
      savedArticle,
      user,
      'Initial article creation',
    );

    this.generateAndSaveEmbedding(savedArticle.id).catch(console.error);

    return this.findOne(savedArticle.id);
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

  private async generateAndSaveEmbedding(articleId: number): Promise<void> {
    try {
      const article = await this.articleRepository.findOneOrFail({
        where: { id: articleId },
        relations: ['category', 'tags'],
      });

      const textToEmbed = `
Title: ${article.title}
Category: ${article.category?.name || 'Uncategorized'}
Tags: ${article.tags?.map((t) => t.name).join(', ') || 'none'}
Content:
${article.content}
      `.trim();

      const vector = await this.searchService.generateEmbedding(textToEmbed);

      if (!vector || !Array.isArray(vector) || vector.length !== 768) {
        console.warn(`[EMBED] Invalid vector for article ${articleId}: length=${vector?.length ?? 'null'}`);
        return;
      }

      const vectorString = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

      await this.articleRepository.query(
        `UPDATE articles SET embedding_vector_pg = $1::vector WHERE id = $2`,
        [vectorString, articleId],
      );

      console.log(`[EMBED] Vector saved (dim 768) for article ${articleId}`);
    } catch (err: any) {
      console.error(`[EMBED] Failed to generate/save for article ${articleId}:`, err.message);
    }
  }

  async semanticSearch(
    query: string,
    limit = 10,
    minSimilarity = 0.72,
    status: ArticleStatus = ArticleStatus.PUBLISHED,
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
      const results = await this.articleRepository.query(
        `
        SELECT 
          id,
          title,
          LEFT(content, 300) AS content_preview,
          ROUND(CAST((1 - (embedding_vector_pg <=> $1::vector)) AS numeric), 4) AS similarity
        FROM articles
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

  async findAll(): Promise<Article[]> {
    return this.articleRepository.find({
      relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: [
        'author', 'category', 'tags', 'media',
        'comments', 'comments.author',
        'versions', 'likes', 'bookmarks',
      ],
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    return article;
  }

  async getArticleMedia(articleId: number): Promise<Media[]> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
      relations: ['media'],
    });

    if (!article) {
      throw new NotFoundException(`Article #${articleId} not found`);
    }

    return article.media || [];
  }

  async update(
    id: number,
    updateArticleDto: UpdateArticleDto,
    user: User,
  ): Promise<Article> {
    let article = await this.articleRepository.findOneOrFail({
      where: { id },
      relations: ['category', 'tags', 'versions', 'media'],
    });

    const { media: mediaDtos, ...articleData } = updateArticleDto;

    const hasSignificantChange =
      !!articleData.title ||
      !!articleData.content ||
      !!articleData.status ||
      !!articleData.categoryId ||
      !!articleData.tagIds;

    if (articleData.title) article.title = articleData.title;
    if (articleData.content) article.content = articleData.content;
    if (articleData.status && Object.values(ArticleStatus).includes(articleData.status)) {
      article.status = articleData.status;
    }
    if (articleData.categoryId) {
      article.category = { id: articleData.categoryId } as unknown as Category;
    }
    if (articleData.tagIds) {
      article.tags = articleData.tagIds.map((tagId) => ({ id: tagId })) as unknown as Tag[];
    }

    article = await this.articleRepository.save(article);

    if (mediaDtos?.length) {
      const mediaPromises = mediaDtos.map((dto) =>
        this.mediaService.create({
          ...dto,
          articleId: article.id,
        }),
      );
      article.media = [...(article.media || []), ...(await Promise.all(mediaPromises))];
    }

    // ── Brouillon : pas de modération, pas de détection de doublon ──────────
    if (article.status === ArticleStatus.DRAFT) {
      if (hasSignificantChange) {
        await this.articleVersioningService.createNewVersion(
          article,
          user,
          articleData.changeSummary ?? 'Draft update',
        );
      }
      if (articleData.title || articleData.content || articleData.categoryId || articleData.tagIds) {
        this.generateAndSaveEmbedding(article.id).catch(console.error);
      }
      return this.findOne(article.id);
    }

    // Détection de duplicata
    try {
      const duplicateCheck = await this.checkDuplicate(
        { title: article.title, content: article.content },
        user.id,
        article.id,
      );

      if (duplicateCheck.hasDuplicates) {
        article.duplicateScore =
          duplicateCheck.similarArticles[0]?.similarity ?? null;
        article.similarArticlesCache = duplicateCheck.similarArticles.map(
          (a) => ({
            id: a.id,
            title: a.title,
            score: a.similarity,
            createdAt: new Date(),
          }),
        );
        article.status = ArticleStatus.REJECTED;
        article.rejectionReason = `Article similaire détecté (similarité : ${((duplicateCheck.similarArticles[0]?.similarity ?? 0) * 100).toFixed(0)}%) — doublon possible avec "${duplicateCheck.similarArticles[0]?.title}"`;

        article = await this.articleRepository.save(article);

        await this.notificationService.createAndNotify(
          NotificationType.ARTICLE_REJECTED,
          user.id,
          null,
          `Votre article "${article.title}" a été rejeté : ${article.rejectionReason}`,
          {
            articleId: article.id,
            duplicateScore: article.duplicateScore,
            similarArticles: article.similarArticlesCache,
          },
        );

        return this.findOne(article.id);
      }
    } catch (err: any) {
      console.warn('[DUPLICATE] Échec détection duplicata :', err.message);
    }

    // Auto-moderation IA
    const hasContent = !!article.title?.trim() && !!article.content?.trim();

    if (hasContent) {
      try {
        const moderation = await this.moderationService.moderate(
          article.title,
          article.content,
        );

        article.moderationResult = moderation;
        article.isAutoModerated = true;
        article.moderationScore = parseFloat(String(moderation.score));

        let newStatus = article.status;
        let notificationMessage = '';
        let notificationType: NotificationType = NotificationType.SYSTEM_INFO;

        if (moderation.score > 0.7) {
          newStatus = ArticleStatus.REJECTED;
          article.rejectionReason = moderation.reason || 'Content flagged as inappropriate';
          notificationMessage = `Your article "${article.title}" has been rejected: ${article.rejectionReason}`;
          notificationType = NotificationType.ARTICLE_REJECTED;
        } else if (moderation.isFlagged || moderation.score > 0.35) {
          newStatus = ArticleStatus.PENDING;
          notificationMessage = `Your article "${article.title}" is pending review (potential risk detected)`;
          notificationType = NotificationType.ARTICLE_PENDING_MODERATION;
        } else {
          newStatus = ArticleStatus.PUBLISHED;
          notificationMessage = `Your article "${article.title}" has been published`;
          notificationType = NotificationType.ARTICLE_PUBLISHED;
        }

        article.status = newStatus;
        article = await this.articleRepository.save(article);

        await this.notificationService.createAndNotify(
          notificationType,
          user.id,
          null,
          notificationMessage,
          {
            articleId: article.id,
            moderationScore: moderation.score,
            moderationCategories: moderation.categories,
          },
        );

        if (newStatus === ArticleStatus.REJECTED) {
          return this.findOne(article.id);
        }
      } catch (err: any) {
        console.error('Content moderation failed:', err);

        if (err?.status === 429 || err?.message?.includes('429')) {
          article.status = ArticleStatus.PENDING;
          article = await this.articleRepository.save(article);
        }

        await this.notificationService.createAndNotify(
          NotificationType.SYSTEM_ERROR,
          user.id,
          null,
          'Content moderation failed. Your article is pending manual review.',
          { articleId: article.id },
        );
      }
    }

    if (hasSignificantChange) {
      await this.articleVersioningService.createNewVersion(
        article,
        user,
        articleData.changeSummary ?? 'Content update',
      );
    }

    if (articleData.title || articleData.content || articleData.categoryId || articleData.tagIds) {
      this.generateAndSaveEmbedding(article.id).catch(console.error);
    }

    return this.findOne(article.id);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articleRepository.remove(article);
  }

  async incrementView(id: number, userId?: number, ip?: string): Promise<void> {
    return this.articleInteractionService.incrementView(id, userId, ip);
  }

  async toggleLike(articleId: number, userId: number): Promise<Article> {
    return this.articleInteractionService.toggleLike(articleId, userId);
  }

  async toggleBookmark(articleId: number, userId: number): Promise<Article> {
    return this.articleInteractionService.toggleBookmark(articleId, userId);
  }

  async getUserLikedArticles(userId: number): Promise<Article[]> {
    return this.articleInteractionService.getUserLikedArticles(userId);
  }

  async getUserBookmarkedArticles(userId: number): Promise<Article[]> {
    return this.articleInteractionService.getUserBookmarkedArticles(userId);
  }

  async createNewVersion(
    article: Article,
    user: User,
    changeSummary: string,
  ): Promise<ArticleVersion> {
    return this.articleVersioningService.createNewVersion(article, user, changeSummary);
  }

  async getHistory(articleId: number): Promise<ArticleVersion[]> {
    return this.articleVersioningService.getHistory(articleId);
  }

  async revertToVersion(
    articleId: number,
    versionNumber: number,
    user: User,
  ): Promise<Article> {
    return this.articleVersioningService.revertToVersion(articleId, versionNumber, user);
  }

  async getArticlesByUserId(userId: number): Promise<Article[]> {
    return this.articleRepository.find({
      where: { author: { id: userId } },
      relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all draft articles belonging to the authenticated user
   */
  async findMyDrafts(userId: number): Promise<Article[]> {
    return this.articleRepository.find({
      where: {
        author: { id: userId },
        status: ArticleStatus.DRAFT,
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
    excludeArticleId?: number,
  ): Promise<{
    hasDuplicates: boolean;
    similarArticles: {
      id: number;
      title: string;
      similarity: number;
      isOwn: boolean;
      url: string;
    }[];
  }> {
    const empty = { hasDuplicates: false, similarArticles: [] };

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
    // $1 = vecteur, $2 = seuil, $3 = limit  [, $4 = excludeArticleId]
    const params: any[] = [vectorString, this.DUPLICATE_THRESHOLD, this.DUPLICATE_LIMIT];

    const excludeClause = excludeArticleId
      ? `AND a.id != $${params.push(excludeArticleId)}`  // $4 ajouté dynamiquement
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
    FROM articles a
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
      results = await this.articleRepository.query(sql, params);
    } catch (err: any) {
      console.error('[DUPLICATE] Erreur pgvector :', err.message);
      return empty;
    }

    // ── 5. Formatage ───────────────────────────────────────────────────────────
    const similarArticles = results.map((r) => ({
      id: r.id,
      title: r.title,
      similarity: Number(r.similarity),
      isOwn: r.authorId === userId,
      url: `/articles/${r.id}`,
    }));

    console.log(
      `[DUPLICATE] ${similarArticles.length} doublon(s) trouvé(s) pour "${title}"`,
      similarArticles.map((a) => `#${a.id} (${(a.similarity * 100).toFixed(1)}%)`),
    );

    return {
      hasDuplicates: similarArticles.length > 0,
      similarArticles,
    };
  }

  /**
 * Approuve manuellement un article rejeté par la modération IA.
 * Réinitialise moderationScore, moderationResult, rejectionReason
 * et passe le statut à PUBLISHED.
 */
  async approveRejectedArticle(articleId: number, adminId: number): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException(`Article #${articleId} introuvable`);
    }

    if (article.status !== ArticleStatus.REJECTED) {
      throw new ForbiddenException(
        `L'article #${articleId} n'est pas dans un état rejeté (statut actuel : ${article.status})`,
      );
    }

    // Réinitialiser les champs de modération et publier
    article.status = ArticleStatus.PUBLISHED;
    article.rejectionReason = undefined;  // raison rejet IA
    article.moderationScore = undefined;  // score IA
    article.moderationResult = undefined;  // rapport IA complet
    article.isAutoModerated = false;
    article.duplicateScore = undefined;  // score doublon
    article.similarArticlesCache = undefined;  // liste des articles similaires

    const saved = await this.articleRepository.save(article);

    this.generateAndSaveEmbedding(saved.id).catch(console.error);

    await this.articleVersioningService.createNewVersion(
      saved,                        // article sauvegardé (pas l'ancien objet)
      { id: adminId } as User,      // admin identifié par son id
      'Approuvé manuellement par un administrateur',
    );

    // Notifier l'auteur
    if (article.author?.id) {
      await this.notificationService.createAndNotify(
        NotificationType.ARTICLE_PUBLISHED,
        article.author.id,
        null,
        `Votre article "${article.title}" a été approuvé manuellement par un administrateur et est maintenant publié.`,
        { articleId: saved.id },
      );
    }

    return this.findOne(saved.id);
  }

  async getArticlesRejectedByModeration(): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.tags', 'tags')
      .where('article.status = :status', { status: ArticleStatus.REJECTED })
      .andWhere('article.isAutoModerated = :isAutoModerated', { isAutoModerated: true })
      .andWhere('article.moderationScore > :threshold', { threshold: 0.7 })
      .orderBy('article.updatedAt', 'DESC')
      .getMany();
  }

  async getArticlesRejectedByDuplicate(): Promise<Article[]> {
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.tags', 'tags')
      .where('article.status = :status', { status: ArticleStatus.REJECTED })
      .andWhere('article.duplicateScore IS NOT NULL')
      .orderBy('article.updatedAt', 'DESC')
      .getMany();
  }

  // ─────────────────────────────────────────────────────────────
  // Signalement d'article
  // ─────────────────────────────────────────────────────────────

  async reportArticle(
    reporterId: number,
    articleId: number,
    dto: ReportArticleDto,
  ): Promise<{ message: string; reportId: number }> {
    const [reporter, article] = await Promise.all([
      this.userRepository.findOne({ where: { id: reporterId } }),
      this.articleRepository.findOne({
        where: { id: articleId },
        relations: ['author'],
      }),
    ]);

    if (!reporter) throw new NotFoundException('Utilisateur introuvable');
    if (!article) throw new NotFoundException('Article introuvable');

    if (article.author?.id === reporterId) {
      throw new BadRequestException('Vous ne pouvez pas signaler votre propre article');
    }

    const existing = await this.articleReportRepository.findOne({
      where: {
        reporter: { id: reporterId },
        article: { id: articleId },
        status: 'pending',
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà signalé cet article. Le signalement est en cours de traitement.',
      );
    }

    const report = this.articleReportRepository.create({
      reporter,
      article,
      reason: dto.reason,
      details: dto.details?.trim() || null,
      status: 'pending',
    });

    const saved = await this.articleReportRepository.save(report);

    return {
      message: 'Signalement envoyé. Merci de nous aider à maintenir la qualité de la plateforme.',
      reportId: saved.id,
    };
  }
}