import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { GroqRagService } from './groq-rag.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { InternalServerErrorException } from '@nestjs/common';

const mockChunks = [
  {
    chunkId: 1,
    publicationId: 10,
    title: 'Publication A',
    chunkIndex: 0,
    content: 'Full chunk content about topic A.',
    similarity: 0.88,
  },
  {
    chunkId: 2,
    publicationId: 11,
    title: 'Publication B',
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
        'Réponse basée sur [Publication 1] et [Publication 2].',
      );

      const result = await service.ragSearch({ q: 'test query' });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test query');
      expect(result.found).toBe(2);
      expect(result.answer).toContain('Publication');
      expect(result.sources).toHaveLength(2);
      expect(result.sources![0].publicationId).toBe(10);
      expect(result.sources![0].title).toBe('Publication A');
    });

    it('returns empty response without calling LLM when no chunks meet threshold', async () => {
      mockRagRetrievalService.semanticChunkSearch.mockResolvedValue([]);

      const result = await service.ragSearch({ q: 'unfindable query' });

      expect(result.success).toBe(true);
      expect(result.found).toBe(0);
      expect(result.answer).toContain("n'ai pas trouvé");
      expect(groqRagService.generateRAGResponse).not.toHaveBeenCalled();
    });

    it('deduplicates sources by publicationId keeping highest similarity', async () => {
      const chunksWithDuplicate = [
        ...mockChunks,
        {
          chunkId: 3,
          publicationId: 10,
          title: 'Publication A',
          chunkIndex: 1,
          content: 'Second chunk of Publication A.',
          similarity: 0.80,
        },
      ];
      mockRagRetrievalService.semanticChunkSearch.mockResolvedValue(chunksWithDuplicate);
      mockGroqRagService.generateRAGResponse.mockResolvedValue('Answer.');

      const result = await service.ragSearch({ q: 'test' });

      // Publication A appears twice in chunks but only once in sources
      expect(result.sources).toHaveLength(2);
      const sourceA = result.sources!.find((s) => s.publicationId === 10);
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
