import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import { MailService } from '../mail/mail.service';
import { NotificationType } from 'utils/constants';
import { User } from '../users/entities/user.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;

  const mockUser: Partial<User> = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    emailNotificationsEnabled: true,
    emailOnComment: true,
    emailOnLike: false,
    emailOnNewFollower: true,
  };

  const mockNotification: Partial<Notification> = {
    id: 1,
    type: NotificationType.COMMENT,
    message: 'Someone commented',
    isRead: false,
    createdAt: new Date(),
  };

  const mockNotificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    manager: {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          pushNotificationsEnabled: true,
          emailNotificationsEnabled: true,
        }),
      }),
    },
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
    server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
  };

  const mockMailService = {
    sendNotificationEmail: jest.fn(),
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAndNotify', () => {
    it('should create a notification and save it', async () => {
      mockNotificationRepo.create.mockReturnValue(mockNotification);
      mockNotificationRepo.save.mockResolvedValue(mockNotification);
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.createAndNotify(
        NotificationType.COMMENT,
        mockUser as User,
        null,
        'Someone commented on your article',
      );

      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('findForUser', () => {
    it('should return notifications for a user', async () => {
      const mockQB = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockNotification]),
      };
      mockNotificationRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.findForUser(1);

      expect(result).toBeDefined();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockNotificationRepo.count.mockResolvedValue(3);
      const mockQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      mockNotificationRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.markAllAsRead(1);

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
    });

    it('should return 0 count when no unread notifications', async () => {
      mockNotificationRepo.count.mockResolvedValue(0);

      const result = await service.markAllAsRead(1);

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });
});
