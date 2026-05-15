// src/stats/stats.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ArticleStatus } from 'utils/constants';
import { TopContributorDto, TopContributorsResponseDto } from './dto/top-contributor.dto';
import { TrendingArticleDto, TrendingArticlesResponseDto } from './dto/trending-article.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { CategoryStatsResponseDto, CategoryStatDto } from './dto/category-stats.dto';
import { UserActivityResponseDto, MonthlyUserActivityDto } from './dto/user-activity.dto';
import { ContentAnalyticsResponseDto, DailyPublicationDto } from './dto/content-analytics.dto';
import { EngagementStatsResponseDto, MostLikedArticleDto, MostBookmarkedArticleDto } from './dto/engagement-stats.dto';
import { AuthorPerformanceResponseDto, AuthorPerformanceDto } from './dto/author-performance.dto';
import { ContentQualityResponseDto, ContentQualityMetricDto, ArticleQualityDto } from './dto/content-quality.dto';
import { ModerationStatsResponseDto, ModerationStatusDto, ModerationCategoryDto, DailyModerationDto } from './dto/moderation-stats.dto';
import { ReadingTimeResponseDto, ReadingTimeRangeDto, ArticleReadingStatsDto } from './dto/reading-time.dto';
import { TagStatsResponseDto, TagPerformanceDto } from './dto/tag-performance.dto';
import { Article } from 'src/article/entities/article.entity';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { ArticleReport } from 'src/article/entities/article-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';

const WEIGHTS = {
  articles: 40,
  views: 35,
  likes: 25,
} as const;

