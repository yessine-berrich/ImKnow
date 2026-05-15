import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Article } from 'src/article/entities/article.entity';
import { ArticleView } from 'src/article/entities/article-view.entity';
import { User } from 'src/users/entities/user.entity';
import { ArticleStatus } from 'utils/constants';
import { Follow } from 'src/follow/entities/follow.entity';

export type FeedSource = 'followed' | 'trending' | 'personalized' | 'seen';
export type FeedFilter = 'all' | 'following' | 'trending';

export interface FeedItem {
  article: Article;
  source: FeedSource;
  score: number;
}

export interface FeedResult {
  items: { article: Article; source: FeedSource }[];
  hasMore: boolean;
  totalCandidates: number;
}

// Signals for building a user's interest profile
interface UserInterestProfile {
  categoryScores: Map<number, number>;
  tagScores: Map<number, number>;
  interactedIds: Set<number>;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(ArticleView)
    private readonly articleViewRepository: Repository<ArticleView>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  // ── Public API ───────────────────────────────────────────────────────────────

  async getRecommendations(userId: number, limit = 10): Promise<Article[]> {
    try {
      if (!userId || userId <= 0) return this.getFallbackArticles(new Set([0]), limit);

      const safeLimit = Math.min(Math.max(limit, 1), 50);
      const user = await this.loadUserWithInteractions(userId);
      if (!user) return this.getFallbackArticles(new Set([0]), safeLimit);

      const profile = await this.buildInterestProfile(user);

      const [semanticCandidates, behavioralCandidates] = await Promise.all([
        this.getSemanticCandidates(user, profile.interactedIds, safeLimit * 3),
        this.getBehavioralCandidates(profile, safeLimit * 3),
      ]);

      const scoreMap = new Map<number, { article: Article; score: number }>();

      for (const { article, similarity } of semanticCandidates) {
        const prev = scoreMap.get(article.id)?.score ?? 0;
        scoreMap.set(article.id, { article, score: prev + similarity * 0.6 });
      }
      for (const { article, score } of behavioralCandidates) {
        const prev = scoreMap.get(article.id)?.score ?? 0;
        scoreMap.set(article.id, { article, score: prev + score * 0.4 });
      }
      // Popularity boost (log scale to avoid rich-get-richer runaway)
      for (const [id, entry] of scoreMap) {
        scoreMap.set(id, {
          ...entry,
          score: entry.score + Math.log1p(entry.article.viewsCount ?? 0) * 0.01,
        });
      }

      const sorted = Array.from(scoreMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, safeLimit)
        .map((e) => e.article);

      if (sorted.length < safeLimit) {
        const returnedIds = new Set([...profile.interactedIds, ...sorted.map((a) => a.id)]);
        const fallback = await this.getFallbackArticles(returnedIds, safeLimit - sorted.length);
        return [...sorted, ...fallback];
      }
      return sorted;
    } catch (error) {
      this.logger.error(`getRecommendations error for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Smart homepage feed — Facebook/Instagram-style.
   * Pagination via page/pageSize. Three filters: all | following | trending.
   * Each item carries a `source` label so the UI can show context ("From someone you follow", etc.).
   */
  async getHomepageFeed(
    userId: number,
    page = 1,
    pageSize = 20,
    filter: FeedFilter = 'all',
  ): Promise<FeedResult> {
    const empty: FeedResult = { items: [], hasMore: false, totalCandidates: 0 };

    try {
      if (!userId || userId <= 0) {
        // Anonymous / cold-start: serve public trending content
        const trending = await this.getTrendingArticles(new Set([0]), pageSize * 3);
        const pool: FeedItem[] = this.applyRecencyDecay(
          trending.map((a) => ({ article: a, source: 'trending' as FeedSource, score: this.engagementScore(a) })),
        ).sort((a, b) => b.score - a.score);
        return this.paginatePool(pool, page, pageSize);
      }

      const safePageSize = Math.min(Math.max(pageSize, 1), 30);
      const safePage = Math.max(page, 1);
      const poolSize = Math.max(safePageSize * (safePage + 9), 120);

      const user = await this.loadUserWithInteractions(userId);
      if (!user) return empty;

      const profile = await this.buildInterestProfile(user);

      // ── Fast paths ────────────────────────────────────────────────────────────
      if (filter === 'following') {
        const articles = await this.getFollowedAuthorsArticles(userId, profile.interactedIds, poolSize);
        const unseenPool = this.applyRecencyDecay(
          articles.map((a) => ({
            article: a,
            source: 'followed' as FeedSource,
            score: this.engagementScore(a) + 0.5,
          })),
        ).sort((a, b) => b.score - a.score);
        const pool = await this.fillPool(unseenPool, profile.interactedIds, poolSize);
        return this.paginatePool(pool, safePage, safePageSize);
      }

      if (filter === 'trending') {
        const articles = await this.getTrendingArticles(profile.interactedIds, poolSize);
        const unseenPool = this.applyRecencyDecay(
          articles.map((a) => ({
            article: a,
            source: 'trending' as FeedSource,
            score: this.engagementScore(a) + 0.3,
          })),
        ).sort((a, b) => b.score - a.score);
        const pool = await this.fillPool(unseenPool, profile.interactedIds, poolSize);
        return this.paginatePool(pool, safePage, safePageSize);
      }

      // ── Full smart feed ('all') ────────────────────────────────────────────────
      const [followedArticles, trendingArticles, personalizedArticles] = await Promise.all([
        this.getFollowedAuthorsArticles(userId, profile.interactedIds, poolSize),
        this.getTrendingArticles(profile.interactedIds, poolSize),
        this.getPersonalizedForFeed(user, profile, poolSize),
      ]);

      const articleMap = new Map<number, FeedItem>();

      // Priority: followed > trending > personalized
      for (const article of followedArticles) {
        articleMap.set(article.id, {
          article,
          source: 'followed',
          score: this.engagementScore(article) + 0.5,
        });
      }
      for (const article of trendingArticles) {
        if (!articleMap.has(article.id)) {
          articleMap.set(article.id, {
            article,
            source: 'trending',
            score: this.engagementScore(article) + 0.3,
          });
        }
      }
      for (const article of personalizedArticles) {
        if (!articleMap.has(article.id)) {
          articleMap.set(article.id, {
            article,
            source: 'personalized',
            score: this.engagementScore(article),
          });
        }
      }

      const unseenPool = this.ensureDiversity(
        this.applyRecencyDecay(Array.from(articleMap.values())).sort((a, b) => b.score - a.score),
        poolSize,
      );

      const pool = await this.fillPool(unseenPool, profile.interactedIds, poolSize);
      return this.paginatePool(pool, safePage, safePageSize);
    } catch (error) {
      this.logger.error(`getHomepageFeed error for user ${userId}:`, error);
      return empty;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Load user with liked/bookmarked/commented articles for interest profiling */
  private async loadUserWithInteractions(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'likedArticles',
        'likedArticles.category',
        'likedArticles.tags',
        'bookmarkedArticles',
        'bookmarkedArticles.category',
        'bookmarkedArticles.tags',
        'comments',
        'comments.article',
      ],
    });
  }

  /**
   * Build a scored interest profile from likes (+3), bookmarks (+2), and views (+1).
   * Viewed article IDs are excluded from future recommendations.
   */
  private async buildInterestProfile(user: User): Promise<UserInterestProfile> {
    const categoryScores = new Map<number, number>();
    const tagScores = new Map<number, number>();
    const interactedIds = new Set<number>();

    const addSignal = (article: Article, weight: number) => {
      interactedIds.add(article.id);
      if (article.category?.id)
        categoryScores.set(article.category.id, (categoryScores.get(article.category.id) ?? 0) + weight);
      for (const tag of article.tags ?? [])
        tagScores.set(tag.id, (tagScores.get(tag.id) ?? 0) + weight);
    };

    for (const article of user.likedArticles ?? []) addSignal(article, 3);
    for (const article of user.bookmarkedArticles ?? []) addSignal(article, 2);

    // Comments: mark the commented article as interacted
    for (const comment of user.comments ?? []) {
      if (comment.article?.id) interactedIds.add(comment.article.id);
    }

    // Views are a weaker signal: score +1, but still mark as interacted
    const viewedIds = await this.getViewedArticleIds(user.id);
    if (viewedIds.length > 0) {
      const viewedArticles = await this.articleRepository.find({
        where: { id: In(viewedIds.slice(0, 30)) },
        relations: ['category', 'tags'],
      });
      for (const article of viewedArticles) addSignal(article, 1);
    }

    return { categoryScores, tagScores, interactedIds };
  }

  private paginatePool(ranked: FeedItem[], page: number, pageSize: number): FeedResult {
    const start = (page - 1) * pageSize;
    const slice = ranked.slice(start, start + pageSize);
    return {
      items: slice.map((i) => ({ article: i.article, source: i.source })),
      hasMore: ranked.length > start + pageSize,
      totalCandidates: ranked.length,
    };
  }

  private applyRecencyDecay(items: FeedItem[]): FeedItem[] {
    const now = Date.now();
    const oneDay = 86_400_000;
    return items.map((item) => {
      const daysOld = (now - new Date(item.article.createdAt).getTime()) / oneDay;
      return { ...item, score: item.score * Math.pow(0.85, daysOld) };
    });
  }

  /** Composite engagement score: views (capped) + likes (capped) + comments (capped) */
  private engagementScore(article: Article): number {
    const views = article.viewsCount || 0;
    const likes = (article as any).likes?.length || 0;
    const comments = (article as any).comments?.length || 0;
    return (
      Math.min(views / 100, 0.3) +
      Math.min(likes / 20, 0.4) +
      Math.min(comments / 10, 0.3)
    );
  }

  /** Enforce max 45% per source so no single bucket dominates the feed */
  private ensureDiversity(items: FeedItem[], limit: number): FeedItem[] {
    const maxPerSource = Math.ceil(limit * 0.45);
    const counts = new Map<string, number>();
    const result: FeedItem[] = [];

    for (const item of items) {
      if (result.length >= limit) break;
      const n = counts.get(item.source) ?? 0;
      if (n < maxPerSource) {
        result.push(item);
        counts.set(item.source, n + 1);
      }
    }

    // Fill remaining slots without restriction
    if (result.length < limit) {
      const seen = new Set(result.map((i) => i.article.id));
      for (const item of items) {
        if (result.length >= limit) break;
        if (!seen.has(item.article.id)) result.push(item);
      }
    }

    return result;
  }

  // ── Candidate fetchers ───────────────────────────────────────────────────────

  private async getFollowedAuthorsArticles(
    userId: number,
    excludeIds: Set<number>,
    limit: number,
  ): Promise<Article[]> {
    try {
      const follows = await this.followRepository.find({
        where: { follower: { id: userId } },
        relations: ['following'],
      });
      if (follows.length === 0) return [];

      const authorIds = follows.map((f) => f.following.id);
      const excludeArray = excludeIds.size > 0 ? [...excludeIds] : [0];

      return this.articleRepository
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.tags', 'tags')
        .leftJoinAndSelect('article.likes', 'likes')
        .leftJoinAndSelect('article.bookmarks', 'bookmarks')
        .leftJoinAndSelect('article.comments', 'comments')
        .leftJoinAndSelect('article.media', 'media')
        .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
        .andWhere('article.author IN (:...authorIds)', { authorIds })
        .andWhere('article.id != ALL(:excludeIds)', { excludeIds: excludeArray })
        .orderBy('article.createdAt', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error('getFollowedAuthorsArticles error:', error);
      return [];
    }
  }

  /**
   * Trending = published in the last 7 days, sorted by composite score:
   * views + likes×5 + comments×3 (likes/comments are stronger engagement signals)
   */
  private async getTrendingArticles(excludeIds: Set<number>, limit: number): Promise<Article[]> {
    try {
      const excludeArray = excludeIds.size > 0 ? [...excludeIds] : [0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

      const articles = await this.articleRepository
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.tags', 'tags')
        .leftJoinAndSelect('article.likes', 'likes')
        .leftJoinAndSelect('article.bookmarks', 'bookmarks')
        .leftJoinAndSelect('article.comments', 'comments')
        .leftJoinAndSelect('article.media', 'media')
        .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
        .andWhere('article.id != ALL(:excludeIds)', { excludeIds: excludeArray })
        .andWhere('article.createdAt >= :date', { date: sevenDaysAgo })
        .take(limit * 2) // fetch extra, then re-sort by composite
        .getMany();

      return articles
        .sort((a, b) => {
          const score = (art: Article) =>
            (art.viewsCount ?? 0) +
            ((art as any).likes?.length ?? 0) * 5 +
            ((art as any).comments?.length ?? 0) * 3;
          return score(b) - score(a);
        })
        .slice(0, limit);
    } catch (error) {
      this.logger.error('getTrendingArticles error:', error);
      return [];
    }
  }

  /**
   * Personalized candidates: semantic (vector similarity) + behavioral (category/tag affinity).
   * Applied with 60/40 weighting, same as getRecommendations.
   */
  private async getPersonalizedForFeed(
    user: User,
    profile: UserInterestProfile,
    limit: number,
  ): Promise<Article[]> {
    try {
      const [semantic, behavioral] = await Promise.all([
        this.getSemanticCandidates(user, profile.interactedIds, limit),
        this.getBehavioralCandidates(profile, limit),
      ]);

      const scoreMap = new Map<number, { article: Article; score: number }>();
      for (const { article, similarity } of semantic) {
        const prev = scoreMap.get(article.id)?.score ?? 0;
        scoreMap.set(article.id, { article, score: prev + similarity * 0.6 });
      }
      for (const { article, score } of behavioral) {
        const prev = scoreMap.get(article.id)?.score ?? 0;
        scoreMap.set(article.id, { article, score: prev + score * 0.4 });
      }

      return Array.from(scoreMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((e) => e.article);
    } catch (error) {
      this.logger.error('getPersonalizedForFeed error:', error);
      return [];
    }
  }

  private async getSemanticCandidates(
    user: User,
    excludeIds: Set<number>,
    limit: number,
  ): Promise<{ article: Article; similarity: number }[]> {
    try {
      const sourceArticles = [
        ...(user.likedArticles ?? []),
        ...(user.bookmarkedArticles ?? []),
      ].filter((a) => a.id);
      if (sourceArticles.length === 0) return [];

      const sourceIds = sourceArticles.map((a) => a.id);
      const vectors = await this.articleRepository.query(
        `SELECT id, embedding_vector_pg FROM articles WHERE id = ANY($1) AND embedding_vector_pg IS NOT NULL`,
        [sourceIds],
      );
      if (!vectors?.length) return [];

      const dim = 768;
      const avg = new Array(dim).fill(0);
      let validCount = 0;

      for (const row of vectors) {
        try {
          let vec: number[];
          if (Array.isArray(row.embedding_vector_pg)) {
            vec = row.embedding_vector_pg;
          } else if (typeof row.embedding_vector_pg === 'string') {
            vec = row.embedding_vector_pg.replace(/[\[\]]/g, '').split(',').map(Number);
          } else continue;
          if (vec.length !== dim) continue;
          for (let i = 0; i < dim; i++) avg[i] += vec[i];
          validCount++;
        } catch {
          continue;
        }
      }
      if (validCount === 0) return [];
      for (let i = 0; i < dim; i++) avg[i] /= validCount;

      const avgString = '[' + avg.map((v) => v.toFixed(8)).join(',') + ']';
      const excludeArray = excludeIds.size > 0 ? [...excludeIds] : [0];

      const results = await this.articleRepository.query(
        `SELECT a.id, ROUND(CAST((1 - (embedding_vector_pg <=> $1::vector)) AS numeric), 4) AS similarity
         FROM articles a
         WHERE a.embedding_vector_pg IS NOT NULL
           AND a.status = $2
           AND a.id != ALL($3)
           AND (1 - (embedding_vector_pg <=> $1::vector)) >= 0.3
         ORDER BY similarity DESC
         LIMIT $4`,
        [avgString, ArticleStatus.PUBLISHED, excludeArray, limit],
      );
      if (!results?.length) return [];

      const ids = results.map((r: any) => r.id);
      const articles = await this.articleRepository.find({
        where: { id: In(ids) },
        relations: ['author', 'category', 'tags', 'likes', 'bookmarks', 'comments', 'media'],
      });
      const articleMap = new Map(articles.map((a) => [a.id, a]));

      return results
        .filter((r: any) => articleMap.has(r.id))
        .map((r: any) => ({ article: articleMap.get(r.id)!, similarity: Number(r.similarity) }));
    } catch (error) {
      this.logger.error('getSemanticCandidates error:', error);
      return [];
    }
  }

  private async getBehavioralCandidates(
    profile: UserInterestProfile,
    limit: number,
  ): Promise<{ article: Article; score: number }[]> {
    try {
      const { categoryScores, tagScores, interactedIds } = profile;
      if (categoryScores.size === 0 && tagScores.size === 0) return [];

      const topCategories = [...categoryScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
      const topTags = [...tagScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topCategories.length === 0 && topTags.length === 0) return [];

      const excludeArray = interactedIds.size > 0 ? [...interactedIds] : [0];

      const articles = await this.articleRepository
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.tags', 'tags')
        .leftJoinAndSelect('article.likes', 'likes')
        .leftJoinAndSelect('article.bookmarks', 'bookmarks')
        .leftJoinAndSelect('article.comments', 'comments')
        .leftJoinAndSelect('article.media', 'media')
        .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
        .andWhere('article.id != ALL(:excludeIds)', { excludeIds: excludeArray })
        .andWhere('(category.id = ANY(:categories) OR tags.id = ANY(:tags))', {
          categories: topCategories.length > 0 ? topCategories : [0],
          tags: topTags.length > 0 ? topTags : [0],
        })
        .orderBy('article.viewsCount', 'DESC')
        .take(limit)
        .getMany();

      return articles.map((article) => {
        let score = 0;
        if (article.category?.id && categoryScores.has(article.category.id))
          score += categoryScores.get(article.category.id)! * 0.5;
        for (const tag of article.tags ?? [])
          if (tagScores.has(tag.id)) score += tagScores.get(tag.id)! * 0.3;
        return { article, score: Math.min(score / 10, 1) };
      });
    } catch (error) {
      this.logger.error('getBehavioralCandidates error:', error);
      return [];
    }
  }

  /**
   * Ensures the pool never runs empty by appending all remaining published articles.
   * Articles not yet interacted with are inserted first (unseen fallback),
   * already-seen articles are appended last — so the feed always has content.
   */
  private async fillPool(
    pool: FeedItem[],
    seenIds: Set<number>,
    targetSize: number,
  ): Promise<FeedItem[]> {
    const poolIds = new Set(pool.map((i) => i.article.id));
    const remaining = await this.getAllPublishedExcluding(poolIds, targetSize);

    const unseenFallback: FeedItem[] = [];
    const seenFallback: FeedItem[] = [];

    remaining.forEach((article) => {
      if (seenIds.has(article.id)) {
        seenFallback.push({ article, source: 'seen', score: -2 });
      } else {
        unseenFallback.push({ article, source: 'personalized', score: -1 });
      }
    });

    return [...pool, ...unseenFallback, ...seenFallback];
  }

  /** Fetch all published articles not already in the pool, sorted by recency. */
  private async getAllPublishedExcluding(excludeIds: Set<number>, limit: number): Promise<Article[]> {
    try {
      const excludeArray = excludeIds.size > 0 ? [...excludeIds] : [0];
      return this.articleRepository
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.tags', 'tags')
        .leftJoinAndSelect('article.likes', 'likes')
        .leftJoinAndSelect('article.bookmarks', 'bookmarks')
        .leftJoinAndSelect('article.comments', 'comments')
        .leftJoinAndSelect('article.media', 'media')
        .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
        .andWhere('article.id != ALL(:excludeIds)', { excludeIds: excludeArray })
        .orderBy('article.createdAt', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error('getAllPublishedExcluding error:', error);
      return [];
    }
  }

  private async getFallbackArticles(excludeIds: Set<number>, limit: number): Promise<Article[]> {
    try {
      const excludeArray = excludeIds.size > 0 ? [...excludeIds] : [0];
      return this.articleRepository
        .createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author')
        .leftJoinAndSelect('article.category', 'category')
        .leftJoinAndSelect('article.tags', 'tags')
        .leftJoinAndSelect('article.likes', 'likes')
        .leftJoinAndSelect('article.bookmarks', 'bookmarks')
        .leftJoinAndSelect('article.comments', 'comments')
        .leftJoinAndSelect('article.media', 'media')
        .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
        .andWhere('article.id != ALL(:excludeIds)', { excludeIds: excludeArray })
        .andWhere("article.createdAt > NOW() - INTERVAL '30 days'")
        .orderBy('article.viewsCount', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error('getFallbackArticles error:', error);
      return [];
    }
  }

  private async getViewedArticleIds(userId: number): Promise<number[]> {
    try {
      const views = await this.articleViewRepository
        .createQueryBuilder('view')
        .innerJoin('view.article', 'article')
        .where('view.user = :userId', { userId })
        .select(['article.id'])
        .orderBy('view.createdAt', 'DESC')
        .take(100)
        .getRawMany();
      return views.map((v) => v.article_id).filter((id): id is number => id != null);
    } catch (error) {
      this.logger.error('getViewedArticleIds error:', error);
      return [];
    }
  }
}
