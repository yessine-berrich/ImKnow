import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StatsService } from './stats.service';
import { Publication } from '../publication/entities/publication.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Comment } from '../comment/entities/comment.entity';
import { PublicationReport } from '../publication/entities/publication-report.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { PublicationStatus } from 'utils/constants';

describe('StatsService', () => {
  let service: StatsService;
  let publicationRepo: jest.Mocked<Repository<Publication>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  let tagRepo: jest.Mocked<Repository<Tag>>;
  let commentRepo: jest.Mocked<Repository<Comment>>;

  const mockQBFactory = () => ({
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  });

  const mockPublicationRepo = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQBFactory()),
  };

  const mockUserRepo = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQBFactory()),
  };

  const mockCategoryRepo = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQBFactory()),
  };

  const mockTagRepo = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockCommentRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQBFactory()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Publication),
          useValue: mockPublicationRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepo,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepo,
        },
        {
          provide: getRepositoryToken(PublicationReport),
          useValue: { count: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserReport),
          useValue: { count: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    publicationRepo = module.get(getRepositoryToken(Publication));
    userRepo = module.get(getRepositoryToken(User));
    categoryRepo = module.get(getRepositoryToken(Category));
    tagRepo = module.get(getRepositoryToken(Tag));
    commentRepo = module.get(getRepositoryToken(Comment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPublicationRepo.count.mockResolvedValue(100);
      mockUserRepo.count.mockResolvedValue(50);
      mockCategoryRepo.count.mockResolvedValue(10);
      mockTagRepo.count.mockResolvedValue(25);
      mockCommentRepo.count.mockResolvedValue(200);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '500' }),
      };
      mockPublicationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const mockCategoryQB = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          category_id: 1,
          category_name: 'Tech',
          publicationCount: '50',
        }),
      };
      mockCategoryRepo.createQueryBuilder.mockReturnValue(mockCategoryQB as any);

      const mockAuthorQB = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          author_id: 1,
          author_firstName: 'John',
          author_lastName: 'Doe',
          publicationsCount: '20',
        }),
      };
      mockPublicationRepo.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);
      mockPublicationRepo.createQueryBuilder.mockReturnValueOnce(mockAuthorQB as any);

      const result = await service.getDashboardStats();

      expect(result.totalPublications).toBe(100);
      expect(result.totalUsers).toBe(50);
      expect(result.totalCategories).toBe(10);
      expect(result.totalTags).toBe(25);
      expect(result.totalComments).toBe(200);
    });
  });

  describe('getCategoryStats', () => {
    it('should return category statistics', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Tech',
          description: 'Technology',
          publications: [
            { viewsCount: 100, likes: [{ id: 1 }], comments: [{ id: 1 }] },
            { viewsCount: 200, likes: [{ id: 1 }, { id: 2 }], comments: [] },
          ],
        },
        {
          id: 2,
          name: 'Science',
          description: 'Science publications',
          publications: [
            { viewsCount: 50, likes: [], comments: [{ id: 1 }] },
          ],
        },
      ];

      mockCategoryRepo.find.mockResolvedValue(mockCategories as any);

      const result = await service.getCategoryStats();

      expect(result.categories).toHaveLength(2);
      expect(result.totalPublications).toBe(3);
      expect(result.mostPopularCategory).toBeDefined();
      expect(result.mostPopularCategory?.name).toBe('Tech');
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity for specified months', async () => {
      mockUserRepo.count.mockResolvedValue(5);
      mockPublicationRepo.count.mockResolvedValue(10);
      mockCommentRepo.count.mockResolvedValue(20);

      const mockActiveAuthorsQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ authorId: 1 }, { authorId: 2 }]),
      };

      const mockActiveCommentersQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ authorId: 2 }, { authorId: 3 }]),
      };

      mockPublicationRepo.createQueryBuilder.mockReturnValue(mockActiveAuthorsQB as any);
      mockCommentRepo.createQueryBuilder.mockReturnValue(mockActiveCommentersQB as any);

      const result = await service.getUserActivity(3);

      expect(result.history).toHaveLength(3);
      expect(result.currentMonth).toBeDefined();
      expect(result.previousMonth).toBeDefined();
      expect(result.growthRate).toBeDefined();
    });
  });

  describe('getContentAnalytics', () => {
    it('should return content analytics for specified days', async () => {
      mockPublicationRepo.count.mockResolvedValue(5);

      const result = await service.getContentAnalytics(7);

      expect(result.dailyPublications).toHaveLength(7);
      expect(result.period).toBeDefined();
      expect(result.totalPublished).toBeGreaterThanOrEqual(0);
      expect(result.publicationRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEngagementStats', () => {
    it('should return engagement statistics', async () => {
      const mockPublications = [
        {
          id: 1,
          title: 'Publication 1',
          viewsCount: 100,
          createdAt: new Date(),
          author: { id: 1, firstName: 'John', lastName: 'Doe' },
          category: { name: 'Tech' },
          likes: [{ id: 1 }, { id: 2 }],
          bookmarks: [{ id: 1 }],
        },
        {
          id: 2,
          title: 'Publication 2',
          viewsCount: 50,
          createdAt: new Date(),
          author: { id: 2, firstName: 'Jane', lastName: 'Smith' },
          category: { name: 'Science' },
          likes: [{ id: 3 }],
          bookmarks: [{ id: 2 }, { id: 3 }],
        },
      ];

      mockPublicationRepo.find.mockResolvedValue(mockPublications as any);

      const result = await service.getEngagementStats(10);

      expect(result.mostLikedPublications).toHaveLength(2);
      expect(result.mostBookmarkedPublications).toHaveLength(2);
      expect(result.totalLikes).toBe(3);
      expect(result.totalBookmarks).toBe(3);
      expect(result.avgLikesPerPublication).toBe(2);
      expect(result.avgBookmarksPerPublication).toBe(2);
    });
  });

  describe('getTopContributors', () => {
    it('should return top contributors', async () => {
      const mockPublications = [
        {
          id: 1,
          viewsCount: 100,
          createdAt: new Date(),
          author: { id: 1, firstName: 'John', lastName: 'Doe', department: 'IT' },
          likesCount: 5,
        },
        {
          id: 2,
          viewsCount: 200,
          createdAt: new Date(),
          author: { id: 1, firstName: 'John', lastName: 'Doe', department: 'IT' },
          likesCount: 10,
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPublications),
      };

      mockPublicationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTopContributors(5);

      expect(result.contributors).toBeDefined();
      expect(result.period).toBeDefined();
    });
  });

  describe('getTrendingPublications', () => {
    it('should return trending publications', async () => {
      const mockPublications = [
        {
          id: 1,
          title: 'Trending Publication',
          content: 'Content here',
          viewsCount: 1000,
          createdAt: new Date(),
          author: { id: 1, firstName: 'John', lastName: 'Doe', department: 'IT' },
          category: { name: 'Tech' },
          tags: [{ name: 'nestjs' }],
          likesCount: 50,
          commentsCount: 20,
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPublications),
      };

      mockPublicationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTrendingPublications(5);

      expect(result.publications).toBeDefined();
      expect(result.period).toBeDefined();
    });
  });

  describe('getAuthorPerformance', () => {
    it('should return author performance stats', async () => {
      const mockAuthors = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          department: 'IT',
          publications: [
            {
              id: 1,
              title: 'Publication 1',
              status: PublicationStatus.PUBLISHED,
              viewsCount: 100,
              likes: [{ id: 1 }],
              comments: [{ id: 1 }],
            },
          ],
        },
      ];

      mockUserRepo.find.mockResolvedValue(mockAuthors as any);

      const result = await service.getAuthorPerformance(20);

      expect(result.authors).toBeDefined();
      expect(result.totalAuthors).toBeGreaterThanOrEqual(0);
      expect(result.avgPublicationsPerAuthor).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getContentQuality', () => {
    it('should return content quality stats', async () => {
      const mockPublications = [
        {
          id: 1,
          title: 'Quality Publication',
          content: 'This is a well written publication with good content and structure. '.repeat(20),
          author: { firstName: 'John', lastName: 'Doe' },
          category: { name: 'Tech' },
          tags: [{ name: 'nestjs' }],
          media: [{ id: 1 }],
          moderationScore: 0.1,
        },
      ];

      mockPublicationRepo.find.mockResolvedValue(mockPublications as any);

      const result = await service.getContentQuality(10);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics).toBeDefined();
      expect(result.topQualityPublications).toBeDefined();
      expect(result.needsImprovement).toBeDefined();
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation stats', async () => {
      const mockPublications = [
        {
          id: 1,
          status: PublicationStatus.PUBLISHED,
          createdAt: new Date(),
          isAutoModerated: true,
          moderationResult: { isFlagged: false, categories: [] },
        },
        {
          id: 2,
          status: PublicationStatus.REJECTED,
          createdAt: new Date(),
          isAutoModerated: true,
          moderationResult: { isFlagged: true, categories: ['spam'] },
        },
      ];

      mockPublicationRepo.find.mockResolvedValue(mockPublications as any);

      const result = await service.getModerationStats(30);

      expect(result.totalModerated).toBeGreaterThanOrEqual(0);
      expect(result.statusBreakdown).toBeDefined();
      expect(result.flaggedCategories).toBeDefined();
      expect(result.dailyTrend).toBeDefined();
    });
  });

  describe('getReadingTimeStats', () => {
    it('should return reading time stats', async () => {
      const mockPublications = [
        {
          id: 1,
          title: 'Long Publication',
          content: 'Word '.repeat(1000),
          viewsCount: 100,
          status: PublicationStatus.PUBLISHED,
          author: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 2,
          title: 'Short Publication',
          content: 'Word '.repeat(100),
          viewsCount: 50,
          status: PublicationStatus.PUBLISHED,
          author: { firstName: 'Jane', lastName: 'Smith' },
        },
      ];

      mockPublicationRepo.find.mockResolvedValue(mockPublications as any);

      const result = await service.getReadingTimeStats();

      expect(result.ranges).toBeDefined();
      expect(result.avgWordCount).toBeGreaterThanOrEqual(0);
      expect(result.avgReadTime).toBeGreaterThanOrEqual(0);
      expect(result.longestPublications).toBeDefined();
      expect(result.shortestPublications).toBeDefined();
    });
  });

  describe('getTagPerformance', () => {
    it('should return tag performance stats', async () => {
      const mockTags = [
        {
          id: 1,
          name: 'nestjs',
          publications: [
            {
              id: 1,
              viewsCount: 100,
              likes: [{ id: 1 }],
              createdAt: new Date(),
            },
          ],
        },
        {
          id: 2,
          name: 'typescript',
          publications: [],
        },
      ];

      mockTagRepo.find.mockResolvedValue(mockTags as any);

      const result = await service.getTagPerformance();

      expect(result.tags).toBeDefined();
      expect(result.totalTags).toBeGreaterThanOrEqual(0);
      expect(result.topTrending).toBeDefined();
      expect(result.mostUsed).toBeDefined();
      expect(result.unusedTags).toBeGreaterThanOrEqual(0);
    });
  });
});
