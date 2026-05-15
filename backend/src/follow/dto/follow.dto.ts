// src/follow/dto/follow.dto.ts

export class UserBriefDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  profileImage?: string | null;
  department?: string;
  bio?: string;
  isOnline?: boolean;
}

export class FollowRelationshipDto {
  id: number;
  user: UserBriefDto;
  followedAt: Date;
  isOnline?: boolean;
}

export class FollowStatsDto {
  followersCount: number;
  followingCount: number;
  friendsCount: number; // Mutual follows
}

export class FollowResponseDto {
  success: boolean;
  message: string;
  isFollowing: boolean;
}

export class UserSearchResultDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImage?: string | null;
  department?: string;
  bio?: string;
  isOnline?: boolean;
  mutualFriendsCount?: number;
  isFollowing?: boolean;  // current user follows them
  isFollower?: boolean;   // they follow current user
  isFriend?: boolean;     // mutual follow
}

export class FriendSuggestionDto {
  user: UserBriefDto;
  mutualFriendsCount: number;
  reason: string;
  score: number;
}