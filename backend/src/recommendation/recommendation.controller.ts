import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { RecommendationService, FeedFilter } from './recommendation.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import type { JwtPayloadType } from 'utils/types';
import { CurrentPayload } from 'src/users/decorators/current-payload.decorator';
import { Article } from 'src/article/entities/article.entity';

@Controller('api/recommendations')
@UseGuards(AuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  // ── GET /api/recommendations ─────────────────────────────────────────────────
  @Get()
  async getRecommendations(
    @CurrentPayload() payload: JwtPayloadType,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = payload.sub;
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const articles = await this.recommendationService.getRecommendations(userId, safeLimit);

    return {
      success: true,
      count: articles.length,
      data: articles.map((a) => this.formatArticle(a, userId)),
    };
  }

  // ── GET /api/recommendations/feed ────────────────────────────────────────────
  @Get('feed')
  async getHomepageFeed(
    @CurrentPayload() payload: JwtPayloadType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('filter', new DefaultValuePipe('all')) filter: string,
  ) {
    const userId = payload.sub;
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 30);
    const safeFilter: FeedFilter = (['all', 'following', 'trending'] as const).includes(filter as FeedFilter)
      ? (filter as FeedFilter)
      : 'all';

    const result = await this.recommendationService.getHomepageFeed(
      userId,
      safePage,
      safePageSize,
      safeFilter,
    );

    return {
      success: true,
      data: result.items.map(({ article, source }) => ({
        ...this.formatArticle(article, userId),
        source,
        isTrending:
          source === 'trending' ||
          ((article.viewsCount ?? 0) > 50 && (article as any).likes?.length > 5),
      })),
      meta: {
        page: safePage,
        pageSize: safePageSize,
        hasMore: result.hasMore,
        totalCandidates: result.totalCandidates,
        filter: safeFilter,
      },
    };
  }

  // ── Shared article formatter — matches article.controller findAll exactly ────

  private formatArticle(article: Article, userId: number) {
    const isLiked = article.likes?.some((like) => like.id === userId) ?? false;
    const isBookmarked = article.bookmarks?.some((b) => b.id === userId) ?? false;

    return {
      id: article.id,
      title: article.title,
      content: article.content,
      description: article.content
        ? article.content.substring(0, 150) + (article.content.length > 150 ? '...' : '')
        : '',
      status: article.status,
      viewsCount: article.viewsCount || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,

      author: article.author
        ? {
            id: article.author.id,
            name:
              `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() ||
              'User',
            initials:
              (
                (article.author.firstName?.charAt(0) || '') +
                (article.author.lastName?.charAt(0) || '')
              ).toUpperCase() || 'U',
            department: article.author.department || 'Member',
            avatar: article.author.profileImage,
          }
        : null,

      category: article.category
        ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
          }
        : null,

      tags: article.tags?.map((tag) => ({ id: tag.id, name: tag.name })).filter((t) => t.id) || [],

      media:
        article.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],

      stats: {
        likes: article.likes?.length || 0,
        comments: (article as any).comments?.length || 0,
        views: article.viewsCount || 0,
      },

      isLiked,
      isBookmarked,
      isFeatured: (article.viewsCount || 0) > 1000,
    };
  }
}
