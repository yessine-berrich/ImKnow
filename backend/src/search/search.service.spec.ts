import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SearchService } from './search.service';
import { Publication } from '../publication/entities/publication.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { PublicationStatus } from 'utils/constants';

describe('SearchService', () => {
  let service: SearchService;

  // ── Fixture data ─────────────────────────────────────────────────────────

  const MOCK_EMBEDDING = new Array(768).fill(0.1);

  const mockPublicationRow = {
    id: 1,
    title: 'NestJS Deep Dive',
    content: 'Short content',
    viewsCount: 42,
    createdAt: new Date(),
    similarity: '0.8700',
    author: { id: 1, firstName: 'Jane', lastName: 'Doe', profileImage: null },
    category: { id: 1, name: 'Tech' },
    tags: [{ id: 1, name: 'nestjs' }],
    media: [],
    likesCount: 5,
  };

  const mockPublicationEntity = {
    id: 1,
    title: 'NestJS Deep Dive',
    content: 'Short content',
    viewsCount: 42,
    createdAt: new Date(),
    status: PublicationStatus.PUBLISHED,
    author: { id: 1, firstName: 'Jane', lastName: 'Doe', profileImage: null },
    category: { id: 1, name: 'Tech' },
    tags: [{ id: 1, name: 'nestjs' }],
    media: [],
    likes: [{ id: 1 }, { id: 2 }],
  };

  const mockCategoryEntity = {
    id: 1,
    name: 'Technology',
    description: 'Tech publications',
    publications: [{ id: 1 }, { id: 2 }, { id: 3 }],
  };

  const mockTagEntity = {
    id: 1,
    name: 'nestjs',
    publications: [{ id: 1 }, { id: 2 }],
  };

  const mockUserEntity = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    profileImage: null,
    bio: 'Developer',
    department: 'Engineering',
    country: 'France',
    createdAt: new Date(),
  };

  // ── Repository mocks ──────────────────────────────────────────────────────

  const mockPublicationRepo = {
    find: jest.fn(),
    query: jest.fn(),
  };

  const makeCategoryQB = (results: any[]) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  });

  const makeTagQB = (results: any[]) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  });

  const mockCategoryRepo = { createQueryBuilder: jest.fn() };
  const mockTagRepo     = { createQueryBuilder: jest.fn() };
  const mockUserRepo    = { find: jest.fn() };
  const mockHttpService = { post: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Publication),  useValue: mockPublicationRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Tag),      useValue: mockTagRepo },
        { provide: getRepositoryToken(User),     useValue: mockUserRepo },
        { provide: HttpService,                  useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  // ═══════════════════════════════════════════════════════════════
  // generateEmbedding
  // ═══════════════════════════════════════════════════════════════

  describe('generateEmbedding', () => {
    it('should return null for empty string', async () => {
      expect(await service.generateEmbedding('')).toBeNull();
    });

    it('should return null for whitespace-only string', async () => {
      expect(await service.generateEmbedding('   ')).toBeNull();
    });

    it('should return 768-dimension embedding on success', async () => {
      mockHttpService.post.mockReturnValue(
        of({ data: { embeddings: [MOCK_EMBEDDING] } }),
      );

      const result = await service.generateEmbedding('test text');

      expect(result).toHaveLength(768);
      expect(result).toEqual(MOCK_EMBEDDING);
    });

    it('should return null when response has wrong dimension', async () => {
      const shortEmbedding = new Array(512).fill(0.1);
      mockHttpService.post.mockReturnValue(
        of({ data: { embeddings: [shortEmbedding] } }),
      );

      const result = await service.generateEmbedding('test text');

      expect(result).toBeNull();
    });

    it('should return null when embeddings array is missing', async () => {
      mockHttpService.post.mockReturnValue(
        of({ data: {} }),
      );

      const result = await service.generateEmbedding('test text');

      expect(result).toBeNull();
    });

    it('should return null when HTTP call throws', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.generateEmbedding('test text');

      expect(result).toBeNull();
    });

    it('should call Ollama embed endpoint with correct model', async () => {
      mockHttpService.post.mockReturnValue(
        of({ data: { embeddings: [MOCK_EMBEDDING] } }),
      );

      await service.generateEmbedding('hello world');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/embed',
        { model: 'nomic-embed-text', input: 'search_document: hello world' },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // semanticSearch
  // ═══════════════════════════════════════════════════════════════

  describe('semanticSearch', () => {
    it('should return empty array for empty query', async () => {
      expect(await service.semanticSearch('')).toEqual([]);
    });

    it('should return empty array for whitespace query', async () => {
      expect(await service.semanticSearch('  ')).toEqual([]);
    });

    it('should return empty array when embedding fails', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);

      expect(await service.semanticSearch('test')).toEqual([]);
    });

    it('should query the database and return results', async () => {
      const mockResults = [
        { id: 1, title: 'Publication 1', content_preview: 'Preview…', similarity: 0.85 },
      ];
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue(mockResults);

      const result = await service.semanticSearch('nestjs testing');

      expect(result).toEqual(mockResults);
      expect(mockPublicationRepo.query).toHaveBeenCalled();
    });

    it('should pass the correct status filter to the query', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([]);

      await service.semanticSearch('query', 5, 0.72, PublicationStatus.DRAFT);

      expect(mockPublicationRepo.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([PublicationStatus.DRAFT]),
      );
    });

    it('should return empty array when db query returns nothing', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([]);

      expect(await service.semanticSearch('obscure topic')).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchPublicationsOnly — semantic path
  // ═══════════════════════════════════════════════════════════════

  describe('searchPublicationsOnly (semantic path)', () => {
    it('should return mapped publications when semantic search succeeds', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([mockPublicationRow]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('NestJS Deep Dive');
      expect(result[0].similarity).toBe(0.87);
      expect(result[0].author).toEqual({ id: 1, firstName: 'Jane', lastName: 'Doe', profileImage: null });
      expect(result[0].tags).toEqual([{ id: 1, name: 'nestjs' }]);
    });

    it('should truncate content preview to 200 chars', async () => {
      const longContent = 'A'.repeat(300);
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([{ ...mockPublicationRow, content: longContent }]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(result[0].contentPreview).toHaveLength(203); // 200 + '...'
      expect(result[0].contentPreview.endsWith('...')).toBe(true);
    });

    it('should not append ellipsis for short content', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([{ ...mockPublicationRow, content: 'Short' }]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(result[0].contentPreview).toBe('Short');
    });

    it('should include media array from semantic row', async () => {
      const mockMedia = [{ id: 1, url: '/img.png', filename: 'img.png', mimetype: 'image/png', type: 'IMAGE', size: 1024 }];
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([{ ...mockPublicationRow, media: mockMedia }]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(result[0].media).toEqual(mockMedia);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchPublicationsOnly — text fallback path
  // ═══════════════════════════════════════════════════════════════

  describe('searchPublicationsOnly (text fallback)', () => {
    it('should fall back to text search when embedding fails', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([mockPublicationEntity]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(result).toHaveLength(1);
      expect(mockPublicationRepo.find).toHaveBeenCalled();
    });

    it('should fall back to text search when semantic returns empty', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([]); // no semantic results

      mockPublicationRepo.find.mockResolvedValue([mockPublicationEntity]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(mockPublicationRepo.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should fall back to text search when semantic query throws', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockRejectedValue(new Error('pgvector not available'));
      mockPublicationRepo.find.mockResolvedValue([mockPublicationEntity]);

      const result = await service.searchPublicationsOnly('nestjs', 5, 0.65);

      expect(mockPublicationRepo.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should map text search results correctly', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([mockPublicationEntity]);

      const result = await service.searchPublicationsOnly('nestjs', 10, 0.65);

      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('NestJS Deep Dive');
      expect(result[0].likesCount).toBe(2); // 2 likes
      expect(result[0].category).toEqual({ id: 1, name: 'Tech' });
      expect(result[0].tags).toEqual([{ id: 1, name: 'nestjs' }]);
    });

    it('should handle publication with no category in text search', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([{ ...mockPublicationEntity, category: null }]);

      const result = await service.searchPublicationsOnly('nestjs', 10, 0.65);

      expect(result[0].category).toBeNull();
    });

    it('should handle publication with no tags in text search', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([{ ...mockPublicationEntity, tags: null }]);

      const result = await service.searchPublicationsOnly('nestjs', 10, 0.65);

      expect(result[0].tags).toEqual([]);
    });

    it('should truncate long content in text search to 200 chars', async () => {
      const longContent = 'B'.repeat(300);
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([{ ...mockPublicationEntity, content: longContent }]);

      const result = await service.searchPublicationsOnly('nestjs', 10, 0.65);

      expect(result[0].contentPreview.endsWith('...')).toBe(true);
      expect(result[0].contentPreview).toHaveLength(203);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchCategoriesOnly
  // ═══════════════════════════════════════════════════════════════

  describe('searchCategoriesOnly', () => {
    it('should return categories sorted by publication count descending', async () => {
      const cats = [
        { id: 1, name: 'Tech', description: 'Tech', publications: [{}] },
        { id: 2, name: 'Science', description: 'Science', publications: [{}, {}, {}] },
      ];
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB(cats));

      const result = await service.searchCategoriesOnly('tech', 10);

      expect(result[0].name).toBe('Science');
      expect(result[0].publicationsCount).toBe(3);
      expect(result[1].publicationsCount).toBe(1);
    });

    it('should return empty array when no categories match', async () => {
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB([]));

      const result = await service.searchCategoriesOnly('zzz', 10);

      expect(result).toEqual([]);
    });

    it('should respect the limit', async () => {
      const cats = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Cat ${i}`,
        description: null,
        publications: Array(i),
      }));
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB(cats));

      const result = await service.searchCategoriesOnly('cat', 3);

      expect(result).toHaveLength(3);
    });

    it('should handle category with no publications', async () => {
      mockCategoryRepo.createQueryBuilder.mockReturnValue(
        makeCategoryQB([{ id: 1, name: 'Empty', description: null, publications: null }]),
      );

      const result = await service.searchCategoriesOnly('empty', 10);

      expect(result[0].publicationsCount).toBe(0);
    });

    it('should search by case-insensitive pattern', async () => {
      const qb = makeCategoryQB([mockCategoryEntity]);
      mockCategoryRepo.createQueryBuilder.mockReturnValue(qb);

      await service.searchCategoriesOnly('TECH', 10);

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('LOWER'),
        expect.objectContaining({ pattern: '%TECH%' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchTagsOnly
  // ═══════════════════════════════════════════════════════════════

  describe('searchTagsOnly', () => {
    it('should return tags sorted by publication count descending', async () => {
      const tags = [
        { id: 1, name: 'nestjs', publications: [{}] },
        { id: 2, name: 'nodejs', publications: [{}, {}, {}] },
      ];
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB(tags));

      const result = await service.searchTagsOnly('node', 10);

      expect(result[0].name).toBe('nodejs');
      expect(result[0].publicationsCount).toBe(3);
    });

    it('should return empty array when no tags match', async () => {
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB([]));

      const result = await service.searchTagsOnly('zzz', 10);

      expect(result).toEqual([]);
    });

    it('should respect the limit', async () => {
      const tags = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `tag${i}`,
        publications: Array(i),
      }));
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB(tags));

      const result = await service.searchTagsOnly('tag', 4);

      expect(result).toHaveLength(4);
    });

    it('should handle tag with null publications', async () => {
      mockTagRepo.createQueryBuilder.mockReturnValue(
        makeTagQB([{ id: 1, name: 'empty-tag', publications: null }]),
      );

      const result = await service.searchTagsOnly('empty', 10);

      expect(result[0].publicationsCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchUsersOnly
  // ═══════════════════════════════════════════════════════════════

  describe('searchUsersOnly', () => {
    it('should return mapped user results', async () => {
      mockUserRepo.find.mockResolvedValue([mockUserEntity]);

      const result = await service.searchUsersOnly('john', 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].firstName).toBe('John');
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].country).toBe('France');
    });

    it('should return empty array when no users match', async () => {
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.searchUsersOnly('zzz', 10);

      expect(result).toEqual([]);
    });

    it('should map null fields correctly', async () => {
      mockUserRepo.find.mockResolvedValue([
        { ...mockUserEntity, profileImage: undefined, bio: undefined, department: undefined, country: undefined },
      ]);

      const result = await service.searchUsersOnly('john', 10);

      expect(result[0].profileImage).toBeNull();
      expect(result[0].bio).toBeNull();
      expect(result[0].department).toBeNull();
      expect(result[0].country).toBeNull();
    });

    it('should pass ILike patterns for multiple fields', async () => {
      mockUserRepo.find.mockResolvedValue([]);

      await service.searchUsersOnly('Alice', 5);

      expect(mockUserRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // globalSearch
  // ═══════════════════════════════════════════════════════════════

  describe('globalSearch', () => {
    it('should aggregate results from all entity types', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(MOCK_EMBEDDING);
      mockPublicationRepo.query.mockResolvedValue([mockPublicationRow]);
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB([mockCategoryEntity]));
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB([mockTagEntity]));
      mockUserRepo.find.mockResolvedValue([mockUserEntity]);

      const result = await service.globalSearch('nestjs', 5, 0.65);

      expect(result.query).toBe('nestjs');
      expect(result.publications).toHaveLength(1);
      expect(result.categories).toHaveLength(1);
      expect(result.tags).toHaveLength(1);
      expect(result.users).toHaveLength(1);
      expect(result.totalResults).toBe(4);
    });

    it('should trim the query before searching', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([]);
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB([]));
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB([]));
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.globalSearch('  nestjs  ', 5, 0.65);

      expect(result.query).toBe('nestjs');
    });

    it('should return totalResults = 0 when nothing matches', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([]);
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB([]));
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB([]));
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.globalSearch('zzz', 5, 0.65);

      expect(result.totalResults).toBe(0);
      expect(result.publications).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.users).toEqual([]);
    });

    it('should use text fallback when embedding unavailable', async () => {
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(null);
      mockPublicationRepo.find.mockResolvedValue([mockPublicationEntity]);
      mockCategoryRepo.createQueryBuilder.mockReturnValue(makeCategoryQB([]));
      mockTagRepo.createQueryBuilder.mockReturnValue(makeTagQB([]));
      mockUserRepo.find.mockResolvedValue([]);

      const result = await service.globalSearch('nestjs', 5, 0.65);

      expect(result.publications).toHaveLength(1);
      expect(mockPublicationRepo.find).toHaveBeenCalled();
    });

    it('should run all 4 searches concurrently (Promise.all)', async () => {
      const calls: string[] = [];
      jest.spyOn(service, 'generateEmbedding').mockImplementation(async () => {
        calls.push('embedding');
        return null;
      });
      mockPublicationRepo.find.mockImplementation(async () => { calls.push('publications'); return []; });
      mockCategoryRepo.createQueryBuilder.mockImplementation(() => {
        calls.push('categories');
        return makeCategoryQB([]);
      });
      mockTagRepo.createQueryBuilder.mockImplementation(() => {
        calls.push('tags');
        return makeTagQB([]);
      });
      mockUserRepo.find.mockImplementation(async () => { calls.push('users'); return []; });

      await service.globalSearch('test', 5, 0.65);

      // All 4 sub-searches were initiated
      expect(calls).toContain('publications');
      expect(calls).toContain('categories');
      expect(calls).toContain('tags');
      expect(calls).toContain('users');
    });
  });
});
