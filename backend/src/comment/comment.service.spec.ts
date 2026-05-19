import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentService } from './comment.service';
import { Comment } from './entities/comment.entity';
import { Publication } from '../publication/entities/publication.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { PublicationService } from '../publication/publication.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentService', () => {
  let service: CommentService;
  let commentRepository: jest.Mocked<Repository<Comment>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: Partial<User> = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'employee' as any,
  };

  const mockPublication: Partial<Publication> = {
    id: 1,
    title: 'Test Publication',
    author: { id: 2 } as User,
  };

  const mockComment: Partial<Comment> = {
    id: 1,
    content: 'Test comment',
    author: mockUser as User,
    publication: mockPublication as Publication,
    parentComment: null,
    replies: [],
    likes: [],
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCommentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findByIds: jest.fn(),
  };

  const mockNotificationService = {
    createAndNotify: jest.fn(),
  };

  const mockNotificationGateway = {
    sendNotification: jest.fn(),
    notifyUser: jest.fn(),
  };

  const mockPublicationService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: getRepositoryToken(Comment), useValue: mockCommentRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: PublicationService, useValue: mockPublicationService },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentRepository = module.get(getRepositoryToken(Comment));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const dto = { content: 'Test comment', publicationId: 1 };
      mockPublicationService.findOne.mockResolvedValue(mockPublication);
      mockUserRepo.findOneOrFail.mockResolvedValue(mockUser);
      mockCommentRepo.create.mockReturnValue(mockComment);
      mockCommentRepo.save.mockResolvedValue(mockComment);
      mockCommentRepo.findOneOrFail.mockResolvedValue(mockComment);
      mockNotificationService.createAndNotify.mockResolvedValue(undefined);

      const result = await service.create(dto as any, 1);

      expect(result).toBeDefined();
      expect(mockCommentRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByPublication', () => {
    it('should return all comments for an publication', async () => {
      mockCommentRepo.find.mockResolvedValue([mockComment]);

      const result = await service.findByPublication(1);

      expect(result).toBeDefined();
      expect(mockCommentRepo.find).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a comment by its author', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const commentWithReplies = { ...mockComment, replies: [{ id: 10 }] };
      mockCommentRepo.findOne.mockResolvedValue(commentWithReplies);
      mockCommentRepo.save.mockResolvedValue({ ...commentWithReplies, content: '[Commentaire supprimé]' });

      await service.remove(1, 1);

      expect(mockCommentRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockCommentRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not author', async () => {
      const otherUser = { ...mockUser, id: 99 };
      mockUserRepo.findOne.mockResolvedValue(otherUser);
      mockCommentRepo.findOne.mockResolvedValue(mockComment);

      await expect(service.remove(1, 99)).rejects.toThrow(ForbiddenException);
    });
  });
});
