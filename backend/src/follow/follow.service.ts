// src/follow/follow.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, DataSource, Not } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationType } from 'utils/constants';
import { NotificationService } from 'src/notification/notification.service';
import {
  UserBriefDto,
  FollowRelationshipDto,
  FollowStatsDto,
  FollowResponseDto,
  UserSearchResultDto,
  FriendSuggestionDto,
} from './dto/follow.dto';
import { ChatService } from 'src/chat/chat.service';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) { }

  // ─────────────────────────────────────────────────────────────
  // Core Follow Logic
  // ─────────────────────────────────────────────────────────────

  /**
   * Follow a user instantly (no request needed)
   */
  async follow(
    followerId: number,
    followingId: number,
  ): Promise<FollowResponseDto> {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });

    if (existing) {
      throw new ConflictException('You are already following this user');
    }

    const follow = this.followRepository.create({
      follower: { id: followerId },
      following: { id: followingId },
    });

    await this.followRepository.save(follow);

    // Check if this created a mutual follow (friendship)
    const mutualFollow = await this.followRepository.findOne({
      where: { follower: { id: followingId }, following: { id: followerId } },
    });

    const follower = await this.userRepository.findOne({ where: { id: followerId } });

    if (follower) {
      if (mutualFollow) {
        // Nouvelle amitié → initialiser la conversation
        await this.chatService.createSystemWelcomeMessage(followerId, followingId);

        await this.notificationService.createAndNotify(
          NotificationType.NEW_FOLLOWER,
          followingId,
          follower,
          `Vous et ${follower.firstName} ${follower.lastName} êtes maintenant amis`,
          { followerId: follower.id },
        );
      } else {
        // One-way follow — notify the followed user
        if (targetUser.emailNotificationsEnabled) {
          await this.notificationService.createAndNotify(
            NotificationType.NEW_FOLLOWER,
            followingId,
            follower,
            `${follower.firstName} ${follower.lastName} started following you`,
            { followerId: follower.id },
          );
        }
      }
    }

    return {
      success: true,
      message: mutualFollow
        ? `You and ${targetUser.firstName} are now friends!`
        : `You are now following ${targetUser.firstName}`,
      isFollowing: true,
    };
  }

  /**
   * Unfollow a user
   */
  async unfollow(
    followerId: number,
    followingId: number,
  ): Promise<{ success: boolean; message: string }> {
    const follow = await this.followRepository.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });

    if (!follow) {
      throw new NotFoundException('You are not following this user');
    }

    await this.followRepository.remove(follow);

    return {
      success: true,
      message: 'Successfully unfollowed user',
    };
  }

  /**
   * Remove a follower
   */
  async removeFollower(
    userId: number,
    followerId: number,
  ): Promise<{ success: boolean; message: string }> {
    const follow = await this.followRepository.findOne({
      where: {
        follower: { id: followerId },
        following: { id: userId },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follower relationship not found');
    }

    await this.followRepository.remove(follow);

    return {
      success: true,
      message: 'Follower removed successfully',
    };
  }

  /**
   * Check if userId1 follows userId2
   */
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    return !!follow;
  }

  /**
   * Check if two users are friends (mutual follows)
   */
  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const [ab, ba] = await Promise.all([
      this.isFollowing(userId1, userId2),
      this.isFollowing(userId2, userId1),
    ]);
    return ab && ba;
  }

  // ─────────────────────────────────────────────────────────────
  // Lists
  // ─────────────────────────────────────────────────────────────

  /**
   * Get user's friends (mutual follows)
   */
  async getFriends(userId: number): Promise<FollowRelationshipDto[]> {
    const followers = await this.followRepository.find({
      where: { following: { id: userId } },
      relations: ['follower'],
    });

    const following = await this.followRepository.find({
      where: { follower: { id: userId } },
      relations: ['following'],
    });

    const followingIds = new Set(following.map((f) => f.following.id));

    const friends: FollowRelationshipDto[] = [];
    for (const f of followers) {
      if (followingIds.has(f.follower.id)) {
        friends.push({
          id: f.id,
          user: this.toUserBrief(f.follower),
          followedAt: f.createdAt,
          isOnline: f.follower.isOnline,
        });
      }
    }

    friends.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.user.fullName.localeCompare(b.user.fullName);
    });

    return friends;
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: number): Promise<FollowRelationshipDto[]> {
    const followers = await this.followRepository.find({
      where: { following: { id: userId } },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
    });

    return followers.map((f) => ({
      id: f.id,
      user: this.toUserBrief(f.follower),
      followedAt: f.createdAt,
      isOnline: f.follower.isOnline,
    }));
  }

  /**
   * Get users the current user is following
   */
  async getFollowing(userId: number): Promise<FollowRelationshipDto[]> {
    const following = await this.followRepository.find({
      where: { follower: { id: userId } },
      relations: ['following'],
      order: { createdAt: 'DESC' },
    });

    return following.map((f) => ({
      id: f.id,
      user: this.toUserBrief(f.following),
      followedAt: f.createdAt,
      isOnline: f.following.isOnline,
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────

  async getFollowStats(userId: number): Promise<FollowStatsDto> {
    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.count({ where: { following: { id: userId } } }),
      this.followRepository.count({ where: { follower: { id: userId } } }),
    ]);

    // Friends = mutual follows
    const followers = await this.followRepository.find({
      where: { following: { id: userId } },
      relations: ['follower'],
    });
    const followingIds = new Set(
      (
        await this.followRepository.find({
          where: { follower: { id: userId } },
          relations: ['following'],
        })
      ).map((f) => f.following.id),
    );

    const friendsCount = followers.filter((f) =>
      followingIds.has(f.follower.id),
    ).length;

    return { followersCount, followingCount, friendsCount };
  }

  // ─────────────────────────────────────────────────────────────
  // BF4 – User Search
  // ─────────────────────────────────────────────────────────────

  async searchUsers(
    query: string,
    currentUserId: number,
    limit: number = 10,
  ): Promise<UserSearchResultDto[]> {
    if (!query || query.trim().length < 2) return [];

    const searchTerm = query.trim();

    const users = await this.userRepository.find({
      where: [
        { firstName: ILike(`%${searchTerm}%`) as any, id: Not(currentUserId) },
        { lastName: ILike(`%${searchTerm}%`) as any, id: Not(currentUserId) },
        { department: ILike(`%${searchTerm}%`) as any, id: Not(currentUserId) },
      ],
      take: limit,
    });

    const userIds = users.map((u) => u.id);
    const follows = await this.followRepository.find({
      where: [
        { follower: { id: currentUserId }, following: In(userIds) },
        { follower: In(userIds), following: { id: currentUserId } },
      ],
      relations: ['follower', 'following'],
    });

    const followMap = new Map<string, Follow>();
    for (const f of follows) {
      followMap.set(`${f.follower.id}-${f.following.id}`, f);
    }

    const results: UserSearchResultDto[] = [];
    for (const user of users) {
      const isFollowing = !!followMap.get(`${currentUserId}-${user.id}`);
      const isFollower = !!followMap.get(`${user.id}-${currentUserId}`);
      const mutualFriendsCount = await this.getMutualFriendsCount(currentUserId, user.id);

      results.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        profileImage: user.profileImage,
        department: user.department,
        bio: user.bio,
        isOnline: user.isOnline,
        mutualFriendsCount,
        isFollowing,
        isFollower,
        isFriend: isFollowing && isFollower,
      });
    }

    results.sort((a, b) => {
      const aMutual = a.mutualFriendsCount ?? 0;
      const bMutual = b.mutualFriendsCount ?? 0;
      if (aMutual !== bMutual) return bMutual - aMutual;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return 0;
    });

    return results;
  }

  /**
   * Multi-signal friend suggestions (Facebook-style):
   * 1. Users who follow you but you don't follow back  (+30)
   * 2. Friends-of-friends / mutual connections          (+10 per mutual)
   * 3. Common publication interactions (liked same publications)(+4 per common)
   * 4. Same department                                  (+8)
   * 5. Online now bonus                                 (+5)
   * 6. Recently active (last 7 days)                   (+3)
   *
   * Only excludes users the current user is already FOLLOWING (not followers).
   */
  async getFriendSuggestions(
    currentUserId: number,
    limit: number = 10,
  ): Promise<FriendSuggestionDto[]> {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    // Who I already follow (outgoing only — I don't exclude people who follow me)
    const myFollowings = await this.followRepository.find({
      where: { follower: { id: currentUserId } },
      relations: ['following'],
    });
    const followingIds = new Set<number>(myFollowings.map((f) => f.following.id));
    followingIds.add(currentUserId);

    const currentUser = await this.userRepository.findOne({ where: { id: currentUserId } });

    // score accumulator: userId → { score, mutualCount, reasons[] }
    interface ScoreEntry { score: number; mutualCount: number; reasons: Set<string> }
    const scores = new Map<number, ScoreEntry>();
    const userCache = new Map<number, User>();

    const entry = (id: number): ScoreEntry => {
      if (!scores.has(id)) scores.set(id, { score: 0, mutualCount: 0, reasons: new Set() });
      return scores.get(id)!;
    };

    // ── Signal 1: they follow me, I don't follow back ─────────────────────
    const myFollowers = await this.followRepository.find({
      where: { following: { id: currentUserId } },
      relations: ['follower'],
    });
    for (const f of myFollowers) {
      if (!followingIds.has(f.follower.id)) {
        const e = entry(f.follower.id);
        e.score += 30;
        e.reasons.add('Vous suit');
        userCache.set(f.follower.id, f.follower);
      }
    }

    // ── Signal 2: friends-of-friends ──────────────────────────────────────
    // Mutual connection = someone in my network (follow or follower) who also
    // knows the candidate. We only exclude people I'm already following.
    const fofRows: { id: number; firstName: string; lastName: string; profileImage: string; department: string; bio: string; isOnline: boolean; email: string; mutual_count: string }[] =
      await this.dataSource.query(
        `
        WITH my_connections AS (
          SELECT "followingId" AS conn_id FROM follows WHERE "followerId" = $1
          UNION
          SELECT "followerId"  AS conn_id FROM follows WHERE "followingId" = $1
        ),
        candidate_mutuals AS (
          SELECT
            u.id                          AS candidate_id,
            COUNT(DISTINCT mc.conn_id)    AS mutual_count
          FROM users u
          JOIN follows f ON (f."followerId" = u.id OR f."followingId" = u.id)
          JOIN my_connections mc ON (
            (f."followerId"  = mc.conn_id AND f."followingId" = u.id)
            OR
            (f."followingId" = mc.conn_id AND f."followerId"  = u.id)
          )
          WHERE u.id != $1
            AND u.id NOT IN (SELECT "followingId" FROM follows WHERE "followerId" = $1)
          GROUP BY u.id
          HAVING COUNT(DISTINCT mc.conn_id) > 0
        )
        SELECT
          u.id,
          u."firstName",
          u."lastName",
          u.email,
          u."profileImage",
          u.department,
          u.bio,
          u."isOnline",
          cm.mutual_count
        FROM candidate_mutuals cm
        JOIN users u ON u.id = cm.candidate_id
        ORDER BY cm.mutual_count DESC
        LIMIT $2
        `,
        [currentUserId, limit * 3],
      );

    for (const row of fofRows) {
      const uid = Number(row.id);
      const mutualCount = parseInt(row.mutual_count) || 0;
      const e = entry(uid);
      e.score += mutualCount * 10;
      e.mutualCount = Math.max(e.mutualCount, mutualCount);
      if (mutualCount > 0) {
        e.reasons.add(`${mutualCount} ami${mutualCount > 1 ? 's' : ''} en commun`);
      }
      if (!userCache.has(uid)) userCache.set(uid, row as unknown as User);
    }

    // ── Signal 3: common publication likes ───────────────────────────────────
    try {
      const commonLikes: { candidate_id: string; common_count: string }[] =
        await this.dataSource.query(
          `
          SELECT al2."usersId" AS candidate_id, COUNT(*) AS common_count
          FROM publication_likes al1
          JOIN publication_likes al2 ON al1."publicationsId" = al2."publicationsId"
          WHERE al1."usersId" = $1
            AND al2."usersId" != $1
            AND al2."usersId" NOT IN (
              SELECT "followingId" FROM follows WHERE "followerId" = $1
            )
          GROUP BY al2."usersId"
          HAVING COUNT(*) > 0
          `,
          [currentUserId],
        );

      for (const row of commonLikes) {
        const uid = Number(row.candidate_id);
        if (uid === currentUserId) continue;
        const e = entry(uid);
        e.score += parseInt(row.common_count) * 4;
        e.reasons.add('Intérêts communs');
      }
    } catch {
      // table may not exist yet — skip signal silently
    }

    // ── Signal 4: same department ─────────────────────────────────────────
    if (currentUser?.department) {
      const deptUsers = await this.userRepository.find({
        where: {
          department: currentUser.department,
          id: Not(In([...followingIds])),
        },
        take: 30,
      });
      for (const u of deptUsers) {
        const e = entry(u.id);
        e.score += 8;
        e.reasons.add('Même département');
        if (!userCache.has(u.id)) userCache.set(u.id, u);
      }
    }

    // ── Load full user data + apply online / recency bonuses ─────────────
    const candidateIds = [...scores.keys()];
    if (candidateIds.length === 0) return [];

    const freshUsers = await this.userRepository.findBy({ id: In(candidateIds) });
    for (const u of freshUsers) {
      userCache.set(u.id, u); // overwrite with fresh data

      const e = scores.get(u.id)!;
      if (u.isOnline) e.score += 5;
      if (u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < WEEK_MS) {
        e.score += 3;
      }
    }

    // ── Build result list ─────────────────────────────────────────────────
    const results: FriendSuggestionDto[] = [];

    for (const [uid, data] of scores) {
      const u = userCache.get(uid);
      if (!u) continue;

      // Pick the most informative reason
      let reason = 'Suggestion pour vous';
      if (data.reasons.has('Vous suit')) reason = 'Vous suit';
      else if ([...data.reasons].some((r) => r.includes('en commun'))) {
        reason = [...data.reasons].find((r) => r.includes('en commun'))!;
      } else if (data.reasons.has('Intérêts communs')) reason = 'Intérêts communs';
      else if (data.reasons.has('Même département')) reason = 'Même département';

      results.push({
        user: {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          fullName: `${u.firstName} ${u.lastName}`,
          email: u.email,
          profileImage: u.profileImage,
          department: u.department,
          bio: u.bio,
          isOnline: u.isOnline,
        },
        mutualFriendsCount: data.mutualCount,
        reason,
        score: data.score,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────

  private toUserBrief(user: User): UserBriefDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profileImage: user.profileImage,
      department: user.department,
      bio: user.bio,
      isOnline: user.isOnline,
    };
  }

  private async getMutualFriendsCount(
    userId1: number,
    userId2: number,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `
      WITH user1_connections AS (
        SELECT 
          CASE WHEN "followerId" = $1 THEN "followingId" ELSE "followerId" END as conn_id
        FROM follows
        WHERE "followerId" = $1 OR "followingId" = $1
      ),
      user2_connections AS (
        SELECT 
          CASE WHEN "followerId" = $2 THEN "followingId" ELSE "followerId" END as conn_id
        FROM follows
        WHERE "followerId" = $2 OR "followingId" = $2
      )
      SELECT COUNT(*) as mutual_count
      FROM user1_connections u1
      INNER JOIN user2_connections u2 ON u1.conn_id = u2.conn_id
      `,
      [userId1, userId2],
    );

    return parseInt(result[0]?.mutual_count || '0');
  }
}