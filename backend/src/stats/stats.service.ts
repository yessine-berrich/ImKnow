// src/stats/stats.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PublicationStatus } from 'utils/constants';
import { TopContributorDto, TopContributorsResponseDto } from './dto/top-contributor.dto';
import { TrendingPublicationDto, TrendingPublicationsResponseDto } from './dto/trending-publication.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { CategoryStatsResponseDto, CategoryStatDto } from './dto/category-stats.dto';
import { UserActivityResponseDto, MonthlyUserActivityDto } from './dto/user-activity.dto';
import { ContentAnalyticsResponseDto, DailyPublicationDto } from './dto/content-analytics.dto';
import { EngagementStatsResponseDto, MostLikedPublicationDto, MostBookmarkedPublicationDto } from './dto/engagement-stats.dto';
import { AuthorPerformanceResponseDto, AuthorPerformanceDto } from './dto/author-performance.dto';
import { ContentQualityResponseDto, ContentQualityMetricDto, PublicationQualityDto } from './dto/content-quality.dto';
import { ModerationStatsResponseDto, ModerationStatusDto, ModerationCategoryDto, DailyModerationDto } from './dto/moderation-stats.dto';
import { ReadingTimeResponseDto, ReadingTimeRangeDto, PublicationReadingStatsDto } from './dto/reading-time.dto';
import { TagStatsResponseDto, TagPerformanceDto } from './dto/tag-performance.dto';
import { Publication } from 'src/publication/entities/publication.entity';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';

