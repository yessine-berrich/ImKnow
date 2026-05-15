import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ArticleInteractionService } from './article-interaction.service';
import { UsersService } from '../users/users.service';
import { MediaService } from '../media/media.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../users/guards/auth.guard';

describe('ArticleController', () => {
  let controller: ArticleController;
  let service: any;

  const mockArticle = {
    id: 1,
    title: 'Test Article',
    content: 'Test content',
    status: 'published',
    viewsCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: 1, firstName: 'John', lastName: 'Doe', role: 'employee', profileImage: null },
    category: { id: 1, name: 'Tech' },
    tags: [],
    likes: [],
    bookmarks: [],
    comments: [],
  };

  const mockPayload = { sub: 1, email: 'john@example.com', role: 'employee' };

  beforeEach(async () => {
    const mockArticleService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      semanticSearch: jest.fn(),
      getArticlesByUserId: jest.fn(),
    };

    const mockArticleInteractionService = {
      toggleLike: jest.fn(),
      toggleBookmark: jest.fn(),
      getUserLikedArticles: jest.fn(),
      getUserBookmarkedArticles: jest.fn(),
    };

    const mockUsersService = {
      getUserById: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const mockAuthGuard = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        { provide: ArticleService, useValue: mockArticleService },
        { provide: ArticleInteractionService, useValue: mockArticleInteractionService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MediaService, useValue: { create: jest.fn(), getMediaTypeFromMimeType: jest.fn() } },
        { provide: JwtService, useValue: mockJwtService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ArticleController>(ArticleController);
    service = module.get(ArticleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an article', async () => {
      const createDto = { title: 'New Article', content: 'Content', categoryId: 1 };
      service.create.mockResolvedValue(mockArticle);

      const result = await controller.create(createDto as any, [] as any, mockPayload as any);

      expect(result).toEqual(mockArticle);
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all articles', async () => {
      service.findAll.mockResolvedValue([mockArticle]);

      const result = await controller.findAll({ headers: {} } as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an article by id', async () => {
      service.findOne.mockResolvedValue(mockArticle);

      const result = await controller.findOne(1, { headers: {} } as any);

      expect(result.id).toBe(1);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update an article', async () => {
      const updateDto = { title: 'Updated Title' };
      service.update.mockResolvedValue({ ...mockArticle, ...updateDto });

      const result = await controller.update(1, updateDto as any, [] as any, mockPayload as any);

      expect(result.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    it('should remove an article', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
