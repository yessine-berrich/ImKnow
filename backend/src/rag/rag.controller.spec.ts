import { Test, TestingModule } from '@nestjs/testing';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { AuthGuard } from '../users/guards/auth.guard';

describe('RagController', () => {
  let controller: RagController;
  let service: jest.Mocked<RagService>;

  const mockRagService = {
    ragSearch: jest.fn(),
  };

  const mockReq = { user: { id: 1 } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagController],
      providers: [{ provide: RagService, useValue: mockRagService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RagController>(RagController);
    service = module.get(RagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ragSearch', () => {
    it('should call service ragSearch and return result', async () => {
      const dto = { q: 'test query', limit: 3, minSimilarity: 0.3 };
      const mockResult = {
        success: true,
        query: 'test query',
        found: 1,
        answer: 'Generated answer',
        sources: [],
      };
      mockRagService.ragSearch.mockResolvedValue(mockResult);

      const result = await controller.ragSearch(dto as any, mockReq as any);

      expect(result).toEqual(mockResult);
      expect(service.ragSearch).toHaveBeenCalledWith(dto, 1);
    });
  });
});
