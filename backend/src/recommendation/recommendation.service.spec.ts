import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { Article } from '../article/entities/article.entity';
import { ArticleView } from '../article/entities/article-view.entity';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follow/entities/follow.entity';

describe('RecommendationService', () => {
  let service: RecommendationService;

  const mockArticleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockArticleViewRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockFollowRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getRepositoryToken(Article), useValue: mockArticleRepo },
        { provide: getRepositoryToken(ArticleView), useValue: mockArticleViewRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Follow), useValue: mockFollowRepo },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return recommendations for a user', async () => {
      mockArticleViewRepo.find.mockResolvedValue([]);
      mockFollowRepo.find.mockResolvedValue([]);
      mockArticleRepo.find.mockResolvedValue([
        {
          id: 1,
          title: 'Article 1',
          viewsCount: 100,
          status: 'published',
          author: { id: 2, firstName: 'John', lastName: 'Doe' },
          category: { id: 1, name: 'Tech' },
          tags: [],
          likes: [],
          bookmarks: [],
          comments: [],
          createdAt: new Date(),
        },
      ]);

      const result = await service.getRecommendations(1, 10);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
