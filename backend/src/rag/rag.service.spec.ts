import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { ArticleService } from '../article/article.service';
import { GroqRagService } from './groq-rag.service';

describe('RagService', () => {
  let service: RagService;
  let articleService: jest.Mocked<ArticleService>;
  let groqRagService: jest.Mocked<GroqRagService>;

  const mockArticleService = {
    semanticSearch: jest.fn(),
  };

  const mockGroqRagService = {
    generateRAGResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: ArticleService, useValue: mockArticleService },
        { provide: GroqRagService, useValue: mockGroqRagService },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    articleService = module.get(ArticleService);
    groqRagService = module.get(GroqRagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ragSearch', () => {
    it('should return a RAG response with results', async () => {
      const mockResults = [
        { id: 1, title: 'Article 1', content_preview: 'Preview', similarity: 0.85 },
      ];
      mockArticleService.semanticSearch.mockResolvedValue(mockResults as any);
      mockGroqRagService.generateRAGResponse.mockResolvedValue('Generated answer based on articles.');

      const result = await service.ragSearch({ q: 'test query' });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test query');
      expect(result.found).toBe(1);
    });

    it('should return empty response when no articles found', async () => {
      mockArticleService.semanticSearch.mockResolvedValue([]);

      const result = await service.ragSearch({ q: 'no results query' });

      expect(result.success).toBe(true);
      expect(result.found).toBe(0);
      expect(result.answer).toContain("n'ai pas trouvé");
    });
  });
});
