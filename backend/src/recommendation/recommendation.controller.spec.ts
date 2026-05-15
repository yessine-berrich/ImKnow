import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { AuthGuard } from '../users/guards/auth.guard';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let service: jest.Mocked<RecommendationService>;

  const mockRecommendationService = {
    getRecommendations: jest.fn(),
    getHomepageFeed: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        { provide: RecommendationService, useValue: mockRecommendationService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<RecommendationController>(RecommendationController);
    service = module.get(RecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return wrapped recommendations for current user', async () => {
      const mockPayload = { sub: 1, email: 'user@example.com', role: 'employee' };
      const mockArticles = [{ id: 1, title: 'Recommended Article', viewsCount: 0, likes: [], bookmarks: [], comments: [], tags: [], media: [] }];
      mockRecommendationService.getRecommendations.mockResolvedValue(mockArticles as any);

      const result = await controller.getRecommendations(mockPayload as any, 10) as any;

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data).toBeDefined();
      expect(service.getRecommendations).toHaveBeenCalledWith(1, 10);
    });
  });
});
