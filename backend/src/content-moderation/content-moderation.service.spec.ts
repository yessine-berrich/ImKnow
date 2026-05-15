import { Test, TestingModule } from '@nestjs/testing';
import { ContentModerationService } from './content-moderation.service';

const mockGroqCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  })),
}));

describe('ContentModerationService', () => {
  let service: ContentModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentModerationService],
    }).compile();

    service = module.get<ContentModerationService>(ContentModerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('moderate', () => {
    it('should return moderation result for safe content', async () => {
      mockGroqCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isFlagged: false,
                score: 0.05,
                categories: [],
                reason: 'Content is safe',
                confidence: 0.95,
              }),
            },
          },
        ],
      });

      const result = await service.moderate('Safe Title', 'Safe content here');

      expect(result).toBeDefined();
      expect(result.isFlagged).toBe(false);
    });

    it('should return flagged result for inappropriate content', async () => {
      mockGroqCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isFlagged: true,
                score: 0.9,
                categories: ['toxicity'],
                reason: 'Toxic content detected',
                confidence: 0.95,
              }),
            },
          },
        ],
      });

      const result = await service.moderate('Bad Title', 'Inappropriate content');

      expect(result.isFlagged).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });
});
