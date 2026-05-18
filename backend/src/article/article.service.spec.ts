import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleService } from './article.service';
import { Article } from './entities/article.entity';
import { ArticleVersion } from './entities/article-version.entity';
import { User } from '../users/entities/user.entity';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import { ArticleInteractionService } from './article-interaction.service';
import { ArticleVersioningService } from './article-versioning.service';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { NotificationService } from '../notification/notification.service';
import { ArticleReport } from './entities/article-report.entity';
import { ArticleStatus, NotificationType } from 'utils/constants';
import { NotFoundException } from '@nestjs/common';
import { ArticleChunkService } from './article-chunk.service';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: jest.Mocked<Repository<Article>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let mediaService: jest.Mocked<MediaService>;
  let searchService: jest.Mocked<SearchService>;
  let articleInteractionService: jest.Mocked<ArticleInteractionService>;
  let articleVersioningService: jest.Mocked<ArticleVersioningService>;
  let moderationService: jest.Mocked<ContentModerationService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockArticle = {
    id: 1,
    title: 'Test Article',
    content: 'Test content',
    status: ArticleStatus.DRAFT,
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
  } as Article;

  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password',
    role: 'employee',
    isActive: true,
    status: true,
    articles: [],
    comments: [],
    likedArticles: [],
    bookmarkedArticles: [],
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  beforeEach(async () => {
    const mockArticleRepo = {
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

    const mockArticleReportRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(ArticleReport),
          useValue: mockArticleReportRepo,
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
          provide: ArticleInteractionService,
          useValue: {
            incrementView: jest.fn(),
            toggleLike: jest.fn(),
            toggleBookmark: jest.fn(),
            getUserLikedArticles: jest.fn(),
            getUserBookmarkedArticles: jest.fn(),
          },
        },
        {
          provide: ArticleVersioningService,
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
          provide: ArticleChunkService,
          useValue: {
            generateChunks: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get(getRepositoryToken(Article));
    userRepository = module.get(getRepositoryToken(User));
    mediaService = module.get(MediaService);
    searchService = module.get(SearchService);
    articleInteractionService = module.get(ArticleInteractionService);
    articleVersioningService = module.get(ArticleVersioningService);
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
    it('should create an article with DRAFT status', async () => {
      const createDto = {
        title: 'New Article',
        content: 'Content',
        categoryId: 1,
      };

      articleRepository.create.mockReturnValue(mockArticle);
      articleRepository.save.mockResolvedValue(mockArticle);
      articleRepository.findOne.mockResolvedValue(mockArticle);
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

      expect(articleRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject article with high moderation score', async () => {
      const createDto = {
        title: 'New Article',
        content: 'Content',
        categoryId: 1,
        status: ArticleStatus.PUBLISHED,
      };

      const savedArticle = { ...mockArticle, status: ArticleStatus.PUBLISHED };
      articleRepository.create.mockReturnValue(savedArticle);
      articleRepository.save.mockResolvedValue(savedArticle);
      moderationService.moderate.mockResolvedValue({
        score: 0.8,
        isFlagged: true,
        categories: ['inappropriate'],
        reason: 'Inappropriate content',
        confidence: 0.9,
        model: 'test',
        moderatedAt: new Date(),
      });
      articleRepository.findOne.mockResolvedValue({ ...savedArticle, status: ArticleStatus.REJECTED });

      const result = await service.create(createDto as any, mockUser);

      expect(notificationService.createAndNotify).toHaveBeenCalled();
      expect(result.status).toBe(ArticleStatus.REJECTED);
    });
  });

  describe('findAll', () => {
    it('should return all articles with relations', async () => {
      articleRepository.find.mockResolvedValue([mockArticle]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(articleRepository.find).toHaveBeenCalledWith({
        relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an article by id', async () => {
      articleRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(1);

      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException if article not found', async () => {
      articleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an article', async () => {
      const updateDto = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      articleRepository.findOneOrFail.mockResolvedValue(mockArticle);
      articleRepository.save.mockResolvedValue({ ...mockArticle, ...updateDto });
      articleRepository.findOne.mockResolvedValue({ ...mockArticle, ...updateDto });

      const result = await service.update(1, updateDto as any, mockUser);

      expect(articleRepository.save).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });
  });

  describe('remove', () => {
    it('should remove an article', async () => {
      articleRepository.findOne.mockResolvedValue(mockArticle);
      articleRepository.remove.mockResolvedValue(mockArticle);

      await service.remove(1);

      expect(articleRepository.remove).toHaveBeenCalledWith(mockArticle);
    });
  });

  describe('semanticSearch', () => {
    it('should return search results', async () => {
      const mockEmbedding = new Array(768).fill(0.1);
      searchService.generateEmbedding.mockResolvedValue(mockEmbedding);
      articleRepository.query.mockResolvedValue([
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
    it('should check for duplicate articles', async () => {
      const mockEmbedding = new Array(768).fill(0.1);
      searchService.generateEmbedding.mockResolvedValue(mockEmbedding);
      articleRepository.query.mockResolvedValue([
        { id: 2, title: 'Similar Article', authorId: 2, similarity: 0.85 },
      ]);

      const result = await service.checkDuplicate(
        { title: 'Test', content: 'Content' },
        1,
      );

      expect(result.hasDuplicates).toBe(true);
      expect(result.similarArticles).toHaveLength(1);
    });
  });

  describe('getArticlesByUserId', () => {
    it('should return articles by user id', async () => {
      articleRepository.find.mockResolvedValue([mockArticle]);

      const result = await service.getArticlesByUserId(1);

      expect(result).toHaveLength(1);
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { author: { id: 1 } },
        relations: ['author', 'category', 'tags', 'media', 'likes', 'bookmarks', 'comments'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
