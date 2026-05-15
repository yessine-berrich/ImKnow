import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { Session } from './entities/session.entity';

interface CreateSessionData {
  userId: number;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseUserAgent(ua: string = ''): {
    browser: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  } {
    const lower = ua.toLowerCase();

    let browser = 'Unknown';
    if (lower.includes('edg/')) browser = 'Edge';
    else if (lower.includes('chrome') && !lower.includes('chromium')) browser = 'Chrome';
    else if (lower.includes('firefox')) browser = 'Firefox';
    else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari';
    else if (lower.includes('opera') || lower.includes('opr/')) browser = 'Opera';

    let os = 'Unknown';
    if (lower.includes('windows')) os = 'Windows';
    else if (lower.includes('mac os') || lower.includes('macos')) os = 'macOS';
    else if (lower.includes('android')) os = 'Android';
    else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
    else if (lower.includes('linux')) os = 'Linux';

    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (lower.includes('ipad') || lower.includes('tablet')) deviceType = 'tablet';
    else if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone'))
      deviceType = 'mobile';

    return { browser, os, deviceType };
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    const { browser, os, deviceType } = this.parseUserAgent(data.userAgent);

    const session = this.sessionRepository.create({
      userId: data.userId,
      tokenHash: this.hashToken(data.token),
      browser,
      os,
      deviceType,
      // undefined (not null) so TypeORM treats the column as absent rather than an explicit null
      ipAddress: data.ipAddress ?? undefined,
      isActive: true,
      expiresAt: data.expiresAt,
      lastUsedAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    return this.sessionRepository
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.isActive = true')
      .andWhere('s.expiresAt > :now', { now: new Date() })
      .orderBy('s.lastUsedAt', 'DESC')
      .getMany();
  }

  async validateSession(rawToken: string): Promise<Session | null> {
    const hash = this.hashToken(rawToken);

    const session = await this.sessionRepository.findOne({
      where: { tokenHash: hash, isActive: true },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.update(session.id, { isActive: false });
      return null;
    }

    // Fire-and-forget: bump lastUsedAt without blocking the request
    this.sessionRepository.update(session.id, { lastUsedAt: new Date() }).catch(() => {});

    return session;
  }

  async revokeSession(sessionId: string, userId: number): Promise<{ message: string }> {
    await this.sessionRepository.update({ id: sessionId, userId }, { isActive: false });
    return { message: 'Session signed out successfully' };
  }

  async revokeAllUserSessions(userId: number, exceptSessionId?: string): Promise<void> {
    const qb = this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where('userId = :userId', { userId })
      .andWhere('isActive = true');

    if (exceptSessionId) {
      qb.andWhere('id != :exceptSessionId', { exceptSessionId });
    }

    await qb.execute();
  }

  async revokeByToken(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    await this.sessionRepository.update({ tokenHash: hash }, { isActive: false });
  }

  async getSessionByToken(rawToken: string): Promise<Session | null> {
    if (!rawToken) return null;
    const hash = this.hashToken(rawToken);
    return this.sessionRepository.findOne({ where: { tokenHash: hash } });
  }
}