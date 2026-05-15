import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaType } from './entities/media.entity';
import { AuthGuard } from '../users/guards/auth.guard';

describe('MediaController', () => {
  let controller: MediaController;
  let service: jest.Mocked<MediaService>;

  const mockMedia = {
    id: 1,
    url: '/uploads/test.jpg',
    type: MediaType.IMAGE,
    mimeType: 'image/jpeg',
    filename: 'test.jpg',
    size: 1024,
  };

  const mockMediaService = {
    create: jest.fn(),
    getMediaTypeFromMimeType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