const WEIGHTS = {
  publications: 40,
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
    @InjectRepository(Publication)
    private readonly publicationRepo: Repository<Publication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(PublicationReport)
    private readonly publicationReportRepo: Repository<PublicationReport>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
  ) { }

  async getTopContributors(limit = 5): Promise<TopContributorsResponseDto> {
    const { from, to } = getWeekBounds();

    const publications = await this.publicationRepo
      .createQueryBuilder('publication')
      .leftJoinAndSelect('publication.author', 'author')
      .loadRelationCountAndMap('publication.likesCount', 'publication.likes')
      .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('publication.createdAt BETWEEN :from AND :to', { from, to })
      .getMany();

    type AuthorAgg = {
      userId: number;
      fullName: string;
      department?: string;
      profileImage?: string | null;
      publicationsCount: number;
      totalViews: number;
      totalLikes: number;
    };

    const map = new Map<number, AuthorAgg>();

    for (const publication of publications) {
      if (!publication.author) continue;

      const uid = publication.author.id;
      const existing = map.get(uid);
      const likesCount = (publication as any).likesCount ?? 0;

      if (existing) {
        existing.publicationsCount += 1;
        existing.totalViews += publication.viewsCount ?? 0;
        existing.totalLikes += likesCount;
      } else {
        map.set(uid, {
          userId: uid,
          fullName: `${publication.author.firstName ?? ''} ${publication.author.lastName ?? ''}`.trim(),
          department: publication.author.department ?? undefined,
          profileImage: publication.author.profileImage ?? null,
          publicationsCount: 1,
          totalViews: publication.viewsCount ?? 0,
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

    const maxPublications = Math.max(...raw.map((r) => r.publicationsCount));
    const maxViews = Math.max(...raw.map((r) => r.totalViews));
    const maxLikes = Math.max(...raw.map((r) => r.totalLikes));

    const scored = raw.map((r): Omit<TopContributorDto, 'rank'> => {
      const score =
        normalizedScore(r.publicationsCount, maxPublications) * WEIGHTS.publications +
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

  async getTrendingPublications(limit = 5): Promise<TrendingPublicationsResponseDto> {
    const { from, to } = getWeekBounds();

    const publications = await this.publicationRepo
      .createQueryBuilder('publication')
      .leftJoinAndSelect('publication.author', 'author')
      .leftJoinAndSelect('publication.category', 'category')
      .leftJoinAndSelect('publication.tags', 'tags')
      .loadRelationCountAndMap('publication.likesCount', 'publication.likes')
      .loadRelationCountAndMap('publication.commentsCount', 'publication.comments')
      .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('publication.createdAt BETWEEN :from AND :to', { from, to })
      .getMany();

    if (publications.length === 0) {
      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        publications: [],
      };
    }

    const withCounts = publications.map((a) => ({
      publication: a,
      views: a.viewsCount ?? 0,
      likes: (a as any).likesCount ?? 0,
      comments: (a as any).commentsCount ?? 0,
    }));

    const maxViews = Math.max(...withCounts.map((x) => x.views));
    const maxLikes = Math.max(...withCounts.map((x) => x.likes));
    const maxComments = Math.max(...withCounts.map((x) => x.comments));

    const W = StatsService.TREND_WEIGHTS;

    const scored = withCounts.map((x) => ({
      publication: x.publication,
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

    const result: TrendingPublicationDto[] = trending.map((x, i) => {
      const a = x.publication;
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
      publications: result,
    };
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalPublications,
      totalUsers,
      totalCategories,
      totalTags,
      totalComments,
    ] = await Promise.all([
      this.publicationRepo.count(),
      this.userRepo.count(),
      this.categoryRepo.count(),
      this.tagRepo.count(),
      this.commentRepo.count(),
    ]);

    const totalLikes = await this.publicationRepo
      .createQueryBuilder('publication')
      .select('COUNT(*)', 'count')
      .from('publication_likes', 'al')
      .getRawOne()
      .then((r) => parseInt(r?.count || '0', 10));

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [publicationsThisWeek, publicationsThisMonth, newUsersThisMonth] = await Promise.all([
      this.publicationRepo.count({ where: { createdAt: Between(weekAgo, now) } }),
      this.publicationRepo.count({ where: { createdAt: Between(monthAgo, now) } }),
      this.userRepo.count({ where: { createdAt: Between(monthAgo, now) } }),
    ]);

    const mostActiveCategory = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.publications', 'publication')
      .select(['category.id', 'category.name'])
      .addSelect('COUNT(publication.id)', 'publicationCount')
      .groupBy('category.id')
      .orderBy('COUNT(publication.id)', 'DESC')
      .limit(1)
      .getRawOne()
      .then((r) =>
        r
          ? {
            id: r.category_id,
            name: r.category_name,
            publicationCount: parseInt(r.publicationCount, 10),
          }
          : null,
      );

    const topContributor = await this.publicationRepo
      .createQueryBuilder('publication')
      .leftJoin('publication.author', 'author')
      .select(['author.id', 'author.firstName', 'author.lastName'])
      .addSelect('COUNT(publication.id)', 'publicationsCount')
      .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .groupBy('author.id')
      .orderBy('COUNT(publication.id)', 'DESC')
      .limit(1)
      .getRawOne()
      .then((r) =>
        r && r.author_id
          ? {
            userId: r.author_id,
            fullName: `${r.author_firstName || ''} ${r.author_lastName || ''}`.trim(),
            publicationsCount: parseInt(r.publicationsCount, 10),
          }
          : null,
      );

    return {
      totalPublications,
      totalUsers,
      totalCategories,
      totalTags,
      totalComments,
      totalLikes,
      publicationsThisWeek,
      publicationsThisMonth,
      newUsersThisMonth,
      mostActiveCategory,
      topContributor,
    };
  }

  async getCategoryStats(): Promise<CategoryStatsResponseDto> {
    const categories = await this.categoryRepo.find({
      relations: ['publications', 'publications.likes', 'publications.comments'],
    });

    let totalPublications = 0;
    const categoryStats: CategoryStatDto[] = categories.map((cat) => {
      const publications = cat.publications || [];
      const publicationCount = publications.length;
      totalPublications += publicationCount;

      const totalViews = publications.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = publications.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );
      const totalComments = publications.reduce(
        (sum, a) => sum + ((a as any).comments?.length || 0),
        0,
      );

      const avgEngagementScore =
        publicationCount > 0
          ? Math.round((totalViews + totalLikes * 2 + totalComments * 3) / publicationCount)
          : 0;

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        publicationCount,
        totalViews,
        totalLikes,
        totalComments,
        avgEngagementScore,
      };
    });

    const sorted = categoryStats.sort((a, b) => b.publicationCount - a.publicationCount);

    return {
      categories: sorted,
      totalPublications,
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

      const [newUsers, activeUsers, publicationsPublished, commentsMade] = await Promise.all([
        this.userRepo.count({ where: { createdAt: Between(monthStart, monthEnd) } }),
        this.getActiveUsersCount(monthStart, monthEnd),
        this.publicationRepo.count({
          where: { createdAt: Between(monthStart, monthEnd), status: PublicationStatus.PUBLISHED },
        }),
        this.commentRepo.count({ where: { createdAt: Between(monthStart, monthEnd) } }),
      ]);

      history.push({
        month: monthLabel,
        newUsers,
        activeUsers,
        publicationsPublished,
        commentsMade,
      });
    }

    const currentMonth = history[history.length - 1];
    const previousMonth = history[history.length - 2] || currentMonth;

    const growthRate = {
      newUsers: this.calculateGrowthRate(previousMonth.newUsers, currentMonth.newUsers),
      activeUsers: this.calculateGrowthRate(previousMonth.activeUsers, currentMonth.activeUsers),
      publicationsPublished: this.calculateGrowthRate(
        previousMonth.publicationsPublished,
        currentMonth.publicationsPublished,
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
    const activeAuthors = await this.publicationRepo
      .createQueryBuilder('publication')
      .select('DISTINCT publication.authorId')
      .where('publication.createdAt BETWEEN :from AND :to', { from, to })
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
        this.publicationRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: PublicationStatus.PUBLISHED },
        }),
        this.publicationRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: PublicationStatus.DRAFT },
        }),
        this.publicationRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: PublicationStatus.PENDING },
        }),
        this.publicationRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), status: PublicationStatus.REJECTED },
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
    const publications = await this.publicationRepo.find({
      where: { status: PublicationStatus.PUBLISHED },
      relations: ['author', 'category', 'likes', 'bookmarks'],
    });

    const withEngagement = publications.map((publication) => ({
      publication,
      likesCount: (publication as any).likes?.length || 0,
      bookmarksCount: (publication as any).bookmarks?.length || 0,
    }));

    const mostLiked = [...withEngagement]
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, limit);

    const mostBookmarked = [...withEngagement]
      .sort((a, b) => b.bookmarksCount - a.bookmarksCount)
      .slice(0, limit);

    const totalLikes = withEngagement.reduce((sum, a) => sum + a.likesCount, 0);
    const totalBookmarks = withEngagement.reduce((sum, a) => sum + a.bookmarksCount, 0);

    const avgLikesPerPublication = publications.length > 0 ? Math.round(totalLikes / publications.length) : 0;
    const avgBookmarksPerPublication =
      publications.length > 0 ? Math.round(totalBookmarks / publications.length) : 0;

    const mostLikedPublications: MostLikedPublicationDto[] = mostLiked.map((item) => ({
      id: item.publication.id,
      title: item.publication.title,
      author: {
        id: item.publication.author?.id || 0,
        fullName: `${item.publication.author?.firstName || ''} ${item.publication.author?.lastName || ''}`.trim() || 'Unknown',
      },
      likesCount: item.likesCount,
      viewsCount: item.publication.viewsCount || 0,
      category: item.publication.category?.name || 'Uncategorized',
      publishedAt: item.publication.createdAt.toISOString(),
    }));

    const mostBookmarkedPublications: MostBookmarkedPublicationDto[] = mostBookmarked.map((item) => ({
      id: item.publication.id,
      title: item.publication.title,
      author: {
        id: item.publication.author?.id || 0,
        fullName: `${item.publication.author?.firstName || ''} ${item.publication.author?.lastName || ''}`.trim() || 'Unknown',
      },
      bookmarksCount: item.bookmarksCount,
      viewsCount: item.publication.viewsCount || 0,
      category: item.publication.category?.name || 'Uncategorized',
      publishedAt: item.publication.createdAt.toISOString(),
    }));

    return {
      mostLikedPublications,
      mostBookmarkedPublications,
      totalLikes,
      totalBookmarks,
      avgLikesPerPublication,
      avgBookmarksPerPublication,
    };
  }

  async getAuthorPerformance(limit = 20): Promise<AuthorPerformanceResponseDto> {
    const authors = await this.userRepo.find({
      relations: ['publications', 'publications.likes', 'publications.comments'],
    });

    const authorStats: AuthorPerformanceDto[] = authors.map((author) => {
      const publications = author.publications || [];
      const publishedPublications = publications.filter(
        (a) => a.status === PublicationStatus.PUBLISHED,
      );

      const totalViews = publications.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = publications.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );
      const totalComments = publications.reduce(
        (sum, a) => sum + ((a as any).comments?.length || 0),
        0,
      );

      const avgViewsPerPublication =
        publications.length > 0 ? Math.round(totalViews / publications.length) : 0;

      const engagementRate =
        totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 100) : 0;

      const topPublication = publishedPublications.sort(
        (a, b) => (b.viewsCount || 0) - (a.viewsCount || 0),
      )[0];

      return {
        userId: author.id,
        fullName: `${author.firstName} ${author.lastName}`.trim(),
        initials: this.buildInitials(`${author.firstName} ${author.lastName}`),
        department: author.department,
        totalPublications: publications.length,
        publishedPublications: publishedPublications.length,
        totalViews,
        totalLikes,
        totalComments,
        avgViewsPerPublication,
        engagementRate,
        topPerformingPublication: topPublication
          ? {
            id: topPublication.id,
            title: topPublication.title,
            views: topPublication.viewsCount || 0,
          }
          : null,
      };
    });

    const sorted = authorStats
      .filter((a) => a.totalPublications > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, limit);

    const totalAuthors = sorted.length;
    const avgPublicationsPerAuthor =
      totalAuthors > 0
        ? Math.round(sorted.reduce((sum, a) => sum + a.totalPublications, 0) / totalAuthors)
        : 0;

    return {
      authors: sorted,
      totalAuthors,
      topAuthor: sorted[0] || null,
      avgPublicationsPerAuthor,
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
    const publications = await this.publicationRepo.find({
      relations: ['author', 'category', 'tags', 'media'],
    });

    const analyzedPublications: PublicationQualityDto[] = publications.map((publication) => {
      const wordCount = publication.content?.split(/\s+/).length || 0;
      const hasImages = (publication.media?.length || 0) > 0;
      const hasTags = (publication.tags?.length || 0) > 0;
      const hasCategory = !!publication.category;

      const readabilityScore = this.calculateReadability(publication.content);
      const moderationScore = publication.moderationScore || 0;

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
        id: publication.id,
        title: publication.title,
        author: `${publication.author?.firstName || ''} ${publication.author?.lastName || ''}`.trim() || 'Unknown',
        wordCount,
        readabilityScore: Math.round(readabilityScore),
        hasImages,
        hasTags,
        hasCategory,
        moderationScore: Math.round(moderationScore * 100),
        qualityScore,
      };
    });

    const sortedByQuality = [...analyzedPublications].sort((a, b) => b.qualityScore - a.qualityScore);
    const topQualityPublications = sortedByQuality.slice(0, limit);
    const needsImprovement = [...analyzedPublications]
      .sort((a, b) => a.qualityScore - b.qualityScore)
      .slice(0, limit);

    const avgWordCount =
      publications.length > 0
        ? Math.round(analyzedPublications.reduce((sum, a) => sum + a.wordCount, 0) / publications.length)
        : 0;

    const publicationsWithImages = analyzedPublications.filter((a) => a.hasImages).length;
    const publicationsWithTags = analyzedPublications.filter((a) => a.hasTags).length;

    const overallScore =
      analyzedPublications.length > 0
        ? Math.round(analyzedPublications.reduce((sum, a) => sum + a.qualityScore, 0) / analyzedPublications.length)
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
        value: Math.round((publicationsWithImages / (publications.length || 1)) * 100),
        benchmark: 70,
        status: publicationsWithImages / (publications.length || 1) >= 0.7 ? 'good' : 'average',
      },
      {
        metric: 'Tags Usage',
        value: Math.round((publicationsWithTags / (publications.length || 1)) * 100),
        benchmark: 80,
        status: publicationsWithTags / (publications.length || 1) >= 0.8 ? 'good' : 'average',
      },
    ];

    return {
      overallScore,
      metrics,
      topQualityPublications,
      needsImprovement,
      avgWordCount,
      publicationsWithImages,
      publicationsWithTags,
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

    const publications = await this.publicationRepo.find({
      where: { createdAt: Between(from, now) },
    });

    const statusCounts = {
      [PublicationStatus.PUBLISHED]: 0,
      [PublicationStatus.DRAFT]: 0,
      [PublicationStatus.PENDING]: 0,
      [PublicationStatus.REJECTED]: 0,
    };

    publications.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    const total = publications.length;
    const statusBreakdown: ModerationStatusDto[] = [
      { status: 'published', count: statusCounts[PublicationStatus.PUBLISHED], percentage: total > 0 ? Math.round((statusCounts[PublicationStatus.PUBLISHED] / total) * 100) : 0 },
      { status: 'draft', count: statusCounts[PublicationStatus.DRAFT], percentage: total > 0 ? Math.round((statusCounts[PublicationStatus.DRAFT] / total) * 100) : 0 },
      { status: 'pending', count: statusCounts[PublicationStatus.PENDING], percentage: total > 0 ? Math.round((statusCounts[PublicationStatus.PENDING] / total) * 100) : 0 },
      { status: 'rejected', count: statusCounts[PublicationStatus.REJECTED], percentage: total > 0 ? Math.round((statusCounts[PublicationStatus.REJECTED] / total) * 100) : 0 },
    ];

    const flaggedCategories: ModerationCategoryDto[] = [];
    const categoryMap = new Map<string, number>();

    publications.forEach((a) => {
      const cats = a.moderationResult?.categories;
      if (cats) {
        const catKeys: string[] = Array.isArray(cats) ? cats : Object.keys(cats);
        catKeys.forEach((cat) => categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1));
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

      const dayPublications = publications.filter(
        (a) => a.createdAt >= dayStart && a.createdAt <= dayEnd,
      );

      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        approved: dayPublications.filter((a) => a.status === PublicationStatus.PUBLISHED).length,
        rejected: dayPublications.filter((a) => a.status === PublicationStatus.REJECTED).length,
        pending: dayPublications.filter((a) => a.status === PublicationStatus.PENDING).length,
        flagged: dayPublications.filter((a) => a.moderationResult?.isFlagged).length,
      });
    }

    const autoModerated = publications.filter((a) => a.isAutoModerated).length;
    const rejected = statusCounts[PublicationStatus.REJECTED];

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
    const publications = await this.publicationRepo.find({
      where: { status: PublicationStatus.PUBLISHED },
      relations: ['author'],
    });

    const analyzedPublications = publications.map((publication) => {
      const wordCount = publication.content?.split(/\s+/).length || 0;
      const estimatedReadTime = Math.ceil(wordCount / 200);

      return {
        publication,
        wordCount,
        estimatedReadTime,
      };
    });

    const ranges: ReadingTimeRangeDto[] = [
      { range: 'Quick Read (< 3 min)', min: 0, max: 3, publicationCount: 0, avgEngagement: 0 },
      { range: 'Short (3-5 min)', min: 3, max: 5, publicationCount: 0, avgEngagement: 0 },
      { range: 'Medium (5-10 min)', min: 5, max: 10, publicationCount: 0, avgEngagement: 0 },
      { range: 'Long (10-15 min)', min: 10, max: 15, publicationCount: 0, avgEngagement: 0 },
      { range: 'Deep Dive (> 15 min)', min: 15, max: Infinity, publicationCount: 0, avgEngagement: 0 },
    ];

    analyzedPublications.forEach(({ publication, estimatedReadTime }) => {
      const range = ranges.find(
        (r) => estimatedReadTime >= r.min && estimatedReadTime < r.max,
      );
      if (range) {
        range.publicationCount++;
      }
    });

    const avgWordCount =
      analyzedPublications.length > 0
        ? Math.round(analyzedPublications.reduce((sum, a) => sum + a.wordCount, 0) / analyzedPublications.length)
        : 0;

    const avgReadTime =
      analyzedPublications.length > 0
        ? Math.round(analyzedPublications.reduce((sum, a) => sum + a.estimatedReadTime, 0) / analyzedPublications.length)
        : 0;

    const sortedByLength = [...analyzedPublications].sort((a, b) => b.wordCount - a.wordCount);

    const longestPublications: PublicationReadingStatsDto[] = sortedByLength.slice(0, 5).map((item) => ({
      id: item.publication.id,
      title: item.publication.title,
      author: `${item.publication.author?.firstName || ''} ${item.publication.author?.lastName || ''}`.trim() || 'Unknown',
      wordCount: item.wordCount,
      estimatedReadTime: item.estimatedReadTime,
      actualAvgTime: null,
      completionRate: null,
      views: item.publication.viewsCount || 0,
    }));

    const shortestPublications: PublicationReadingStatsDto[] = sortedByLength
      .slice(-5)
      .reverse()
      .map((item) => ({
        id: item.publication.id,
        title: item.publication.title,
        author: `${item.publication.author?.firstName || ''} ${item.publication.author?.lastName || ''}`.trim() || 'Unknown',
        wordCount: item.wordCount,
        estimatedReadTime: item.estimatedReadTime,
        actualAvgTime: null,
        completionRate: null,
        views: item.publication.viewsCount || 0,
      }));

    const optimalRange = ranges
      .filter((r) => r.publicationCount > 0)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    return {
      ranges,
      avgWordCount,
      avgReadTime,
      longestPublications,
      shortestPublications,
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
      relations: ['publications', 'publications.likes'],
    });

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tagStats: TagPerformanceDto[] = tags.map((tag) => {
      const publications = tag.publications || [];
      const publicationCount = publications.length;

      const totalViews = publications.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalLikes = publications.reduce(
        (sum, a) => sum + ((a as any).likes?.length || 0),
        0,
      );

      const avgEngagement =
        publicationCount > 0 ? Math.round((totalViews + totalLikes * 2) / publicationCount) : 0;

      const recentPublications = publications.filter((a) => a.createdAt >= monthAgo).length;
      const trending = recentPublications > 0 && recentPublications >= publicationCount * 0.3;

      const previousMonthPublications = publications.filter(
        (a) => {
          const prevMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          return a.createdAt >= prevMonth && a.createdAt < monthAgo;
        },
      ).length;

      const growthRate =
        previousMonthPublications > 0
          ? Math.round(((recentPublications - previousMonthPublications) / previousMonthPublications) * 100)
          : recentPublications > 0
            ? 100
            : 0;

      return {
        id: tag.id,
        name: tag.name,
        publicationCount,
        totalViews,
        totalLikes,
        avgEngagement,
        trending,
        growthRate,
      };
    });

    const sortedByUsage = [...tagStats].sort((a, b) => b.publicationCount - a.publicationCount);
    const sortedByTrending = [...tagStats]
      .filter((t) => t.trending)
      .sort((a, b) => b.growthRate - a.growthRate);

    const unusedTags = tagStats.filter((t) => t.publicationCount === 0).length;

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
      totalPublicationsThisWeek,
      totalViewsThisWeek,
      topPublications,
      trendingTags,
      topAuthors,
      dailyActivity,
    ] = await Promise.all([
      this.getTotalPublicationsInPeriod(weekFrom, weekTo),
      this.getTotalViewsInPeriod(weekFrom, weekTo),
      this.getPopularPublicationsForEmployees(5, 'week'),
      this.getTrendingTagsForEmployees(10),
      this.getTopAuthorsForEmployees(5, 'month'),
      this.getActivityTimelineForEmployees(30),
    ]);

    const previousWeekFrom = new Date(weekFrom);
    previousWeekFrom.setDate(previousWeekFrom.getDate() - 7);
    const previousWeekTo = new Date(weekTo);
    previousWeekTo.setDate(previousWeekTo.getDate() - 7);

    const previousWeekPublications = await this.getTotalPublicationsInPeriod(previousWeekFrom, previousWeekTo);
    const publicationsGrowth = previousWeekPublications === 0
      ? 100
      : ((totalPublicationsThisWeek - previousWeekPublications) / previousWeekPublications) * 100;

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
        totalPublications: totalPublicationsThisWeek,
        publicationsGrowth: Math.round(publicationsGrowth),
        totalViews: totalViewsThisWeek,
        viewsGrowth: Math.round(viewsGrowth),
        activeAuthors: topAuthors.length,
      },
      topPublications,
      trendingTags,
      topAuthors,
      dailyActivity,
    };
  }

  private async getTotalPublicationsInPeriod(from: Date, to: Date): Promise<number> {
    return this.publicationRepo.count({
      where: {
        createdAt: Between(from, to),
        status: PublicationStatus.PUBLISHED,
      },
    });
  }

  private async getTotalViewsInPeriod(from: Date, to: Date): Promise<number> {
    const result = await this.publicationRepo
      .createQueryBuilder('publication')
      .select('SUM(publication.viewsCount)', 'total')
      .where('publication.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  async getPopularPublicationsForEmployees(limit: number, period: 'week' | 'month' | 'year') {
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

    const publications = await this.publicationRepo
      .createQueryBuilder('publication')
      .leftJoinAndSelect('publication.author', 'author')
      .leftJoinAndSelect('publication.category', 'category')
      .loadRelationCountAndMap('publication.likesCount', 'publication.likes')
      .loadRelationCountAndMap('publication.commentsCount', 'publication.comments')
      .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('publication.createdAt >= :from', { from })
      .orderBy('publication.viewsCount', 'DESC')
      .limit(limit)
      .getMany();

    return publications.map(publication => ({
      id: publication.id,
      title: publication.title,
      // Générer un slug à partir de l'ID (plus simple et unique)
      slug: `publication-${publication.id}`,
      excerpt: publication.content?.substring(0, 150).replace(/[#*`]/g, '') + '...',
      viewsCount: publication.viewsCount || 0,
      likesCount: (publication as any).likesCount || 0,
      commentsCount: (publication as any).commentsCount || 0,
      author: {
        id: publication.author?.id,
        name: `${publication.author?.firstName || ''} ${publication.author?.lastName || ''}`.trim(),
        avatar: null, // Si pas de champ avatar dans User
      },
      category: {
        id: publication.category?.id,
        name: publication.category?.name,
      },
      publishedAt: publication.createdAt,
    }));
  }

  async getTrendingTagsForEmployees(limit: number) {
    const { from, to } = getWeekBounds();

    const tags = await this.tagRepo
      .createQueryBuilder('tag')
      .leftJoin('tag.publications', 'publication')
      .select(['tag.id', 'tag.name'])
      .addSelect('COUNT(DISTINCT publication.id)', 'publicationCount')
      .addSelect('SUM(publication.viewsCount)', 'totalViews')
      .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('publication.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('tag.id')
      .orderBy('COUNT(DISTINCT publication.id)', 'DESC')
      .limit(limit)
      .getRawMany();

    const maxCount = Math.max(...tags.map(t => parseInt(t.publicationCount, 10)), 1);

    return tags.map((tag, index) => ({
      id: tag.tag_id,
      name: tag.tag_name,
      publicationCount: parseInt(tag.publicationCount, 10),
      totalViews: parseInt(tag.totalViews || '0', 10),
      trend: index < 3 ? 'up' : index < 7 ? 'stable' : 'down',
      热度: Math.round((parseInt(tag.publicationCount, 10) / maxCount) * 100),
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
    .leftJoin('user.publications', 'publication')
    .select([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.department',
    ])
    .addSelect('COUNT(DISTINCT publication.id)', 'publicationCount')
    .addSelect('SUM(publication.viewsCount)', 'totalViews')
    .where('publication.status = :status', { status: PublicationStatus.PUBLISHED })
    .andWhere('publication.createdAt >= :from', { from })
    .groupBy('user.id')
    .having('COUNT(DISTINCT publication.id) > 0')
    .orderBy('SUM(publication.viewsCount)', 'DESC')
    .limit(limit)
    .getRawMany();

  return authors.map(author => ({
    id: author.user_id,
    name: `${author.user_firstName || ''} ${author.user_lastName || ''}`.trim(),
    avatar: null,
    department: author.user_department,
    publicationCount: parseInt(author.publicationCount, 10),
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
    const timeline: Array<{ date: string; publications: number; views: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [publications, views] = await Promise.all([
        this.publicationRepo.count({
          where: {
            createdAt: Between(date, nextDate),
            status: PublicationStatus.PUBLISHED,
          },
        }),
        this.getTotalViewsOnDate(date),
      ]);

      timeline.push({
        date: date.toISOString().split('T')[0],
        publications,
        views,
      });
    }

    return timeline;
  }

  private async getTotalViewsOnDate(date: Date): Promise<number> {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const result = await this.publicationRepo
      .createQueryBuilder('publication')
      .select('SUM(publication.viewsCount)', 'total')
      .where('publication.createdAt BETWEEN :from AND :to', { from: date, to: nextDate })
      .andWhere('publication.status = :status', { status: PublicationStatus.PUBLISHED })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  // ============================================
  // REPORTS STATS (admin only)
  // ============================================

  async getReportsStats() {
    const [
      totalPublicationReports,
      totalUserReports,
      pendingPublicationReports,
      pendingUserReports,
      reviewedPublicationReports,
      reviewedUserReports,
      dismissedPublicationReports,
      dismissedUserReports,
    ] = await Promise.all([
      this.publicationReportRepo.count(),
      this.userReportRepo.count(),
      this.publicationReportRepo.count({ where: { status: 'pending' } }),
      this.userReportRepo.count({ where: { status: 'pending' } }),
      this.publicationReportRepo.count({ where: { status: 'reviewed' } }),
      this.userReportRepo.count({ where: { status: 'reviewed' } }),
      this.publicationReportRepo.count({ where: { status: 'dismissed' } }),
      this.userReportRepo.count({ where: { status: 'dismissed' } }),
    ]);

    // Publication reports by reason
    const publicationReasonRaw = await this.publicationReportRepo
      .createQueryBuilder('r')
      .select('r.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.reason')
      .getRawMany();

    const publicationByReason = publicationReasonRaw.map((row) => ({
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

    // Last 30 days trend for publication reports
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentPublicationReports = await this.publicationReportRepo
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

    // Most reported publications (top 5)
    const topReportedPublications = await this.publicationReportRepo
      .createQueryBuilder('r')
      .leftJoin('r.publication', 'publication')
      .select(['publication.id', 'publication.title'])
      .addSelect('COUNT(r.id)', 'reportCount')
      .groupBy('publication.id')
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
      publications: {
        total: totalPublicationReports,
        pending: pendingPublicationReports,
        reviewed: reviewedPublicationReports,
        dismissed: dismissedPublicationReports,
        byReason: publicationByReason,
        recentTrend: recentPublicationReports.map((r) => ({
          day: new Date(r.day).toISOString().split('T')[0],
          count: parseInt(r.count, 10),
        })),
        topReported: topReportedPublications.map((r) => ({
          id: r.publication_id,
          title: r.publication_title,
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