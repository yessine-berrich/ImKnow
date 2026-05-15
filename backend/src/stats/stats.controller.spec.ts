import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AuthGuard } from '../users/guards/auth.guard';

describe('StatsController', () => {
  let controller: StatsController;
  let service: jest.Mocked<StatsService>;

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  const mockStatsService = {
    getTopContributors: jest.fn(),
    getTrendingArticles: jest.fn(),
    getDashboardStats: jest.fn(),
    getCategoryStats: jest.fn(),
    getUserActivity: jest.fn(),
    getContentAnalytics: jest.fn(),
    getEngagementStats: jest.fn(),
    getAuthorPerformance: jest.fn(),
    getContentQuality: jest.fn(),
    getModerationStats: jest.fn(),
    getReadingTimeStats: jest.fn(),
    getTagPerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: StatsService, useValue: mockStatsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get(StatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTopContributors', () => {
    it('should return top contributors', async () => {
      const mockResult = {
        period: { from: '2024-01-01', to: '2024-01-07' },
        contributors: [],
      };
      service.getTopContributors.mockResolvedValue(mockResult);

      const result = await controller.getTopContributors(5);

      expect(result).toEqual(mockResult);
      expect(service.getTopContributors).toHaveBeenCalledWith(5);
    });
  });

  describe('getTrendingArticles', () => {
    it('should return trending articles', async () => {
      const mockResult = {
        period: { from: '2024-01-01', to: '2024-01-07' },
        articles: [],
      };
      service.getTrendingArticles.mockResolvedValue(mockResult);

      const result = await controller.getTrendingArticles(5);

      expect(result).toEqual(mockResult);
      expect(service.getTrendingArticles).toHaveBeenCalledWith(5);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      const mockResult = {
        totalArticles: 100,
        totalUsers: 50,
        totalCategories: 10,
        totalTags: 25,
        totalComments: 200,
        totalLikes: 500,
        articlesThisWeek: 10,
        articlesThisMonth: 30,
        newUsersThisMonth: 5,
        mostActiveCategory: null,
        topContributor: null,
      };
      service.getDashboardStats.mockResolvedValue(mockResult);

      const result = await controller.getDashboardStats();

      expect(result).toEqual(mockResult);
      expect(service.getDashboardStats).toHaveBeenCalled();
    });
  });

  describe('getCategoryStats', () => {
    it('should return category stats', async () => {
      const mockResult = {
        categories: [],
        totalArticles: 100,
        mostPopularCategory: null,
      };
      service.getCategoryStats.mockResolvedValue(mockResult);

      const result = await controller.getCategoryStats();

      expect(result).toEqual(mockResult);
      expect(service.getCategoryStats).toHaveBeenCalled();
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity', async () => {
      const mockResult = {
        currentMonth: {
          month: 'Jan 2024',
          newUsers: 5,
          activeUsers: 20,
          articlesPublished: 10,
          commentsMade: 30,
        },
        previousMonth: {
          month: 'Dec 2023',
          newUsers: 3,
          activeUsers: 15,
          articlesPublished: 8,
          commentsMade: 20,
        },
        growthRate: {
          newUsers: 67,
          activeUsers: 33,
          articlesPublished: 25,
        },
        history: [],
      };
      service.getUserActivity.mockResolvedValue(mockResult);

      const result = await controller.getUserActivity(6);

      expect(result).toEqual(mockResult);
      expect(service.getUserActivity).toHaveBeenCalledWith(6);
    });
  });

  describe('getContentAnalytics', () => {
    it('should return content analytics', async () => {
      const mockResult = {
        dailyPublications: [],
        period: { from: '2024-01-01', to: '2024-01-30' },
        totalPublished: 50,
        totalDraft: 10,
        totalPending: 5,
        totalRejected: 2,
        publicationRate: 80,
        avgTimeToPublish: null,
      };
      service.getContentAnalytics.mockResolvedValue(mockResult);

      const result = await controller.getContentAnalytics(30);

      expect(result).toEqual(mockResult);
      expect(service.getContentAnalytics).toHaveBeenCalledWith(30);
    });
  });

  describe('getEngagementStats', () => {
    it('should return engagement stats', async () => {
      const mockResult = {
        mostLikedArticles: [],
        mostBookmarkedArticles: [],
        totalLikes: 100,
        totalBookmarks: 50,
        avgLikesPerArticle: 5,
        avgBookmarksPerArticle: 2,
      };
      service.getEngagementStats.mockResolvedValue(mockResult);

      const result = await controller.getEngagementStats(10);

      expect(result).toEqual(mockResult);
      expect(service.getEngagementStats).toHaveBeenCalledWith(10);
    });
  });

  describe('getAuthorPerformance', () => {
    it('should return author performance stats', async () => {
      const mockResult = {
        authors: [],
        totalAuthors: 10,
        topAuthor: null,
        avgArticlesPerAuthor: 5,
      };
      service.getAuthorPerformance.mockResolvedValue(mockResult);

      const result = await controller.getAuthorPerformance(20);

      expect(result).toEqual(mockResult);
      expect(service.getAuthorPerformance).toHaveBeenCalledWith(20);
    });
  });

  describe('getContentQuality', () => {
    it('should return content quality stats', async () => {
      const mockResult = {
        overallScore: 75,
        metrics: [],
        topQualityArticles: [],
        needsImprovement: [],
        avgWordCount: 500,
        articlesWithImages: 80,
        articlesWithTags: 90,
      };
      service.getContentQuality.mockResolvedValue(mockResult);

      const result = await controller.getContentQuality(10);

      expect(result).toEqual(mockResult);
      expect(service.getContentQuality).toHaveBeenCalledWith(10);
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation stats', async () => {
      const mockResult = {
        totalModerated: 100,
        statusBreakdown: [],
        flaggedCategories: [],
        dailyTrend: [],
        avgModerationTime: null,
        rejectionRate: 10,
        autoModerationRate: 85,
      };
      service.getModerationStats.mockResolvedValue(mockResult);

      const result = await controller.getModerationStats(30);

      expect(result).toEqual(mockResult);
      expect(service.getModerationStats).toHaveBeenCalledWith(30);
    });
  });

  describe('getReadingTimeStats', () => {
    it('should return reading time stats', async () => {
      const mockResult = {
        ranges: [],
        avgWordCount: 600,
        avgReadTime: 3,
        longestArticles: [],
        shortestArticles: [],
        optimalLength: null,
      };
      service.getReadingTimeStats.mockResolvedValue(mockResult);

      const result = await controller.getReadingTimeStats();

      expect(result).toEqual(mockResult);
      expect(service.getReadingTimeStats).toHaveBeenCalled();
    });
  });

  describe('getTagPerformance', () => {
    it('should return tag performance stats', async () => {
      const mockResult = {
        tags: [],
        totalTags: 25,
        topTrending: [],
        mostUsed: [],
        unusedTags: 5,
      };
      service.getTagPerformance.mockResolvedValue(mockResult);

      const result = await controller.getTagPerformance();

      expect(result).toEqual(mockResult);
      expect(service.getTagPerformance).toHaveBeenCalled();
    });
  });
});
