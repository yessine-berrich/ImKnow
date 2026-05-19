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
import { Publication } from 'src/publication/entities/publication.entity';

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

    const publications = await this.recommendationService.getRecommendations(userId, safeLimit);

    return {
      success: true,
      count: publications.length,
      data: publications.map((a) => this.formatPublication(a, userId)),
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
      data: result.items.map(({ publication, source }) => ({
        ...this.formatPublication(publication, userId),
        source,
        isTrending:
          source === 'trending' ||
          ((publication.viewsCount ?? 0) > 50 && (publication as any).likes?.length > 5),
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

  // ── Shared publication formatter — matches publication.controller findAll exactly ────

  private formatPublication(publication: Publication, userId: number) {
    const isLiked = publication.likes?.some((like) => like.id === userId) ?? false;
    const isBookmarked = publication.bookmarks?.some((b) => b.id === userId) ?? false;

    return {
      id: publication.id,
      title: publication.title,
      content: publication.content,
      description: publication.content
        ? publication.content.substring(0, 150) + (publication.content.length > 150 ? '...' : '')
        : '',
      status: publication.status,
      viewsCount: publication.viewsCount || 0,
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt,

      author: publication.author
        ? {
            id: publication.author.id,
            name:
              `${publication.author.firstName || ''} ${publication.author.lastName || ''}`.trim() ||
              'User',
            initials:
              (
                (publication.author.firstName?.charAt(0) || '') +
                (publication.author.lastName?.charAt(0) || '')
              ).toUpperCase() || 'U',
            department: publication.author.department || 'Member',
            avatar: publication.author.profileImage,
          }
        : null,

      category: publication.category
        ? {
            id: publication.category.id,
            name: publication.category.name,
            slug: publication.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
          }
        : null,

      tags: publication.tags?.map((tag) => ({ id: tag.id, name: tag.name })).filter((t) => t.id) || [],

      media:
        publication.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],

      stats: {
        likes: publication.likes?.length || 0,
        comments: (publication as any).comments?.length || 0,
        views: publication.viewsCount || 0,
      },

      isLiked,
      isBookmarked,
      isFeatured: (publication.viewsCount || 0) > 1000,
    };
  }
}