function getWeekBounds(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const from = new Date(now);
  from.setDate(now.getDate() + diffToMonday);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function buildInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function normalizedScore(value: number, max: number): number {
  if (max === 0) return 0;
  return value / max;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(ArticleReport)
    private readonly articleReportRepo: Repository<ArticleReport>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
  ) { }

  async getTopContributors(limit = 5): Promise<TopContributorsResponseDto> {
    const { from, to } = getWeekBounds();

    const articles = await this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .loadRelationCountAndMap('article.likesCount', 'article.likes')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.createdAt BETWEEN :from AND :to', { from, to })
      .getMany();

    type AuthorAgg = {
      userId: number;
      fullName: string;
      department?: string;
      profileImage?: string | null;
      articlesCount: number;
      totalViews: number;
      totalLikes: number;
    };

    const map = new Map<number, AuthorAgg>();

    for (const article of articles) {
      if (!article.author) continue;

      const uid = article.author.id;
      const existing = map.get(uid);
      const likesCount = (article as any).likesCount ?? 0;

      if (existing) {
        existing.articlesCount += 1;
        existing.totalViews += article.viewsCount ?? 0;
        existing.totalLikes += likesCount;
      } else {
        map.set(uid, {
          userId: uid,
          fullName: `${article.author.firstName ?? ''} ${article.author.lastName ?? ''}`.trim(),
          department: article.author.department ?? undefined,
          profileImage: article.author.profileImage ?? null,
          articlesCount: 1,
          totalViews: article.viewsCount ?? 0,
          totalLikes: likesCount,
        });
      }
    }

    const raw = Array.from(map.values());

    if (raw.length === 0) {
      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        contributors: [],
      };
    }

    const maxArticles = Math.max(...raw.map((r) => r.articlesCount));
    const maxViews = Math.max(...raw.map((r) => r.totalViews));
    const maxLikes = Math.max(...raw.map((r) => r.totalLikes));

    const scored = raw.map((r): Omit<TopContributorDto, 'rank'> => {
      const score =
        normalizedScore(r.articlesCount, maxArticles) * WEIGHTS.articles +
        normalizedScore(r.totalViews, maxViews) * WEIGHTS.views +
        normalizedScore(r.totalLikes, maxLikes) * WEIGHTS.likes;

      return {
        ...r,
        initials: buildInitials(r.fullName),
        score: Math.round(score),
      };
    });

    const contributors: TopContributorDto[] = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      contributors,
    };
  }

  private static readonly TREND_WEIGHTS = {
    views: 40,
    likes: 35,
    comments: 25,
  } as const;

  async getTrendingArticles(limit = 5): Promise<TrendingArticlesResponseDto> {
    const { from, to } = getWeekBounds();

    const articles = await this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.tags', 'tags')
      .loadRelationCountAndMap('article.likesCount', 'article.likes')
      .loadRelationCountAndMap('article.commentsCount', 'article.comments')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.createdAt BETWEEN :from AND :to', { from, to })
      .getMany();

    if (articles.length === 0) {
      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        articles: [],
      };
    }

    const withCounts = articles.map((a) => ({
      article: a,
      views: a.viewsCount ?? 0,
      likes: (a as any).likesCount ?? 0,
      comments: (a as any).commentsCount ?? 0,
    }));

    const maxViews = Math.max(...withCounts.map((x) => x.views));
    const maxLikes = Math.max(...withCounts.map((x) => x.likes));
    const maxComments = Math.max(...withCounts.map((x) => x.comments));

    const W = StatsService.TREND_WEIGHTS;

    const scored = withCounts.map((x) => ({
      article: x.article,
      views: x.views,
      likes: x.likes,
      comments: x.comments,
      trendScore: Math.round(
        normalizedScore(x.views, maxViews) * W.views +
        normalizedScore(x.likes, maxLikes) * W.likes +
        normalizedScore(x.comments, maxComments) * W.comments,
      ),
    }));

    const trending = scored
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);

    const result: TrendingArticleDto[] = trending.map((x, i) => {
      const a = x.article;
      const author = a.author;
      const cat = a.category;

      const fullName = author
        ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()
        : 'Auteur inconnu';

      return {
        id: a.id,
        title: a.title,
        description: a.content.slice(0, 200).replace(/[#*`]/g, '').trim() + '…',
        content: a.content,
        category: {
          name: cat?.name ?? 'Non catégorisé',
        },
        author: {
          name: fullName || 'Auteur inconnu',
          initials: buildInitials(fullName || 'AI'),
          department: author?.department ?? undefined,
        },
        tags: (a.tags ?? []).map((t) => t.name),
        publishedAt: a.createdAt.toISOString(),
        stats: {
          views: x.views,
          likes: x.likes,
          comments: x.comments,
        },
        trendScore: x.trendScore,
        rank: i + 1,
      };
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      articles: result,
    };
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalArticles,
      totalUsers,
      totalCategories,
      totalTags,
      totalComments,
    ] = await Promise.all([
      this.articleRepo.count(),
      this.userRepo.count(),
      this.categoryRepo.count(),
      this.tagRepo.count(),
      this.commentRepo.count(),
    ]);

    const totalLikes = await this.articleRepo
      .createQueryBuilder('article')
      .select('COUNT(*)', 'count')
      .from('article_likes', 'al')
      .getRawOne()
      .then((r) => parseInt(r?.count || '0', 10));

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [articlesThisWeek, articlesThisMonth, newUsersThisMonth] = await Promise.all([
      this.articleRepo.count({ where: { createdAt: Between(weekAgo, now) } }),
      this.articleRepo.count({ where: { createdAt: Between(monthAgo, now) } }),
      this.userRepo.count({ where: { createdAt: Between(monthAgo, now) } }),
    ]);

    const mostActiveCategory = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.articles', 'article')
      .select(['category.id', 'category.name'])
      .addSelect('COUNT(article.id)', 'articleCount')
      .groupBy('category.id')
      .orderBy('COUNT(article.id)', 'DESC')
      .limit(1)
      .getRawOne()
      .then((r) =>
        r
          ? {
            id: r.category_id,
            name: r.category_name,
            articleCount: parseInt(r.articleCount, 10),
          }
          : null,
      );

    const topContributor = await this.articleRepo
      .createQueryBuilder('article')
      .leftJoin('article.author', 'author')
      .select(['author.id', 'author.firstName', 'author.lastName'])
      .addSelect('COUNT(article.id)', 'articlesCount')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .groupBy('author.id')
      .orderBy('COUNT(article.id)', 'DESC')
      .limit(1)
      .getRawOne()
      .then((r) =>
        r && r.author_id
          ? {
            userId: r.author_id,
            fullName: `${r.author_firstName || ''} ${r.author_lastName || ''}`.trim(),
            articlesCount: parseInt(r.articlesCount, 10),
          }
          : null,
      );

    return {
      totalArticles,
      totalUsers,
      totalCategories,
      totalTags,
      totalComments,
      totalLikes,
      articlesThisWeek,
      articlesThisMonth,
      newUsersThisMonth,
      mostActiveCategory,
      topContributor,
    };
  }

  async getCategoryStats(): Promise<CategoryStatsResponseDto> {
    const categories = await this.categoryRepo.find({
      relations: ['articles', 'articles.likes', 'articles.comments'],
    });

    let totalArticles = 0;
    const categoryStats: CategoryStatDto[] = categories.map((cat) => {
      const articles = cat.articles || [];
      const articleCount = articles.length;
      totalArticles += articleCount;

      const totalViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = articles.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );
      const totalComments = articles.reduce(
        (sum, a) => sum + ((a as any).comments?.length || 0),
        0,
      );

      const avgEngagementScore =
        articleCount > 0
          ? Math.round((totalViews + totalLikes * 2 + totalComments * 3) / articleCount)
          : 0;

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        articleCount,
        totalViews,
        totalLikes,
        totalComments,
        avgEngagementScore,
      };
    });

    const sorted = categoryStats.sort((a, b) => b.articleCount - a.articleCount);

    return {
      categories: sorted,
      totalArticles,
      mostPopularCategory: sorted[0] || null,
    };
  }

  async getUserActivity(months = 6): Promise<UserActivityResponseDto> {
    const now = new Date();
    const history: MonthlyUserActivityDto[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = monthStart.toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric',
      });

      const [newUsers, activeUsers, articlesPublished, commentsMade] = await Promise.all([
        this.userRepo.count({ where: { createdAt: Between(monthStart, monthEnd) } }),
        this.getActiveUsersCount(monthStart, monthEnd),
        this.articleRepo.count({
          where: { createdAt: Between(monthStart, monthEnd), status: ArticleStatus.PUBLISHED },
        }),
        this.commentRepo.count({ where: { createdAt: Between(monthStart, monthEnd) } }),
      ]);

      history.push({
        month: monthLabel,
        newUsers,
        activeUsers,
        articlesPublished,
        commentsMade,
      });
    }

    const currentMonth = history[history.length - 1];
    const previousMonth = history[history.length - 2] || currentMonth;

    const growthRate = {
      newUsers: this.calculateGrowthRate(previousMonth.newUsers, currentMonth.newUsers),
      activeUsers: this.calculateGrowthRate(previousMonth.activeUsers, currentMonth.activeUsers),
      articlesPublished: this.calculateGrowthRate(
        previousMonth.articlesPublished,
        currentMonth.articlesPublished,
      ),
    };

    return {
      currentMonth,
      previousMonth,
      growthRate,
      history,
    };
  }

  private async getActiveUsersCount(from: Date, to: Date): Promise<number> {
    const activeAuthors = await this.articleRepo
      .createQueryBuilder('article')
      .select('DISTINCT article.authorId')
      .where('article.createdAt BETWEEN :from AND :to', { from, to })
      .getRawMany();

    const activeCommenters = await this.commentRepo
      .createQueryBuilder('comment')
      .select('DISTINCT comment.authorId')
      .where('comment.createdAt BETWEEN :from AND :to', { from, to })
      .getRawMany();

    const activeUserIds = new Set([
      ...activeAuthors.map((a) => a.authorId),
      ...activeCommenters.map((c) => c.authorId),
    ]);

    return activeUserIds.size;
  }

  private calculateGrowthRate(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  async getContentAnalytics(days = 30): Promise<ContentAnalyticsResponseDto> {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyPublications: DailyPublicationDto[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [published, draft, pending, rejected] = await Promise.all([
        this.articleRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: ArticleStatus.PUBLISHED },
        }),
        this.articleRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: ArticleStatus.DRAFT },
        }),
        this.articleRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: ArticleStatus.PENDING },
        }),
        this.articleRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: ArticleStatus.REJECTED },
        }),
      ]);

      dailyPublications.push({
        date: dayStart.toISOString().split('T')[0],
        published,
        draft,
        pending,
        rejected,
      });
    }

    const totalPublished = dailyPublications.reduce((sum, d) => sum + d.published, 0);
    const totalDraft = dailyPublications.reduce((sum, d) => sum + d.draft, 0);
    const totalPending = dailyPublications.reduce((sum, d) => sum + d.pending, 0);
    const totalRejected = dailyPublications.reduce((sum, d) => sum + d.rejected, 0);

    const total = totalPublished + totalDraft + totalPending + totalRejected;
    const publicationRate = total > 0 ? Math.round((totalPublished / total) * 100) : 0;

    return {
      dailyPublications,
      period: { from: from.toISOString(), to: now.toISOString() },
      totalPublished,
      totalDraft,
      totalPending,
      totalRejected,
      publicationRate,
      avgTimeToPublish: null,
    };
  }

  async getEngagementStats(limit = 10): Promise<EngagementStatsResponseDto> {
    const articles = await this.articleRepo.find({
      where: { status: ArticleStatus.PUBLISHED },
      relations: ['author', 'category', 'likes', 'bookmarks'],
    });

    const withEngagement = articles.map((article) => ({
      article,
      likesCount: (article as any).likes?.length || 0,
      bookmarksCount: (article as any).bookmarks?.length || 0,
    }));

    const mostLiked = [...withEngagement]
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, limit);

    const mostBookmarked = [...withEngagement]
      .sort((a, b) => b.bookmarksCount - a.bookmarksCount)
      .slice(0, limit);

    const totalLikes = withEngagement.reduce((sum, a) => sum + a.likesCount, 0);
    const totalBookmarks = withEngagement.reduce((sum, a) => sum + a.bookmarksCount, 0);

    const avgLikesPerArticle = articles.length > 0 ? Math.round(totalLikes / articles.length) : 0;
    const avgBookmarksPerArticle =
      articles.length > 0 ? Math.round(totalBookmarks / articles.length) : 0;

    const mostLikedArticles: MostLikedArticleDto[] = mostLiked.map((item) => ({
      id: item.article.id,
      title: item.article.title,
      author: {
        id: item.article.author?.id || 0,
        fullName: `${item.article.author?.firstName || ''} ${item.article.author?.lastName || ''}`.trim() || 'Unknown',
      },
      likesCount: item.likesCount,
      viewsCount: item.article.viewsCount || 0,
      category: item.article.category?.name || 'Uncategorized',
      publishedAt: item.article.createdAt.toISOString(),
    }));

    const mostBookmarkedArticles: MostBookmarkedArticleDto[] = mostBookmarked.map((item) => ({
      id: item.article.id,
      title: item.article.title,
      author: {
        id: item.article.author?.id || 0,
        fullName: `${item.article.author?.firstName || ''} ${item.article.author?.lastName || ''}`.trim() || 'Unknown',
      },
      bookmarksCount: item.bookmarksCount,
      viewsCount: item.article.viewsCount || 0,
      category: item.article.category?.name || 'Uncategorized',
      publishedAt: item.article.createdAt.toISOString(),
    }));

    return {
      mostLikedArticles,
      mostBookmarkedArticles,
      totalLikes,
      totalBookmarks,
      avgLikesPerArticle,
      avgBookmarksPerArticle,
    };
  }

  async getAuthorPerformance(limit = 20): Promise<AuthorPerformanceResponseDto> {
    const authors = await this.userRepo.find({
      relations: ['articles', 'articles.likes', 'articles.comments'],
    });

    const authorStats: AuthorPerformanceDto[] = authors.map((author) => {
      const articles = author.articles || [];
      const publishedArticles = articles.filter(
        (a) => a.status === ArticleStatus.PUBLISHED,
      );

      const totalViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = articles.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );
      const totalComments = articles.reduce(
        (sum, a) => sum + ((a as any).comments?.length || 0),
        0,
      );

      const avgViewsPerArticle =
        articles.length > 0 ? Math.round(totalViews / articles.length) : 0;

      const engagementRate =
        totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 100) : 0;

      const topArticle = publishedArticles.sort(
        (a, b) => (b.viewsCount || 0) - (a.viewsCount || 0),
      )[0];

      return {
        userId: author.id,
        fullName: `${author.firstName} ${author.lastName}`.trim(),
        initials: this.buildInitials(`${author.firstName} ${author.lastName}`),
        department: author.department,
        totalArticles: articles.length,
        publishedArticles: publishedArticles.length,
        totalViews,
        totalLikes,
        totalComments,
        avgViewsPerArticle,
        engagementRate,
        topPerformingArticle: topArticle
          ? {
            id: topArticle.id,
            title: topArticle.title,
            views: topArticle.viewsCount || 0,
          }
          : null,
      };
    });

    const sorted = authorStats
      .filter((a) => a.totalArticles > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, limit);

    const totalAuthors = sorted.length;
    const avgArticlesPerAuthor =
      totalAuthors > 0
        ? Math.round(sorted.reduce((sum, a) => sum + a.totalArticles, 0) / totalAuthors)
        : 0;

    return {
      authors: sorted,
      totalAuthors,
      topAuthor: sorted[0] || null,
      avgArticlesPerAuthor,
    };
  }

  private buildInitials(fullName: string): string {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  async getContentQuality(limit = 10): Promise<ContentQualityResponseDto> {
    const articles = await this.articleRepo.find({
      relations: ['author', 'category', 'tags', 'media'],
    });

    const analyzedArticles: ArticleQualityDto[] = articles.map((article) => {
      const wordCount = article.content?.split(/\s+/).length || 0;
      const hasImages = (article.media?.length || 0) > 0;
      const hasTags = (article.tags?.length || 0) > 0;
      const hasCategory = !!article.category;

      const readabilityScore = this.calculateReadability(article.content);
      const moderationScore = article.moderationScore || 0;

      const qualityScore = Math.round(
        Math.min(100, (
          (wordCount > 300 ? 20 : wordCount / 15) +
          (hasImages ? 20 : 0) +
          (hasTags ? 15 : 0) +
          (hasCategory ? 10 : 0) +
          (readabilityScore * 0.2) +
          ((1 - moderationScore) * 15)
        ))
      );

      return {
        id: article.id,
        title: article.title,
        author: `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim() || 'Unknown',
        wordCount,
        readabilityScore: Math.round(readabilityScore),
        hasImages,
        hasTags,
        hasCategory,
        moderationScore: Math.round(moderationScore * 100),
        qualityScore,
      };
    });

    const sortedByQuality = [...analyzedArticles].sort((a, b) => b.qualityScore - a.qualityScore);
    const topQualityArticles = sortedByQuality.slice(0, limit);
    const needsImprovement = [...analyzedArticles]
      .sort((a, b) => a.qualityScore - b.qualityScore)
      .slice(0, limit);

    const avgWordCount =
      articles.length > 0
        ? Math.round(analyzedArticles.reduce((sum, a) => sum + a.wordCount, 0) / articles.length)
        : 0;

    const articlesWithImages = analyzedArticles.filter((a) => a.hasImages).length;
    const articlesWithTags = analyzedArticles.filter((a) => a.hasTags).length;

    const overallScore =
      analyzedArticles.length > 0
        ? Math.round(analyzedArticles.reduce((sum, a) => sum + a.qualityScore, 0) / analyzedArticles.length)
        : 0;

    const metrics: ContentQualityMetricDto[] = [
      {
        metric: 'Average Word Count',
        value: avgWordCount,
        benchmark: 500,
        status: avgWordCount >= 500 ? 'good' : avgWordCount >= 300 ? 'average' : 'poor',
      },
      {
        metric: 'Images Usage',
        value: Math.round((articlesWithImages / (articles.length || 1)) * 100),
        benchmark: 70,
        status: articlesWithImages / (articles.length || 1) >= 0.7 ? 'good' : 'average',
      },
      {
        metric: 'Tags Usage',
        value: Math.round((articlesWithTags / (articles.length || 1)) * 100),
        benchmark: 80,
        status: articlesWithTags / (articles.length || 1) >= 0.8 ? 'good' : 'average',
      },
    ];

    return {
      overallScore,
      metrics,
      topQualityArticles,
      needsImprovement,
      avgWordCount,
      articlesWithImages,
      articlesWithTags,
    };
  }

  private calculateReadability(content: string): number {
    if (!content) return 0;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;
    for (const char of word) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevWasVowel) count++;
      prevWasVowel = isVowel;
    }
    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  async getModerationStats(days = 30): Promise<ModerationStatsResponseDto> {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const articles = await this.articleRepo.find({
      where: { createdAt: Between(from, now) },
    });

    const statusCounts = {
      [ArticleStatus.PUBLISHED]: 0,
      [ArticleStatus.DRAFT]: 0,
      [ArticleStatus.PENDING]: 0,
      [ArticleStatus.REJECTED]: 0,
    };

    articles.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    const total = articles.length;
    const statusBreakdown: ModerationStatusDto[] = [
      { status: 'published', count: statusCounts[ArticleStatus.PUBLISHED], percentage: total > 0 ? Math.round((statusCounts[ArticleStatus.PUBLISHED] / total) * 100) : 0 },
      { status: 'draft', count: statusCounts[ArticleStatus.DRAFT], percentage: total > 0 ? Math.round((statusCounts[ArticleStatus.DRAFT] / total) * 100) : 0 },
      { status: 'pending', count: statusCounts[ArticleStatus.PENDING], percentage: total > 0 ? Math.round((statusCounts[ArticleStatus.PENDING] / total) * 100) : 0 },
      { status: 'rejected', count: statusCounts[ArticleStatus.REJECTED], percentage: total > 0 ? Math.round((statusCounts[ArticleStatus.REJECTED] / total) * 100) : 0 },
    ];

    const flaggedCategories: ModerationCategoryDto[] = [];
    const categoryMap = new Map<string, number>();

    articles.forEach((a) => {
      if (a.moderationResult?.categories) {
        a.moderationResult.categories.forEach((cat) => {
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        });
      }
    });

    categoryMap.forEach((count, category) => {
      flaggedCategories.push({
        category,
        count,
        severity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
      });
    });

    flaggedCategories.sort((a, b) => b.count - a.count);

    const dailyTrend: DailyModerationDto[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayArticles = articles.filter(
        (a) => a.createdAt >= dayStart && a.createdAt <= dayEnd,
      );

      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        approved: dayArticles.filter((a) => a.status === ArticleStatus.PUBLISHED).length,
        rejected: dayArticles.filter((a) => a.status === ArticleStatus.REJECTED).length,
        pending: dayArticles.filter((a) => a.status === ArticleStatus.PENDING).length,
        flagged: dayArticles.filter((a) => a.moderationResult?.isFlagged).length,
      });
    }

    const autoModerated = articles.filter((a) => a.isAutoModerated).length;
    const rejected = statusCounts[ArticleStatus.REJECTED];

    return {
      totalModerated: total,
      statusBreakdown,
      flaggedCategories,
      dailyTrend,
      avgModerationTime: null,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      autoModerationRate: total > 0 ? Math.round((autoModerated / total) * 100) : 0,
    };
  }

  async getReadingTimeStats(): Promise<ReadingTimeResponseDto> {
    const articles = await this.articleRepo.find({
      where: { status: ArticleStatus.PUBLISHED },
      relations: ['author'],
    });

    const analyzedArticles = articles.map((article) => {
      const wordCount = article.content?.split(/\s+/).length || 0;
      const estimatedReadTime = Math.ceil(wordCount / 200);

      return {
        article,
        wordCount,
        estimatedReadTime,
      };
    });

    const ranges: ReadingTimeRangeDto[] = [
      { range: 'Quick Read (< 3 min)', min: 0, max: 3, articleCount: 0, avgEngagement: 0 },
      { range: 'Short (3-5 min)', min: 3, max: 5, articleCount: 0, avgEngagement: 0 },
      { range: 'Medium (5-10 min)', min: 5, max: 10, articleCount: 0, avgEngagement: 0 },
      { range: 'Long (10-15 min)', min: 10, max: 15, articleCount: 0, avgEngagement: 0 },
      { range: 'Deep Dive (> 15 min)', min: 15, max: Infinity, articleCount: 0, avgEngagement: 0 },
    ];

    analyzedArticles.forEach(({ article, estimatedReadTime }) => {
      const range = ranges.find(
        (r) => estimatedReadTime >= r.min && estimatedReadTime < r.max,
      );
      if (range) {
        range.articleCount++;
      }
    });

    const avgWordCount =
      analyzedArticles.length > 0
        ? Math.round(analyzedArticles.reduce((sum, a) => sum + a.wordCount, 0) / analyzedArticles.length)
        : 0;

    const avgReadTime =
      analyzedArticles.length > 0
        ? Math.round(analyzedArticles.reduce((sum, a) => sum + a.estimatedReadTime, 0) / analyzedArticles.length)
        : 0;

    const sortedByLength = [...analyzedArticles].sort((a, b) => b.wordCount - a.wordCount);

    const longestArticles: ArticleReadingStatsDto[] = sortedByLength.slice(0, 5).map((item) => ({
      id: item.article.id,
      title: item.article.title,
      author: `${item.article.author?.firstName || ''} ${item.article.author?.lastName || ''}`.trim() || 'Unknown',
      wordCount: item.wordCount,
      estimatedReadTime: item.estimatedReadTime,
      actualAvgTime: null,
      completionRate: null,
      views: item.article.viewsCount || 0,
    }));

    const shortestArticles: ArticleReadingStatsDto[] = sortedByLength
      .slice(-5)
      .reverse()
      .map((item) => ({
        id: item.article.id,
        title: item.article.title,
        author: `${item.article.author?.firstName || ''} ${item.article.author?.lastName || ''}`.trim() || 'Unknown',
        wordCount: item.wordCount,
        estimatedReadTime: item.estimatedReadTime,
        actualAvgTime: null,
        completionRate: null,
        views: item.article.viewsCount || 0,
      }));

    const optimalRange = ranges
      .filter((r) => r.articleCount > 0)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    return {
      ranges,
      avgWordCount,
      avgReadTime,
      longestArticles,
      shortestArticles,
      optimalLength: optimalRange
        ? {
          wordCount: Math.round((optimalRange.min + optimalRange.max) / 2 * 200),
          engagement: optimalRange.avgEngagement,
        }
        : null,
    };
  }

  async getTagPerformance(): Promise<TagStatsResponseDto> {
    const tags = await this.tagRepo.find({
      relations: ['articles', 'articles.likes'],
    });

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tagStats: TagPerformanceDto[] = tags.map((tag) => {
      const articles = tag.articles || [];
      const articleCount = articles.length;

      const totalViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = articles.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );

      const avgEngagement =
        articleCount > 0 ? Math.round((totalViews + totalLikes * 2) / articleCount) : 0;

      const recentArticles = articles.filter((a) => a.createdAt >= monthAgo).length;
      const trending = recentArticles > 0 && recentArticles >= articleCount * 0.3;

      const previousMonthArticles = articles.filter(
        (a) => {
          const prevMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          return a.createdAt >= prevMonth && a.createdAt < monthAgo;
        },
      ).length;

      const growthRate =
        previousMonthArticles > 0
          ? Math.round(((recentArticles - previousMonthArticles) / previousMonthArticles) * 100)
          : recentArticles > 0
            ? 100
            : 0;

      return {
        id: tag.id,
        name: tag.name,
        articleCount,
        totalViews,
        totalLikes,
        avgEngagement,
        trending,
        growthRate,
      };
    });

    const sortedByUsage = [...tagStats].sort((a, b) => b.articleCount - a.articleCount);
    const sortedByTrending = [...tagStats]
      .filter((t) => t.trending)
      .sort((a, b) => b.growthRate - a.growthRate);

    const unusedTags = tagStats.filter((t) => t.articleCount === 0).length;

    return {
      tags: sortedByUsage,
      totalTags: tags.length,
      topTrending: sortedByTrending.slice(0, 10),
      mostUsed: sortedByUsage.slice(0, 10),
      unusedTags,
    };
  }

  // ============================================
  // EMPLOYEE TRENDING STATS (accessible à tous)
  // ============================================

  async getEmployeeTrendingStats() {
    const { from: weekFrom, to: weekTo } = getWeekBounds();
    const monthFrom = new Date();
    monthFrom.setDate(monthFrom.getDate() - 30);

    const [
      totalArticlesThisWeek,
      totalViewsThisWeek,
      topArticles,
      trendingTags,
      topAuthors,
      dailyActivity,
    ] = await Promise.all([
      this.getTotalArticlesInPeriod(weekFrom, weekTo),
      this.getTotalViewsInPeriod(weekFrom, weekTo),
      this.getPopularArticlesForEmployees(5, 'week'),
      this.getTrendingTagsForEmployees(10),
      this.getTopAuthorsForEmployees(5, 'month'),
      this.getActivityTimelineForEmployees(30),
    ]);

    const previousWeekFrom = new Date(weekFrom);
    previousWeekFrom.setDate(previousWeekFrom.getDate() - 7);
    const previousWeekTo = new Date(weekTo);
    previousWeekTo.setDate(previousWeekTo.getDate() - 7);

    const previousWeekArticles = await this.getTotalArticlesInPeriod(previousWeekFrom, previousWeekTo);
    const articlesGrowth = previousWeekArticles === 0
      ? 100
      : ((totalArticlesThisWeek - previousWeekArticles) / previousWeekArticles) * 100;

    const previousWeekViews = await this.getTotalViewsInPeriod(previousWeekFrom, previousWeekTo);
    const viewsGrowth = previousWeekViews === 0
      ? 100
      : ((totalViewsThisWeek - previousWeekViews) / previousWeekViews) * 100;

    return {
      period: {
        from: weekFrom.toISOString(),
        to: weekTo.toISOString(),
      },
      stats: {
        totalArticles: totalArticlesThisWeek,
        articlesGrowth: Math.round(articlesGrowth),
        totalViews: totalViewsThisWeek,
        viewsGrowth: Math.round(viewsGrowth),
        activeAuthors: topAuthors.length,
      },
      topArticles,
      trendingTags,
      topAuthors,
      dailyActivity,
    };
  }

  private async getTotalArticlesInPeriod(from: Date, to: Date): Promise<number> {
    return this.articleRepo.count({
      where: {
        createdAt: Between(from, to),
        status: ArticleStatus.PUBLISHED,
      },
    });
  }

  private async getTotalViewsInPeriod(from: Date, to: Date): Promise<number> {
    const result = await this.articleRepo
      .createQueryBuilder('article')
      .select('SUM(article.viewsCount)', 'total')
      .where('article.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  async getPopularArticlesForEmployees(limit: number, period: 'week' | 'month' | 'year') {
    const from = new Date();
    switch (period) {
      case 'week':
        from.setDate(from.getDate() - 7);
        break;
      case 'month':
        from.setDate(from.getDate() - 30);
        break;
      case 'year':
        from.setFullYear(from.getFullYear() - 1);
        break;
    }

    const articles = await this.articleRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .loadRelationCountAndMap('article.likesCount', 'article.likes')
      .loadRelationCountAndMap('article.commentsCount', 'article.comments')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.createdAt >= :from', { from })
      .orderBy('article.viewsCount', 'DESC')
      .limit(limit)
      .getMany();

    return articles.map(article => ({
      id: article.id,
      title: article.title,
      // Générer un slug à partir de l'ID (plus simple et unique)
      slug: `article-${article.id}`,
      excerpt: article.content?.substring(0, 150).replace(/[#*`]/g, '') + '...',
      viewsCount: article.viewsCount || 0,
      likesCount: (article as any).likesCount || 0,
      commentsCount: (article as any).commentsCount || 0,
      author: {
        id: article.author?.id,
        name: `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim(),
        avatar: null, // Si pas de champ avatar dans User
      },
      category: {
        id: article.category?.id,
        name: article.category?.name,
      },
      publishedAt: article.createdAt,
    }));
  }

  async getTrendingTagsForEmployees(limit: number) {
    const { from, to } = getWeekBounds();

    const tags = await this.tagRepo
      .createQueryBuilder('tag')
      .leftJoin('tag.articles', 'article')
      .select(['tag.id', 'tag.name'])
      .addSelect('COUNT(DISTINCT article.id)', 'articleCount')
      .addSelect('SUM(article.viewsCount)', 'totalViews')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('article.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('tag.id')
      .orderBy('COUNT(DISTINCT article.id)', 'DESC')
      .limit(limit)
      .getRawMany();

    const maxCount = Math.max(...tags.map(t => parseInt(t.articleCount, 10)), 1);

    return tags.map((tag, index) => ({
      id: tag.tag_id,
      name: tag.tag_name,
      articleCount: parseInt(tag.articleCount, 10),
      totalViews: parseInt(tag.totalViews || '0', 10),
      trend: index < 3 ? 'up' : index < 7 ? 'stable' : 'down',
      热度: Math.round((parseInt(tag.articleCount, 10) / maxCount) * 100),
    }));
  }

  async getTopAuthorsForEmployees(limit: number, period: 'week' | 'month' | 'year') {
  const from = new Date();
  switch (period) {
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from.setDate(from.getDate() - 30);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  const authors = await this.userRepo
    .createQueryBuilder('user')
    .leftJoin('user.articles', 'article')
    .select([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.department',
    ])
    .addSelect('COUNT(DISTINCT article.id)', 'articleCount')
    .addSelect('SUM(article.viewsCount)', 'totalViews')
    .where('article.status = :status', { status: ArticleStatus.PUBLISHED })
    .andWhere('article.createdAt >= :from', { from })
    .groupBy('user.id')
    .having('COUNT(DISTINCT article.id) > 0')
    .orderBy('SUM(article.viewsCount)', 'DESC')
    .limit(limit)
    .getRawMany();

  return authors.map(author => ({
    id: author.user_id,
    name: `${author.user_firstName || ''} ${author.user_lastName || ''}`.trim(),
    avatar: null,
    department: author.user_department,
    articleCount: parseInt(author.articleCount, 10),
    totalViews: parseInt(author.totalViews || '0', 10),
    totalLikes: 0, // Valeur par défaut
    engagementRate: 0, // Valeur par défaut
  }));
}

  async getActivityTimelineForEmployees(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    // Correction: Définir le type explicite du tableau
    const timeline: Array<{ date: string; articles: number; views: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [articles, views] = await Promise.all([
        this.articleRepo.count({
          where: {
            createdAt: Between(date, nextDate),
            status: ArticleStatus.PUBLISHED,
          },
        }),
        this.getTotalViewsOnDate(date),
      ]);

      timeline.push({
        date: date.toISOString().split('T')[0],
        articles,
        views,
      });
    }

    return timeline;
  }

  private async getTotalViewsOnDate(date: Date): Promise<number> {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const result = await this.articleRepo
      .createQueryBuilder('article')
      .select('SUM(article.viewsCount)', 'total')
      .where('article.createdAt BETWEEN :from AND :to', { from: date, to: nextDate })
      .andWhere('article.status = :status', { status: ArticleStatus.PUBLISHED })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  // ============================================
  // REPORTS STATS (admin only)
  // ============================================

  async getReportsStats() {
    const [
      totalArticleReports,
      totalUserReports,
      pendingArticleReports,
      pendingUserReports,
      reviewedArticleReports,
      reviewedUserReports,
      dismissedArticleReports,
      dismissedUserReports,
    ] = await Promise.all([
      this.articleReportRepo.count(),
      this.userReportRepo.count(),
      this.articleReportRepo.count({ where: { status: 'pending' } }),
      this.userReportRepo.count({ where: { status: 'pending' } }),
      this.articleReportRepo.count({ where: { status: 'reviewed' } }),
      this.userReportRepo.count({ where: { status: 'reviewed' } }),
      this.articleReportRepo.count({ where: { status: 'dismissed' } }),
      this.userReportRepo.count({ where: { status: 'dismissed' } }),
    ]);

    // Article reports by reason
    const articleReasonRaw = await this.articleReportRepo
      .createQueryBuilder('r')
      .select('r.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.reason')
      .getRawMany();

    const articleByReason = articleReasonRaw.map((row) => ({
      reason: row.reason as string,
      count: parseInt(row.count, 10),
    }));

    // User reports by reason
    const userReasonRaw = await this.userReportRepo
      .createQueryBuilder('r')
      .select('r.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.reason')
      .getRawMany();

    const userByReason = userReasonRaw.map((row) => ({
      reason: row.reason as string,
      count: parseInt(row.count, 10),
    }));

    // Last 30 days trend for article reports
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentArticleReports = await this.articleReportRepo
      .createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.createdAt)", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('r.createdAt >= :from', { from })
      .groupBy("DATE_TRUNC('day', r.createdAt)")
      .orderBy("DATE_TRUNC('day', r.createdAt)", 'ASC')
      .getRawMany();

    const recentUserReports = await this.userReportRepo
      .createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.createdAt)", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('r.createdAt >= :from', { from })
      .groupBy("DATE_TRUNC('day', r.createdAt)")
      .orderBy("DATE_TRUNC('day', r.createdAt)", 'ASC')
      .getRawMany();

    // Most reported articles (top 5)
    const topReportedArticles = await this.articleReportRepo
      .createQueryBuilder('r')
      .leftJoin('r.article', 'article')
      .select(['article.id', 'article.title'])
      .addSelect('COUNT(r.id)', 'reportCount')
      .groupBy('article.id')
      .orderBy('COUNT(r.id)', 'DESC')
      .limit(5)
      .getRawMany();

    // Most reported users (top 5)
    const topReportedUsers = await this.userReportRepo
      .createQueryBuilder('r')
      .leftJoin('r.reportedUser', 'u')
      .select(['u.id', 'u.firstName', 'u.lastName'])
      .addSelect('COUNT(r.id)', 'reportCount')
      .groupBy('u.id')
      .orderBy('COUNT(r.id)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      articles: {
        total: totalArticleReports,
        pending: pendingArticleReports,
        reviewed: reviewedArticleReports,
        dismissed: dismissedArticleReports,
        byReason: articleByReason,
        recentTrend: recentArticleReports.map((r) => ({
          day: new Date(r.day).toISOString().split('T')[0],
          count: parseInt(r.count, 10),
        })),
        topReported: topReportedArticles.map((r) => ({
          id: r.article_id,
          title: r.article_title,
          reportCount: parseInt(r.reportCount, 10),
        })),
      },
      users: {
        total: totalUserReports,
        pending: pendingUserReports,
        reviewed: reviewedUserReports,
        dismissed: dismissedUserReports,
        byReason: userByReason,
        recentTrend: recentUserReports.map((r) => ({
          day: new Date(r.day).toISOString().split('T')[0],
          count: parseInt(r.count, 10),
        })),
        topReported: topReportedUsers.map((r) => ({
          id: r.u_id,
          name: `${r.u_firstName || ''} ${r.u_lastName || ''}`.trim(),
          reportCount: parseInt(r.reportCount, 10),
        })),
      },
    };
  }
}