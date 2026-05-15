import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AuthGuard } from '../users/guards/auth.guard';
import { ArticleStatus } from 'utils/constants';

describe('SearchController', () => {
  let controller: SearchController;
  let service: jest.Mocked<SearchService>;

  // ── Fixture data ─────────────────────────────────────────────────────────

  const mockArticle = {
    id: 1,
    title: 'NestJS Deep Dive',
    contentPreview: 'Content preview...',
    author: { id: 1, firstName: 'Jane', lastName: 'Doe', profileImage: null },
    category: { id: 1, name: 'Tech' },
    tags: [{ id: 1, name: 'nestjs' }],
    media: [],
    viewsCount: 42,
    likesCount: 5,
    similarity: 0.87,
    createdAt: new Date(),
  };

  const mockCategory = { id: 1, name: 'Technology', description: 'Tech', articlesCount: 10 };
  const mockTag      = { id: 1, name: 'nestjs', articlesCount: 7 };
  const mockUser     = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com',
                         profileImage: null, bio: null, department: null, country: null };

  const mockGlobalResult = {
    query: 'nestjs',
    articles: [mockArticle],
    categories: [mockCategory],
    tags: [mockTag],
    users: [mockUser],
    totalResults: 4,
  };

  const mockService = {
    globalSearch:         jest.fn(),
    searchArticlesOnly:   jest.fn(),
    searchCategoriesOnly: jest.fn(),
    searchTagsOnly:       jest.fn(),
    searchUsersOnly:      jest.fn(),
    generateEmbedding:    jest.fn(),
    semanticSearch:       jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SearchController>(SearchController);
    service    = module.get(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  // ═══════════════════════════════════════════════════════════════
  // globalSearch
  // ═══════════════════════════════════════════════════════════════

  describe('globalSearch', () => {
    it('should return combined results from all entity types', async () => {
      mockService.globalSearch.mockResolvedValue(mockGlobalResult);

      const result = await controller.globalSearch({ query: 'nestjs' } as any);

      expect(result).toEqual(mockGlobalResult);
      expect(mockService.globalSearch).toHaveBeenCalledWith('nestjs', 5, 0.65);
    });

    it('should forward custom limitPerType and minSimilarity', async () => {
      mockService.globalSearch.mockResolvedValue(mockGlobalResult);

      await controller.globalSearch({
        query: 'nestjs',
        limitPerType: 3,
        minSimilarity: 0.75,
      } as any);

      expect(mockService.globalSearch).toHaveBeenCalledWith('nestjs', 3, 0.75);
    });

    it('should default limitPerType to 5 and minSimilarity to 0.65 when not provided', async () => {
      mockService.globalSearch.mockResolvedValue(mockGlobalResult);

      await controller.globalSearch({ query: 'nestjs' } as any);

      expect(mockService.globalSearch).toHaveBeenCalledWith('nestjs', 5, 0.65);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchArticles
  // ═══════════════════════════════════════════════════════════════

  describe('searchArticles', () => {
    it('should return articles wrapped in { query, articles }', async () => {
      mockService.searchArticlesOnly.mockResolvedValue([mockArticle]);

      const result = await controller.searchArticles({ query: 'nestjs' } as any);

      expect(result.query).toBe('nestjs');
      expect(result.articles).toEqual([mockArticle]);
      expect(mockService.searchArticlesOnly).toHaveBeenCalledWith('nestjs', 10, 0.65);
    });

    it('should forward custom limit and minSimilarity', async () => {
      mockService.searchArticlesOnly.mockResolvedValue([]);

      await controller.searchArticles({ query: 'test', limit: 20, minSimilarity: 0.8 } as any);

      expect(mockService.searchArticlesOnly).toHaveBeenCalledWith('test', 20, 0.8);
    });

    it('should return empty articles array when service returns nothing', async () => {
      mockService.searchArticlesOnly.mockResolvedValue([]);

      const result = await controller.searchArticles({ query: 'zzz' } as any);

      expect(result.articles).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchCategories
  // ═══════════════════════════════════════════════════════════════

  describe('searchCategories', () => {
    it('should return categories wrapped in { query, categories }', async () => {
      mockService.searchCategoriesOnly.mockResolvedValue([mockCategory]);

      const result = await controller.searchCategories({ query: 'tech' } as any);

      expect(result.query).toBe('tech');
      expect(result.categories).toEqual([mockCategory]);
      expect(mockService.searchCategoriesOnly).toHaveBeenCalledWith('tech', 10);
    });

    it('should forward custom limit', async () => {
      mockService.searchCategoriesOnly.mockResolvedValue([]);

      await controller.searchCategories({ query: 'tech', limit: 5 } as any);

      expect(mockService.searchCategoriesOnly).toHaveBeenCalledWith('tech', 5);
    });

    it('should return empty categories when no match', async () => {
      mockService.searchCategoriesOnly.mockResolvedValue([]);

      const result = await controller.searchCategories({ query: 'zzz' } as any);

      expect(result.categories).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchTags
  // ═══════════════════════════════════════════════════════════════

  describe('searchTags', () => {
    it('should return tags wrapped in { query, tags }', async () => {
      mockService.searchTagsOnly.mockResolvedValue([mockTag]);

      const result = await controller.searchTags({ query: 'nestjs' } as any);

      expect(result.query).toBe('nestjs');
      expect(result.tags).toEqual([mockTag]);
      expect(mockService.searchTagsOnly).toHaveBeenCalledWith('nestjs', 10);
    });

    it('should forward custom limit', async () => {
      mockService.searchTagsOnly.mockResolvedValue([]);

      await controller.searchTags({ query: 'node', limit: 3 } as any);

      expect(mockService.searchTagsOnly).toHaveBeenCalledWith('node', 3);
    });

    it('should return empty tags when no match', async () => {
      mockService.searchTagsOnly.mockResolvedValue([]);

      const result = await controller.searchTags({ query: 'zzz' } as any);

      expect(result.tags).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchUsers
  // ═══════════════════════════════════════════════════════════════

  describe('searchUsers', () => {
    it('should return users wrapped in { query, users }', async () => {
      mockService.searchUsersOnly.mockResolvedValue([mockUser]);

      const result = await controller.searchUsers({ query: 'john' } as any);

      expect(result.query).toBe('john');
      expect(result.users).toEqual([mockUser]);
      expect(mockService.searchUsersOnly).toHaveBeenCalledWith('john', 10);
    });

    it('should forward custom limit', async () => {
      mockService.searchUsersOnly.mockResolvedValue([]);

      await controller.searchUsers({ query: 'alice', limit: 7 } as any);

      expect(mockService.searchUsersOnly).toHaveBeenCalledWith('alice', 7);
    });

    it('should return empty users when no match', async () => {
      mockService.searchUsersOnly.mockResolvedValue([]);

      const result = await controller.searchUsers({ query: 'zzz' } as any);

      expect(result.users).toEqual([]);
    });
  });
});
