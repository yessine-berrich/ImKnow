import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { GroqRagService } from './groq-rag.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { InternalServerErrorException } from '@nestjs/common';

const mockChunks = [
  {
    chunkId: 1,
    articleId: 10,
    title: 'Article A',
    chunkIndex: 0,
    content: 'Full chunk content about topic A.',
    similarity: 0.88,
  },
  {
    chunkId: 2,
    articleId: 11,
    title: 'Article B',
    chunkIndex: 1,
    content: 'Another chunk about topic B.',
    similarity: 0.75,
  },
];

describe('RagService', () => {
  let service: RagService;
  let ragRetrievalService: jest.Mocked<RagRetrievalService>;
  let groqRagService: jest.Mocked<GroqRagService>;

  const mockRagRetrievalService = {
    semanticChunkSearch: jest.fn(),
  };

  const mockGroqRagService = {
    generateRAGResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: RagRetrievalService, useValue: mockRagRetrievalService },
        { provide: GroqRagService, useValue: mockGroqRagService },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    ragRetrievalService = module.get(RagRetrievalService);
    groqRagService = module.get(GroqRagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ragSearch', () => {
    it('returns a successful response with sources when chunks are found', async () => {
      mockRagRetrievalService.semanticChunkSearch.mockResolvedValue(mockChunks);
      mockGroqRagService.generateRAGResponse.mockResolvedValue(
        'Réponse basée sur [Article 1] et [Article 2].',
      );

      const result = await service.ragSearch({ q: 'test query' });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test query');
      expect(result.found).toBe(2);
      expect(result.answer).toContain('Article');
      expect(result.sources).toHaveLength(2);
      expect(result.sources![0].articleId).toBe(10);
      expect(result.sources![0].title).toBe('Article A');
    });

    it('returns empty response without calling LLM when no chunks meet threshold', async () => {
      mockRagRetrievalService.semanticChunkSearch.mockResolvedValue([]);

      const result = await service.ragSearch({ q: 'unfindable query' });

      expect(result.success).toBe(true);
      expect(result.found).toBe(0);
      expect(result.answer).toContain("n'ai pas trouvé");
      expect(groqRagService.generateRAGResponse).not.toHaveBeenCalled();
    });

    it('deduplicates sources by articleId keeping highest similarity', async () => {
      const chunksWithDuplicate = [
        ...mockChunks,
        {
          chunkId: 3,
          articleId: 10,
          title: 'Article A',
          chunkIndex: 1,
          content: 'Second chunk of Article A.',
          similarity: 0.80,
        },
      ];
      mockRagRetrievalService.semanticChunkSearch.mockResolvedValue(chunksWithDuplicate);
      mockGroqRagService.generateRAGResponse.mockResolvedValue('Answer.');

      const result = await service.ragSearch({ q: 'test' });

      // Article A appears twice in chunks but only once in sources
      expect(result.sources).toHaveLength(2);
      const sourceA = result.sources!.find((s) => s.articleId === 10);
      expect(sourceA!.similarity).toBe(0.88); // highest kept
    });

    it('throws InternalServerErrorException when retrieval throws', async () => {
      mockRagRetrievalService.semanticChunkSearch.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.ragSearch({ q: 'crash query' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
