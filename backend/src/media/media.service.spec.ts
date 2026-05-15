import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from './media.service';
import { Media, MediaType } from './entities/media.entity';

describe('MediaService', () => {
  let service: MediaService;
  let mediaRepository: jest.Mocked<Repository<Media>>;

  const mockMedia: Partial<Media> = {
    id: 1,
    url: '/uploads/test.jpg',
    type: MediaType.IMAGE,
    mimeType: 'image/jpeg',
    filename: 'test.jpg',
    size: 1024,
  };

  const mockMediaRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getRepositoryToken(Media), useValue: mockMediaRepo },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    mediaRepository = module.get(getRepositoryToken(Media));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a media entry with http url', async () => {
      const dto = {
        url: 'http://example.com/image.jpg',
        type: MediaType.IMAGE,
        mimeType: 'image/jpeg',
        filename: 'image.jpg',
        size: 2048,
      };
      mockMediaRepo.create.mockReturnValue(mockMedia);
      mockMediaRepo.save.mockResolvedValue(mockMedia);

      const result = await service.create(dto as any);

      expect(result).toEqual(mockMedia);
      expect(mockMediaRepo.save).toHaveBeenCalled();
    });

    it('should create a media entry with /uploads url', async () => {
      const dto = {
        url: '/uploads/test.jpg',
        type: MediaType.IMAGE,
        mimeType: 'image/jpeg',
        filename: 'test.jpg',
        size: 1024,
      };
      mockMediaRepo.create.mockReturnValue(mockMedia);
      mockMediaRepo.save.mockResolvedValue(mockMedia);

      const result = await service.create(dto as any);

      expect(result).toEqual(mockMedia);
    });

    it('should throw error for invalid url', async () => {
      const dto = {
        url: 'invalid-url',
        type: MediaType.IMAGE,
        mimeType: 'image/jpeg',
        filename: 'test.jpg',
        size: 1024,
      };

      await expect(service.create(dto as any)).rejects.toThrow();
    });
  });

  describe('getMediaTypeFromMimeType', () => {
    it('should return IMAGE for image mimetypes', () => {
      expect(service.getMediaTypeFromMimeType('image/jpeg')).toBe(MediaType.IMAGE);
      expect(service.getMediaTypeFromMimeType('image/png')).toBe(MediaType.IMAGE);
    });

    it('should return VIDEO for video mimetypes', () => {
      expect(service.getMediaTypeFromMimeType('video/mp4')).toBe(MediaType.VIDEO);
    });

    it('should return AUDIO for audio mimetypes', () => {
      expect(service.getMediaTypeFromMimeType('audio/mpeg')).toBe(MediaType.AUDIO);
    });

    it('should return DOCUMENT for pdf', () => {
      expect(service.getMediaTypeFromMimeType('application/pdf')).toBe(MediaType.DOCUMENT);
    });
  });
});
