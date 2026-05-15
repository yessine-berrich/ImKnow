// src/follow/follow.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { CurrentPayload } from 'src/users/decorators/current-payload.decorator';
import type { JwtPayloadType } from 'utils/types';
import {
  UserSearchResultDto,
  FriendSuggestionDto,
  FollowRelationshipDto,
  FollowStatsDto,
  FollowResponseDto,
} from './dto/follow.dto';

@Controller('api/follow')
@UseGuards(AuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ─────────────────────────────────────────────────────────────
  // IMPORTANT: All literal (non-parameterized) routes MUST be declared
  // before parameterized routes like /:userId to avoid NestJS matching
  // "friends", "followers", "following", "stats", "search", "suggestions"
  // as a userId param.
  // ─────────────────────────────────────────────────────────────

  // ─── Literal list routes ─────────────────────────────────────

  /**
   * GET /api/follow/friends  — current user's mutual follows
   */
  @Get('friends')
  async getFriends(
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFriends(payload.sub);
  }

  /**
   * GET /api/follow/followers  — current user's followers
   */
  @Get('followers')
  async getFollowers(
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFollowers(payload.sub);
  }

  /**
   * GET /api/follow/following  — users the current user follows
   */
  @Get('following')
  async getFollowing(
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFollowing(payload.sub);
  }

  /**
   * GET /api/follow/stats  — follow stats for the current user
   */
  @Get('stats')
  async getFollowStats(
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FollowStatsDto> {
    return this.followService.getFollowStats(payload.sub);
  }

  /**
   * GET /api/follow/search?query=John&limit=10
   */
  @Get('search')
  async searchUsers(
    @Query('query') query: string,
    @Query('limit') limit: string,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<UserSearchResultDto[]> {
    return this.followService.searchUsers(
      query,
      payload.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /api/follow/suggestions?limit=10
   */
  @Get('suggestions')
  async getFriendSuggestions(
    @Query('limit') limit: string,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FriendSuggestionDto[]> {
    return this.followService.getFriendSuggestions(
      payload.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ─── Literal follower-removal route ──────────────────────────
  // Must come before /:userId so "follower" is not treated as a userId.

  /**
   * DELETE /api/follow/follower/:followerId  — remove a follower
   */
  @Delete('follower/:followerId')
  @HttpCode(HttpStatus.OK)
  async removeFollower(
    @Param('followerId', ParseIntPipe) followerId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<{ success: boolean; message: string }> {
    return this.followService.removeFollower(payload.sub, followerId);
  }

  // ─── Parameterized routes ─────────────────────────────────────

  /**
   * GET /api/follow/friends/:userId
   */
  @Get('friends/:userId')
  async getUserFriends(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFriends(userId);
  }

  /**
   * GET /api/follow/followers/:userId
   */
  @Get('followers/:userId')
  async getUserFollowers(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFollowers(userId);
  }

  /**
   * GET /api/follow/following/:userId
   */
  @Get('following/:userId')
  async getUserFollowing(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FollowRelationshipDto[]> {
    return this.followService.getFollowing(userId);
  }

  /**
   * GET /api/follow/stats/:userId
   */
  @Get('stats/:userId')
  async getUserFollowStats(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FollowStatsDto> {
    return this.followService.getFollowStats(userId);
  }

  /**
   * GET /api/follow/status/:userId
   */
  @Get('status/:userId')
  async getStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<{ isFollowing: boolean; isFollower: boolean; isFriend: boolean }> {
    const [isFollowing, isFollower] = await Promise.all([
      this.followService.isFollowing(payload.sub, userId),
      this.followService.isFollowing(userId, payload.sub),
    ]);
    return { isFollowing, isFollower, isFriend: isFollowing && isFollower };
  }

  // ─── Follow / Unfollow ────────────────────────────────────────

  /**
   * POST /api/follow/:userId
   */
  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  async follow(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<FollowResponseDto> {
    return this.followService.follow(payload.sub, userId);
  }

  /**
   * DELETE /api/follow/:userId
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ): Promise<{ success: boolean; message: string }> {
    return this.followService.unfollow(payload.sub, userId);
  }
}