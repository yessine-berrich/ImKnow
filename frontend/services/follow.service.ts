// services/follow.service.ts
import { getToken } from './auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ─────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────

export interface UserBriefDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImage?: string;
  department?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeenAt?: Date | string | null;
  email?: string;
}

export interface UserSearchResultDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isOnline?: boolean;
  lastSeenAt?: Date | string | null;
}

export interface FriendSuggestionDto {
  user: UserBriefDto;
  mutualFriendsCount: number;
  reason: string;
  score: number;
}

export interface FollowRelationshipDto {
  id: number;
  user: UserBriefDto;
  followedAt?: string;
  isOnline?: boolean;
}

export interface FollowStatsDto {
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  pendingRequestsCount: number;
}

export interface FollowResponseDto {
  success: boolean;
  message: string;
  relationship?: {
    id: number;
    followerId: number;
    followingId: number;
    status: string;
    createdAt: string;
  };
}

export interface StatusResponseDto {
  isFollowing: boolean;
  isFollower: boolean;
  isFriend: boolean;
}

// ─────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────

class FollowService {
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          window.location.href = '/signin';
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response);
  }

  private async post<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response);
  }

  // ─────────────────────────────────────────────────────────────
  // Follow / Unfollow (basé sur le controller)
  // ─────────────────────────────────────────────────────────────

  /**
   * Follow a user instantly
   * POST /api/follow/:userId
   */
  async follow(userId: number): Promise<FollowResponseDto> {
    return this.post<FollowResponseDto>(`/follow/${userId}`);
  }

  /**
   * Unfollow a user
   * DELETE /api/follow/:userId
   */
  async unfollow(userId: number): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/follow/${userId}`);
  }

  /**
   * Remove a follower
   * DELETE /api/follow/follower/:followerId
   */
  async removeFollower(followerId: number): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/follow/follower/${followerId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Lists
  // ─────────────────────────────────────────────────────────────

  /**
   * Get current user's friends (mutual follows)
   * GET /api/follow/friends
   */
  async getFriends(): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>('/follow/friends');
  }

  /**
   * Get a specific user's friends
   * GET /api/follow/friends/:userId
   */
  async getUserFriends(userId: number): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>(`/follow/friends/${userId}`);
  }

  /**
   * Get current user's followers
   * GET /api/follow/followers
   */
  async getFollowers(): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>('/follow/followers');
  }

  /**
   * Get a specific user's followers
   * GET /api/follow/followers/:userId
   */
  async getUserFollowers(userId: number): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>(`/follow/followers/${userId}`);
  }

  /**
   * Get users the current user is following
   * GET /api/follow/following
   */
  async getFollowing(): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>('/follow/following');
  }

  /**
   * Get users a specific user is following
   * GET /api/follow/following/:userId
   */
  async getUserFollowing(userId: number): Promise<FollowRelationshipDto[]> {
    return this.get<FollowRelationshipDto[]>(`/follow/following/${userId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Stats & Status
  // ─────────────────────────────────────────────────────────────

  /**
   * Get follow stats for current user
   * GET /api/follow/stats
   */
  async getFollowStats(): Promise<FollowStatsDto> {
    return this.get<FollowStatsDto>('/follow/stats');
  }

  /**
   * Get follow stats for a specific user
   * GET /api/follow/stats/:userId
   */
  async getUserFollowStats(userId: number): Promise<FollowStatsDto> {
    return this.get<FollowStatsDto>(`/follow/stats/${userId}`);
  }

  /**
   * Check follow/friend status with a user
   * GET /api/follow/status/:userId
   */
  async getStatus(userId: number): Promise<StatusResponseDto> {
    return this.get<StatusResponseDto>(`/follow/status/${userId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Search & Suggestions
  // ─────────────────────────────────────────────────────────────

  /**
   * Search users by name / department
   * GET /api/follow/search?query=John&limit=10
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserSearchResultDto[]> {
    const params = new URLSearchParams({ query, limit: limit.toString() });
    return this.get<UserSearchResultDto[]>(`/follow/search?${params}`);
  }

  /**
   * Get friend suggestions
   * GET /api/follow/suggestions?limit=10
   */
  async getFriendSuggestions(limit: number = 10): Promise<FriendSuggestionDto[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.get<FriendSuggestionDto[]>(`/follow/suggestions?${params}`);
  }
}

export const followService = new FollowService();
