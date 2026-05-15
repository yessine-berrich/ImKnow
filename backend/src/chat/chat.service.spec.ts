import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { UserBlock } from './entities/user-block.entity';
import { ConversationSettings } from './entities/conversation-settings.entity';
import { User } from 'src/users/entities/user.entity';
import { FollowService } from 'src/follow/follow.service';
import { MediaService } from 'src/media/media.service';

describe('ChatService', () => {
  let service: ChatService;
  let chatMessageRepository: Repository<ChatMessage>;
  let userRepository: Repository<User>;
  let followService: FollowService;
  let mediaService: MediaService;

  const mockFollowRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockChatMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    manager: {
      getRepository: jest.fn().mockReturnValue(mockFollowRepository),
    },
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockFollowService = {
    isFollowing: jest.fn(),
    areFriends: jest.fn(),
  };

  const mockMediaService = {
    getMediaTypeFromMimeType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockChatMessageRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserBlock),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(ConversationSettings),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: FollowService,
          useValue: mockFollowService,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatMessageRepository = module.get<Repository<ChatMessage>>(getRepositoryToken(ChatMessage));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    followService = module.get<FollowService>(FollowService);
    mediaService = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateConversationId', () => {
    it('should generate consistent conversation ID regardless of order', () => {
      const conv1 = service.generateConversationId(1, 2);
      const conv2 = service.generateConversationId(2, 1);
      
      expect(conv1).toBe('1_2');
      expect(conv2).toBe('1_2');
      expect(conv1).toBe(conv2);
    });
  });

  describe('canUsersChat', () => {
    it('should return true if users are friends', async () => {
      mockFollowService.areFriends.mockResolvedValue(true);
      (mockChatMessageRepository as any).manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.canUsersChat(1, 2);

      expect(result).toBe(true);
    });

    it('should return false if users are not connected', async () => {
      mockFollowService.areFriends.mockResolvedValue(false);
      mockChatMessageRepository.findOne.mockResolvedValue(null);
      mockChatMessageRepository.count.mockResolvedValue(0);

      const result = await service.canUsersChat(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully when users are connected', async () => {
      const sendMessageDto = { content: 'Hello!', type: 'text' };
      const mockMessage = {
        id: 1,
        content: 'Hello!',
        type: 'text',
        sender: { id: 1 },
        receiver: { id: 2 },
        isRead: false,
        createdAt: new Date(),
      };

      mockFollowService.areFriends.mockResolvedValue(true);
      mockChatMessageRepository.findOne.mockResolvedValue(null);
      mockChatMessageRepository.create.mockReturnValue(mockMessage);
      mockChatMessageRepository.save.mockResolvedValue(mockMessage);

      const result = await service.sendMessage(1, 2, sendMessageDto as any);

      expect(result).toEqual(mockMessage);
      expect(mockChatMessageRepository.create).toHaveBeenCalled();
      expect(mockChatMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when users are not connected', async () => {
      const sendMessageDto = { content: 'Hello!' };
      mockFollowService.areFriends.mockResolvedValue(false);
      mockChatMessageRepository.findOne.mockResolvedValue(null);
      mockChatMessageRepository.count.mockResolvedValue(0);

      await expect(service.sendMessage(1, 2, sendMessageDto as any))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
