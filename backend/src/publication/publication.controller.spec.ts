import { Test, TestingModule } from '@nestjs/testing';
import { PublicationController } from './publication.controller';
import { PublicationService } from './publication.service';
import { PublicationInteractionService } from './publication-interaction.service';
import { UsersService } from '../users/users.service';
import { MediaService } from '../media/media.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../users/guards/auth.guard';

describe('PublicationController', () => {
  let controller: PublicationController;
  let service: any;

  const mockPublication = {
    id: 1,
    title: 'Test Publication',
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
    const mockPublicationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      semanticSearch: jest.fn(),
      getPublicationsByUserId: jest.fn(),
    };

    const mockPublicationInteractionService = {
      toggleLike: jest.fn(),
      toggleBookmark: jest.fn(),
      getUserLikedPublications: jest.fn(),
      getUserBookmarkedPublications: jest.fn(),
    };

    const mockUsersService = {
      getUserById: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const mockAuthGuard = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicationController],
      providers: [
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: PublicationInteractionService, useValue: mockPublicationInteractionService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MediaService, useValue: { create: jest.fn(), getMediaTypeFromMimeType: jest.fn() } },
        { provide: JwtService, useValue: mockJwtService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<PublicationController>(PublicationController);
    service = module.get(PublicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an publication', async () => {
      const createDto = { title: 'New Publication', content: 'Content', categoryId: 1 };
      service.create.mockResolvedValue(mockPublication);

      const result = await controller.create(createDto as any, [] as any, mockPayload as any);

      expect(result).toEqual(mockPublication);
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all publications', async () => {
      service.findAll.mockResolvedValue([mockPublication]);

      const result = await controller.findAll({ headers: {} } as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an publication by id', async () => {
      service.findOne.mockResolvedValue(mockPublication);

      const result = await controller.findOne(1, { headers: {} } as any);

      expect(result.id).toBe(1);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update an publication', async () => {
      const updateDto = { title: 'Updated Title' };
      service.update.mockResolvedValue({ ...mockPublication, ...updateDto });

      const result = await controller.update(1, updateDto as any, [] as any, mockPayload as any);

      expect(result.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    it('should remove an publication', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
