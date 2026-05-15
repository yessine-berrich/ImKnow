import { Test, TestingModule } from '@nestjs/testing';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { AuthGuard } from 'src/users/guards/auth.guard';

describe('FollowController', () => {
  let controller: FollowController;
  let service: jest.Mocked<FollowService>;

  const mockPayload = { sub: 1, email: 'user@example.com', role: 'employee' };

  const mockFollowRelationship = {
    id: 1,
    user: { id: 2, firstName: 'Alice', lastName: 'Smith', fullName: 'Alice Smith' },
    followedAt: new Date(),
    isOnline: false,
  };

  const mockService = {
    getFriends:          jest.fn(),
    getFollowers:        jest.fn(),
    getFollowing:        jest.fn(),
    getFollowStats:      jest.fn(),
    searchUsers:         jest.fn(),
    getFriendSuggestions: jest.fn(),
    follow:              jest.fn(),
    unfollow:            jest.fn(),
    removeFollower:      jest.fn(),
    isFollowing:         jest.fn(),
    areFriends:          jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowController],
      providers: [
        { provide: FollowService, useValue: mockService },
      ],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FollowController>(FollowController);
    service = module.get(FollowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFriends', () => {
    it('should return current user friends', async () => {
      mockService.getFriends.mockResolvedValue([mockFollowRelationship]);

      const result = await controller.getFriends(mockPayload as any);

      expect(result).toHaveLength(1);
      expect(mockService.getFriends).toHaveBeenCalledWith(1);
    });
  });

  describe('getFollowers', () => {
    it('should return current user followers', async () => {
      mockService.getFollowers.mockResolvedValue([mockFollowRelationship]);

      const result = await controller.getFollowers(mockPayload as any);

      expect(result).toHaveLength(1);
      expect(mockService.getFollowers).toHaveBeenCalledWith(1);
    });
  });

  describe('getFollowing', () => {
    it('should return users current user follows', async () => {
      mockService.getFollowing.mockResolvedValue([mockFollowRelationship]);

      const result = await controller.getFollowing(mockPayload as any);

      expect(result).toHaveLength(1);
      expect(mockService.getFollowing).toHaveBeenCalledWith(1);
    });
  });

  describe('getFollowStats', () => {
    it('should return follow statistics', async () => {
      const mockStats = { followersCount: 5, followingCount: 3, friendsCount: 2 };
      mockService.getFollowStats.mockResolvedValue(mockStats);

      const result = await controller.getFollowStats(mockPayload as any);

      expect(result).toEqual(mockStats);
      expect(mockService.getFollowStats).toHaveBeenCalledWith(1);
    });
  });

  describe('searchUsers', () => {
    it('should search users and return results', async () => {
      const mockResults = [{ id: 2, firstName: 'Alice', fullName: 'Alice Smith' }];
      mockService.searchUsers.mockResolvedValue(mockResults);

      const result = await controller.searchUsers('Alice', '10', mockPayload as any);

      expect(result).toEqual(mockResults);
      expect(mockService.searchUsers).toHaveBeenCalledWith('Alice', 1, 10);
    });

    it('should use default limit of 10 when none provided', async () => {
      mockService.searchUsers.mockResolvedValue([]);

      await controller.searchUsers('Alice', undefined as any, mockPayload as any);

      expect(mockService.searchUsers).toHaveBeenCalledWith('Alice', 1, 10);
    });
  });

  describe('getFriendSuggestions', () => {
    it('should return friend suggestions', async () => {
      const mockSuggestions = [{ user: { id: 3 }, mutualFriendsCount: 2, reason: 'Même département', score: 8 }];
      mockService.getFriendSuggestions.mockResolvedValue(mockSuggestions);

      const result = await controller.getFriendSuggestions('5', mockPayload as any);

      expect(result).toEqual(mockSuggestions);
      expect(mockService.getFriendSuggestions).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('follow', () => {
    it('should follow a user and return response', async () => {
      const mockResponse = { success: true, message: 'Now following', isFollowing: true };
      mockService.follow.mockResolvedValue(mockResponse);

      const result = await controller.follow(2, mockPayload as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.follow).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('unfollow', () => {
    it('should unfollow a user', async () => {
      const mockResponse = { success: true, message: 'Unfollowed' };
      mockService.unfollow.mockResolvedValue(mockResponse);

      await controller.unfollow(2, mockPayload as any);

      expect(mockService.unfollow).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('removeFollower', () => {
    it('should remove a follower', async () => {
      const mockResponse = { success: true, message: 'Follower removed successfully' };
      mockService.removeFollower.mockResolvedValue(mockResponse);

      const result = await controller.removeFollower(2, mockPayload as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.removeFollower).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('getUserFriends', () => {
    it('should return friends for a specific user', async () => {
      mockService.getFriends.mockResolvedValue([mockFollowRelationship]);

      const result = await controller.getUserFriends(5);

      expect(result).toHaveLength(1);
      expect(mockService.getFriends).toHaveBeenCalledWith(5);
    });
  });

  describe('getUserFollowers', () => {
    it('should return followers for a specific user', async () => {
      mockService.getFollowers.mockResolvedValue([mockFollowRelationship]);

      const result = await controller.getUserFollowers(5);

      expect(mockService.getFollowers).toHaveBeenCalledWith(5);
    });
  });

  describe('getUserFollowing', () => {
    it('should return following for a specific user', async () => {
      mockService.getFollowing.mockResolvedValue([]);

      await controller.getUserFollowing(5);

      expect(mockService.getFollowing).toHaveBeenCalledWith(5);
    });
  });

  describe('getUserFollowStats', () => {
    it('should return follow stats for a specific user', async () => {
      const mockStats = { followersCount: 10, followingCount: 8, friendsCount: 4 };
      mockService.getFollowStats.mockResolvedValue(mockStats);

      const result = await controller.getUserFollowStats(5);

      expect(result).toEqual(mockStats);
      expect(mockService.getFollowStats).toHaveBeenCalledWith(5);
    });
  });

  describe('getStatus', () => {
    it('should return follow status between two users', async () => {
      mockService.isFollowing
        .mockResolvedValueOnce(true)   // currentUser follows targetUser
        .mockResolvedValueOnce(false); // targetUser does not follow currentUser
      mockService.areFriends.mockResolvedValue(false);

      const result = await controller.getStatus(2, mockPayload as any);

      expect(result).toMatchObject({ isFollowing: true, isFollower: false, isFriend: false });
    });
  });
});
