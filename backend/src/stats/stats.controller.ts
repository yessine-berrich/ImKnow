// src/stats/stats.controller.ts
import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { TopContributorsResponseDto } from './dto/top-contributor.dto';
import { TrendingPublicationsResponseDto } from './dto/trending-publication.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { CategoryStatsResponseDto } from './dto/category-stats.dto';
import { UserActivityResponseDto } from './dto/user-activity.dto';
import { ContentAnalyticsResponseDto } from './dto/content-analytics.dto';
import { EngagementStatsResponseDto } from './dto/engagement-stats.dto';
import { AuthorPerformanceResponseDto } from './dto/author-performance.dto';
import { ContentQualityResponseDto } from './dto/content-quality.dto';
import { ModerationStatsResponseDto } from './dto/moderation-stats.dto';
import { ReadingTimeResponseDto } from './dto/reading-time.dto';
import { TagStatsResponseDto } from './dto/tag-performance.dto';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';
import { userRole } from 'utils/constants';
import { Roles } from 'src/users/decorators/user-role.decorator';

@Controller('api/stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * GET /api/stats/top-contributors?limit=5
   * Accessible à tous les utilisateurs authentifiés
   */
  @Get('top-contributors')
  getTopContributors(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<TopContributorsResponseDto> {
    return this.statsService.getTopContributors(limit);
  }

  /**
   * GET /api/stats/trending-publications?limit=5
   * Accessible à tous les utilisateurs authentifiés
   */
  @Get('trending-publications')
  getTrendingPublications(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<TrendingPublicationsResponseDto> {
    return this.statsService.getTrendingPublications(limit);
  }

  /**
   * GET /api/stats/dashboard
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('dashboard')
  @Roles(userRole.ADMIN)
  getDashboardStats(): Promise<DashboardStatsDto> {
    return this.statsService.getDashboardStats();
  }

  /**
   * GET /api/stats/categories
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('categories')
  @Roles(userRole.ADMIN)
  getCategoryStats(): Promise<CategoryStatsResponseDto> {
    return this.statsService.getCategoryStats();
  }

  /**
   * GET /api/stats/user-activity?months=6
   * Accessible uniquement aux ADMIN
   */
  @Get('user-activity')
  @Roles(userRole.ADMIN)
  getUserActivity(
    @Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number,
  ): Promise<UserActivityResponseDto> {
    return this.statsService.getUserActivity(months);
  }

  /**
   * GET /api/stats/content-analytics?days=30
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('content-analytics')
  @Roles(userRole.ADMIN)
  getContentAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<ContentAnalyticsResponseDto> {
    return this.statsService.getContentAnalytics(days);
  }

  /**
   * GET /api/stats/engagement?limit=10
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('engagement')
  @Roles(userRole.ADMIN)
  getEngagementStats(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<EngagementStatsResponseDto> {
    return this.statsService.getEngagementStats(limit);
  }

  /**
   * GET /api/stats/authors?limit=20
   * Accessible uniquement aux ADMIN
   */
  @Get('authors')
  @Roles(userRole.ADMIN)
  getAuthorPerformance(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<AuthorPerformanceResponseDto> {
    return this.statsService.getAuthorPerformance(limit);
  }

  /**
   * GET /api/stats/quality?limit=10
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('quality')
  @Roles(userRole.ADMIN)
  getContentQuality(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ContentQualityResponseDto> {
    return this.statsService.getContentQuality(limit);
  }

  /**
   * GET /api/stats/moderation?days=30
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('moderation')
  @Roles(userRole.ADMIN)
  getModerationStats(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<ModerationStatsResponseDto> {
    return this.statsService.getModerationStats(days);
  }

  /**
   * GET /api/stats/reading-time
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('reading-time')
  @Roles(userRole.ADMIN)
  getReadingTimeStats(): Promise<ReadingTimeResponseDto> {
    return this.statsService.getReadingTimeStats();
  }

  /**
   * GET /api/stats/tags
   * Accessible uniquement aux ADMIN et MODERATOR
   */
  @Get('tags')
  @Roles(userRole.ADMIN)
  getTagPerformance(): Promise<TagStatsResponseDto> {
    return this.statsService.getTagPerformance();
  }

  /**
   * GET /api/stats/employee/trending
   * Page tendances pour les employés - accessible à tous
   */
  @Get('employee/trending')
  getEmployeeTrendingStats() {
    return this.statsService.getEmployeeTrendingStats();
  }

  /**
   * GET /api/stats/employee/popular-publications?limit=10&period=week
   */
  @Get('employee/popular-publications')
  getPopularPublicationsForEmployees(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('period', new DefaultValuePipe('week')) period: 'week' | 'month' | 'year',
  ) {
    return this.statsService.getPopularPublicationsForEmployees(limit, period);
  }

  /**
   * GET /api/stats/employee/trending-tags?limit=10
   */
  @Get('employee/trending-tags')
  getTrendingTagsForEmployees(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.statsService.getTrendingTagsForEmployees(limit);
  }

  /**
   * GET /api/stats/employee/top-authors?limit=10&period=month
   */
  @Get('employee/top-authors')
  getTopAuthorsForEmployees(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('period', new DefaultValuePipe('month')) period: 'week' | 'month' | 'year',
  ) {
    return this.statsService.getTopAuthorsForEmployees(limit, period);
  }

  /**
   * GET /api/stats/employee/activity-timeline?days=30
   */
  @Get('employee/activity-timeline')
  getActivityTimelineForEmployees(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.statsService.getActivityTimelineForEmployees(days);
  }

  /**
   * GET /api/stats/reports
   * Accessible uniquement aux ADMIN
   */
  @Get('reports')
  @Roles(userRole.ADMIN)
  getReportsStats() {
    return this.statsService.getReportsStats();
  }
}