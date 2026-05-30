import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationService } from './publication.service';
import { Publication } from './entities/publication.entity';
import { PublicationVersion } from './entities/publication-version.entity';
import { User } from '../users/entities/user.entity';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import { PublicationInteractionService } from './publication-interaction.service';
import { PublicationVersioningService } from './publication-versioning.service';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { NotificationService } from '../notification/notification.service';
import { PublicationReport } from './entities/publication-report.entity';
import { PublicationStatus, NotificationType } from 'utils/constants';
import { NotFoundException } from '@nestjs/common';
import { PublicationChunkService } from './publication-chunk.service';
import { ReportAIService } from '../report-ai/report-ai.service';

describe('PublicationService', () => {
  let service: PublicationService;
  let publicationRepository: jest.Mocked<Repository<Publication>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let mediaService: jest.Mocked<MediaService>;
  let searchService: jest.Mocked<SearchService>;
  let publicationInteractionService: jest.Mocked<PublicationInteractionService>;
  let publicationVersioningService: jest.Mocked<PublicationVersioningService>;
  let moderationService: jest.Mocked<ContentModerationService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockPublication = {
    id: 1,
    title: 'Test Publication',
    content: 'Test content',
    status: PublicationStatus.DRAFT,
    viewsCount: 0,
    author: { id: 1 } as User,
    category: { id: 1, name: 'Tech' } as any,
    tags: [],
    comments: [],
    media: [],
    likes: [],
    bookmarks: [],
    versions: [],
    isAutoModerated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Publication;

  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password',
    role: 'employee',
    isActive: true,
    status: true,
    publications: [],
    comments: [],
    likedPublications: [],
    bookmarkedPublications: [],
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  beforeEach(async () => {
    const mockPublicationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
      query: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
    };

    const mockPublicationReportRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicationService,
        {
          provide: getRepositoryToken(Publication),
          useValue: mockPublicationRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(PublicationReport),
          useValue: mockPublicationReportRepo,
        },
        {
          provide: MediaService,
          useValue: {
            create: jest.fn(),
            getMediaTypeFromMimeType: jest.fn(),
          },
        },
        {
          provide: SearchService,
          useValue: {
            generateEmbedding: jest.fn(),
          },
        },
        {
          provide: PublicationInteractionService,
          useValue: {
            incrementView: jest.fn(),
            toggleLike: jest.fn(),
            toggleBookmark: jest.fn(),
            getUserLikedPublications: jest.fn(),
            getUserBookmarkedPublications: jest.fn(),
          },
        },
        {
          provide: PublicationVersioningService,
          useValue: {
            createNewVersion: jest.fn(),
            getHistory: jest.fn(),
            revertToVersion: jest.fn(),
          },
        },
        {
          provide: ContentModerationService,
          useValue: {
            moderate: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createAndNotify: jest.fn(),
          },
        },
        {
          provide: PublicationChunkService,
          useValue: {
            generateChunks: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ReportAIService,
          useValue: { analyzePublicationReport: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PublicationService>(PublicationService);
    publicationRepository = module.get(getRepositoryToken(Publication));
    userRepository = module.get(getRepositoryToken(User));
    mediaService = module.get(MediaService);
    searchService = module.get(SearchService);
    publicationInteractionService = module.get(PublicationInteractionService);
    publicationVersioningService = module.get(PublicationVersioningService);
    moderationService = module.get(ContentModerationService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an publication with DRAFT status', async () => {
      const createDto = {
        title: 'New Publication',
        content: 'Content',
        categoryId: 1,
      };

      publicationRepository.create.mockReturnValue(mockPublication);
      publicationRepository.save.mockResolvedValue(mockPublication);
      publicationRepository.findOne.mockResolvedValue(mockPublication);
      moderationService.moderate.mockResolvedValue({
        score: 0.1,
        isFlagged: false,
        categories: [],
        reason: '',
        confidence: 0.9,
        model: 'test',
        moderatedAt: new Date(),
      });

      const result = await service.create(createDto as any, mockUser);

      expect(publicationRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject publication with high moderation score', async () => {
      const createDto = {
        title: 'New Publication',
        content: 'Content',
        categoryId: 1,
        status: PublicationStatus.PUBLISHED,
      };

      const savedPublication = { ...mockPublication, status: PublicationStatus.PUBLISHED };
      publicationRepository.create.mockReturnValue(savedPublication);
      publicationRepository.save.mockResolvedValue(savedPublication);
      moderationService.moderate.mockResolvedValue({
        score: 0.8,
        isFlagged: true,
        categories: ['inappropriate'],
        reason: 'Inappropriate content',
        confidence: 0.9,
        model: 'test',
        moderatedAt: new Date(),
      });
      publicationRepository.findOne.mockResolvedValue({ ...savedPublication, status: PublicationStatus.REJECTED });

      const result = await service.create(createDto as any, mockUser);

      expect(notificationService.createAndNotify).toHaveBeenCalled();
      expect(result.status).toBe(PublicationStatus.REJECTED);
    });
  });

  describe('findAll', () => {
    it('should return all publications with relations', async () => {
      publicationRepository.find.mockResolvedValue([mockPublication]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(publicationRepository.find).toHaveBeenCalledWith({
        relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an publication by id', async () => {
      publicationRepository.findOne.mockResolvedValue(mockPublication);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPublication);
    });

    it('should throw NotFoundException if publication not found', async () => {
      publicationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an publication', async () => {
      const updateDto = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      publicationRepository.findOneOrFail.mockResolvedValue(mockPublication);
      publicationRepository.save.mockResolvedValue({ ...mockPublication, ...updateDto });
      publicationRepository.findOne.mockResolvedValue({ ...mockPublication, ...updateDto });

      const result = await service.update(1, updateDto as any, mockUser);

      expect(publicationRepository.save).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });
  });

  describe('remove', () => {
    it('should remove an publication', async () => {
      publicationRepository.findOne.mockResolvedValue(mockPublication);
      publicationRepository.remove.mockResolvedValue(mockPublication);

      await service.remove(1);

      expect(publicationRepository.remove).toHaveBeenCalledWith(mockPublication);
    });
  });

  describe('semanticSearch', () => {
    it('should return search results', async () => {
      const mockEmbedding = new Array(768).fill(0.1);
      searchService.generateEmbedding.mockResolvedValue(mockEmbedding);
      publicationRepository.query.mockResolvedValue([
        { id: 1, title: 'Test', content_preview: 'Preview', similarity: 0.85 },
      ]);

      const result = await service.semanticSearch('test query');

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.85);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.semanticSearch('');

      expect(result).toEqual([]);
    });
  });

  describe('checkDuplicate', () => {
    it('should check for duplicate publications', async () => {
      const mockEmbedding = new Array(768).fill(0.1);
      searchService.generateEmbedding.mockResolvedValue(mockEmbedding);
      publicationRepository.query.mockResolvedValue([
        { id: 2, title: 'Similar Publication', authorId: 2, similarity: 0.85 },
      ]);

      // Content must be at least 150 chars to pass the duplicate-min-length guard
      const longContent = 'This is a sufficiently long content for duplicate detection. '.repeat(4);
      const result = await service.checkDuplicate(
        { title: 'Test', content: longContent },
        1,
      );

      expect(result.hasDuplicates).toBe(true);
      expect(result.similarPublications).toHaveLength(1);
    });
  });

  describe('getPublicationsByUserId', () => {
    it('should return publications by user id', async () => {
      publicationRepository.find.mockResolvedValue([mockPublication]);

      const result = await service.getPublicationsByUserId(1);

      expect(result).toHaveLength(1);
      expect(publicationRepository.find).toHaveBeenCalledWith({
        where: { author: { id: 1 } },
        relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
