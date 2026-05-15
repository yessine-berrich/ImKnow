import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FollowService } from './follow.service';
import { Follow } from './entities/follow.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';
import { ChatService } from 'src/chat/chat.service';

describe('FollowService', () => {
  let service: FollowService;

  const mockUser = (id: number, opts: Partial<User> = {}): Partial<User> => ({
    id,
    firstName: `User${id}`,
    lastName: 'Test',
    email: `user${id}@example.com`,
    profileImage: null,
    department: 'Engineering',
    bio: 'Bio text',
    isOnline: false,
    emailNotificationsEnabled: true,
    lastSeenAt: new Date(),
    ...opts,
  });

  const mockFollow = (followerId: number, followingId: number): Partial<Follow> => ({
    id: followerId * 100 + followingId,
    follower: mockUser(followerId) as User,
    following: mockUser(followingId) as User,
    createdAt: new Date(),
  });

  const mockFollowRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
  };

  const mockNotificationService = {
    createAndNotify: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([{ mutual_count: '0' }]),
  };

  const mockChatService = {
    createSystemWelcomeMessage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: getRepositoryToken(Follow), useValue: mockFollowRepo },
        { provide: getRepositoryToken(User),   useValue: mockUserRepo },
        { provide: NotificationService,        useValue: mockNotificationService },
        { provide: DataSource,                 useValue: mockDataSource },
        { provide: ChatService,                useValue: mockChatService },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // follow
  // ═══════════════════════════════════════════════════════════════

  describe('follow', () => {
    it('should throw BadRequestException when following yourself', async () => {
      await expect(service.follow(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.follow(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already following', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser(2));
      mockFollowRepo.findOne.mockResolvedValueOnce(mockFollow(1, 2)); // existing follow

      await expect(service.follow(1, 2)).rejects.toThrow(ConflictException);
    });

    it('should follow a user successfully (one-way)', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser(2)) // target user
        .mockResolvedValueOnce(mockUser(1)); // follower user
      mockFollowRepo.findOne
        .mockResolvedValueOnce(null)  // no existing follow
        .mockResolvedValueOnce(null); // no mutual follow
      mockFollowRepo.create.mockReturnValue(mockFollow(1, 2));
      mockFollowRepo.save.mockResolvedValue(mockFollow(1, 2));

      const result = await service.follow(1, 2);

      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(true);
      expect(mockFollowRepo.save).toHaveBeenCalled();
    });

    it('should create welcome message and notify on mutual follow (friendship)', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser(2))  // target user
        .mockResolvedValueOnce(mockUser(1)); // follower user
      mockFollowRepo.findOne
        .mockResolvedValueOnce(null)             // no existing follow from 1→2
        .mockResolvedValueOnce(mockFollow(2, 1)); // mutual follow exists (2→1)
      mockFollowRepo.create.mockReturnValue(mockFollow(1, 2));
      mockFollowRepo.save.mockResolvedValue(mockFollow(1, 2));

      const result = await service.follow(1, 2);

      expect(result.message).toContain('friends');
      expect(mockChatService.createSystemWelcomeMessage).toHaveBeenCalledWith(1, 2);
      expect(mockNotificationService.createAndNotify).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // unfollow
  // ═══════════════════════════════════════════════════════════════

  describe('unfollow', () => {
    it('should unfollow successfully', async () => {
      mockFollowRepo.findOne.mockResolvedValue(mockFollow(1, 2));
      mockFollowRepo.remove.mockResolvedValue(undefined);

      const result = await service.unfollow(1, 2);

      expect(result.success).toBe(true);
      expect(mockFollowRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not following', async () => {
      mockFollowRepo.findOne.mockResolvedValue(null);

      await expect(service.unfollow(1, 2)).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeFollower
  // ═══════════════════════════════════════════════════════════════

  describe('removeFollower', () => {
    it('should remove a follower successfully', async () => {
      mockFollowRepo.findOne.mockResolvedValue(mockFollow(2, 1));
      mockFollowRepo.remove.mockResolvedValue(undefined);

      const result = await service.removeFollower(1, 2);

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when follower relationship not found', async () => {
      mockFollowRepo.findOne.mockResolvedValue(null);

      await expect(service.removeFollower(1, 2)).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isFollowing
  // ═══════════════════════════════════════════════════════════════

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      mockFollowRepo.findOne.mockResolvedValue(mockFollow(1, 2));
      expect(await service.isFollowing(1, 2)).toBe(true);
    });

    it('should return false when not following', async () => {
      mockFollowRepo.findOne.mockResolvedValue(null);
      expect(await service.isFollowing(1, 2)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // areFriends
  // ═══════════════════════════════════════════════════════════════

  describe('areFriends', () => {
    it('should return true when mutual follow exists', async () => {
      mockFollowRepo.findOne.mockResolvedValue(mockFollow(1, 2));
      expect(await service.areFriends(1, 2)).toBe(true);
    });

    it('should return false when only one-way follow', async () => {
      mockFollowRepo.findOne
        .mockResolvedValueOnce(mockFollow(1, 2))
        .mockResolvedValueOnce(null);
      expect(await service.areFriends(1, 2)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFriends
  // ═══════════════════════════════════════════════════════════════

  describe('getFriends', () => {
    it('should return mutual follows as friends', async () => {
      // followers of user 1
      mockFollowRepo.find
        .mockResolvedValueOnce([mockFollow(2, 1)])  // followers
        .mockResolvedValueOnce([mockFollow(1, 2)]); // following (user 1 follows user 2 → mutual)

      const result = await service.getFriends(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
    });

    it('should return empty when no mutual follows', async () => {
      // user 3 follows user 1, but user 1 doesn't follow user 3
      mockFollowRepo.find
        .mockResolvedValueOnce([mockFollow(3, 1)])
        .mockResolvedValueOnce([]); // user 1 follows nobody

      const result = await service.getFriends(1);

      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFollowers
  // ═══════════════════════════════════════════════════════════════

  describe('getFollowers', () => {
    it('should return list of followers', async () => {
      mockFollowRepo.find.mockResolvedValue([mockFollow(2, 1), mockFollow(3, 1)]);

      const result = await service.getFollowers(1);

      expect(result).toHaveLength(2);
      expect(result[0].user.id).toBe(2);
    });

    it('should return empty array when no followers', async () => {
      mockFollowRepo.find.mockResolvedValue([]);
      expect(await service.getFollowers(1)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFollowing
  // ═══════════════════════════════════════════════════════════════

  describe('getFollowing', () => {
    it('should return list of users being followed', async () => {
      mockFollowRepo.find.mockResolvedValue([mockFollow(1, 2)]);

      const result = await service.getFollowing(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFollowStats
  // ═══════════════════════════════════════════════════════════════

  describe('getFollowStats', () => {
    it('should return follower, following and friend counts', async () => {
      mockFollowRepo.count
        .mockResolvedValueOnce(5)  // followersCount
        .mockResolvedValueOnce(3); // followingCount

      // For friends: followers of user 1 then following of user 1
      mockFollowRepo.find
        .mockResolvedValueOnce([mockFollow(2, 1), mockFollow(3, 1)]) // followers
        .mockResolvedValueOnce([mockFollow(1, 2)]);                  // following (user 2 mutual)

      const result = await service.getFollowStats(1);

      expect(result.followersCount).toBe(5);
      expect(result.followingCount).toBe(3);
      expect(result.friendsCount).toBe(1); // only user 2 is mutual
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // searchUsers
  // ═══════════════════════════════════════════════════════════════

  describe('searchUsers', () => {
    it('should return empty array for short query', async () => {
      const result = await service.searchUsers('A', 1);
      expect(result).toEqual([]);
      expect(mockUserRepo.find).not.toHaveBeenCalled();
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchUsers('', 1);
      expect(result).toEqual([]);
    });

    it('should find matching users', async () => {
      const foundUser = mockUser(2, { firstName: 'Alice', lastName: 'Smith' });
      mockUserRepo.find.mockResolvedValue([foundUser]);
      mockFollowRepo.find.mockResolvedValue([]); // no follows
      mockDataSource.query.mockResolvedValue([{ mutual_count: '0' }]);

      const result = await service.searchUsers('Alice', 1);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Alice');
      expect(result[0].isFollowing).toBe(false);
      expect(result[0].isFollower).toBe(false);
      expect(result[0].isFriend).toBe(false);
    });

    it('should correctly detect isFollowing and isFollower', async () => {
      const foundUser = mockUser(2);
      mockUserRepo.find.mockResolvedValue([foundUser]);
      mockFollowRepo.find.mockResolvedValue([mockFollow(1, 2) as Follow]); // current user follows found user
      mockDataSource.query.mockResolvedValue([{ mutual_count: '0' }]);

      const result = await service.searchUsers('User', 1);

      expect(result[0].isFollowing).toBe(true);
      expect(result[0].isFollower).toBe(false);
    });
  });
});
