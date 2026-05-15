import { Test, TestingModule } from '@nestjs/testing';
import { ContentModerationController } from './content-moderation.controller';
import { ContentModerationService } from './content-moderation.service';

describe('ContentModerationController', () => {
  let controller: ContentModerationController;
  let service: jest.Mocked<ContentModerationService>;

  const mockContentModerationService = {
    moderate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentModerationController],
      providers: [
        { provide: ContentModerationService, useValue: mockContentModerationService },
      ],
    }).compile();

    controller = module.get<ContentModerationController>(ContentModerationController);
    service = module.get(ContentModerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

});
