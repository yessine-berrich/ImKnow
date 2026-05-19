// src/admin-reports/admin-reports.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { Publication } from 'src/publication/entities/publication.entity';
import { User } from 'src/users/entities/user.entity';
import { PublicationStatus, NotificationType, UserStatus } from 'utils/constants';
import { NotificationService } from 'src/notification/notification.service';

// ─── Configuration IA ─────────────────────────────────────────────────────────

const REASON_SEVERITY: Record<string, number> = {
  hate_speech:            10,
  harassment:              9,
  impersonation:           8,
  inappropriate_content:   7,
  misinformation:          6,
  plagiarism:              5,
  spam:                    3,
  other:                   2,
};

export interface AutoModerationConfig {
  autoBanThreshold: number;
  autoWarnThreshold: number;
  reviewThreshold: number;
  timeWindowHours: number;
  minUniqueReporters: number;
}

const DEFAULT_MODERATION_CONFIG: AutoModerationConfig = {
  autoBanThreshold: 25,
  autoWarnThreshold: 12,
  reviewThreshold: 5,
  timeWindowHours: 24,
  minUniqueReporters: 2,
};

function computeRiskScore(reports: { reason: string; createdAt: Date }[], timeWindowHours?: number): number {
  let reportsToConsider = reports;
  if (timeWindowHours) {
    const cutoff = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    reportsToConsider = reports.filter((r) => r.createdAt >= cutoff);
  }
  return reportsToConsider.reduce((sum, r) => {
    const severity = REASON_SEVERITY[r.reason] ?? 2;
    const age = Date.now() - new Date(r.createdAt).getTime();
    const recencyMultiplier = age < 24 * 60 * 60 * 1000 ? 1.5 : 1;
    return sum + severity * recencyMultiplier;
  }, 0);
}

function getRiskLevel(score: number, recentCount: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 30 || recentCount >= 10) return 'critical';
  if (score >= 15 || recentCount >= 5)  return 'high';
  if (score >= 8  || recentCount >= 2)  return 'medium';
  return 'low';
}

function getPriorityLevel(riskLevel: string, score: number, trend: 'up' | 'down' | 'stable'): 'urgent' | 'high' | 'normal' | 'low' {
  if (trend === 'up' && (riskLevel === 'critical' || riskLevel === 'high')) return 'urgent';
  if (score > 40) return 'urgent';
  if (score > 25) return 'high';
  const base = riskLevel === 'critical' ? 'high' : riskLevel === 'high' ? 'normal' : riskLevel === 'medium' ? 'normal' : 'low';
  return base as any;
}

function calculateTrend(historicalScores: number[]): 'up' | 'down' | 'stable' {
  if (historicalScores.length < 3) return 'stable';
  const recent = historicalScores.slice(-3);
  if (recent[1] < recent[2]) return 'up';
  if (recent[1] > recent[2]) return 'down';
  return 'stable';
}

function recentReports(reports: { createdAt: Date }[], hours: number = 24): number {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return reports.filter((r) => r.createdAt >= cutoff).length;
}

function getAutoDecision(
  score: number,
  uniqueReporters: number,
  config: AutoModerationConfig,
): { decision: 'auto_ban' | 'auto_warn' | 'auto_dismiss' | 'human_review'; confidence: number } {
  if (score >= config.autoBanThreshold && uniqueReporters >= config.minUniqueReporters) {
    return { decision: 'auto_ban', confidence: 0.95 };
  }
  if (score >= config.autoWarnThreshold) {
    return { decision: 'auto_warn', confidence: 0.85 };
  }
  if (score < config.reviewThreshold) {
    return { decision: 'auto_dismiss', confidence: 0.75 };
  }
  return { decision: 'human_review', confidence: 0.6 };
}

export type ReportAction =
  | 'dismiss_all'
  | 'review_all'
  | 'unpublish'
  | 'republish'
  | 'warn_author'
  | 'warn'
  | 'ban'
  | 'unban';

@Injectable()
export class AdminReportsService {
  private moderationConfig: AutoModerationConfig = { ...DEFAULT_MODERATION_CONFIG };

  constructor(
    @InjectRepository(PublicationReport)
    private readonly publicationReportRepo: Repository<PublicationReport>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
    @InjectRepository(Publication)
    private readonly publicationRepo: Repository<Publication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLICATION REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getReportedPublications(opts: {
    status?: string;
    riskLevel?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(50, opts.limit ?? 20);

    const qb = this.publicationReportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.publication', 'publication')
      .leftJoinAndSelect('publication.author', 'author')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .orderBy('r.createdAt', 'DESC');

    if (opts.status && opts.status !== 'all') {
      qb.andWhere('r.status = :status', { status: opts.status });
    }

    const allReports = await qb.getMany();

    const byPublication = new Map<number, typeof allReports>();
    for (const rep of allReports) {
      if (!rep.publication) continue;
      const id = rep.publication.id;
      if (!byPublication.has(id)) byPublication.set(id, []);
      byPublication.get(id)!.push(rep);
    }

    let entries = Array.from(byPublication.entries()).map(([publicationId, reports]) => {
      const publication = reports[0].publication!;
      const author  = (publication as any).author;
      const score   = computeRiskScore(reports, this.moderationConfig.timeWindowHours);
      const recent  = recentReports(reports, this.moderationConfig.timeWindowHours);
      const level   = getRiskLevel(score, recent);
      const trend   = calculateTrend([score * 0.8, score * 0.9, score]);
      const priority = getPriorityLevel(level, score, trend);

      const reasonMap = new Map<string, { count: number; severity: number }>();
      reports.forEach((r) => {
        const existing = reasonMap.get(r.reason) || { count: 0, severity: REASON_SEVERITY[r.reason] ?? 2 };
        existing.count++;
        reasonMap.set(r.reason, existing);
      });
      const reasons = Array.from(reasonMap.entries())
        .map(([reason, data]) => ({ reason, count: data.count, severity: data.severity }))
        .sort((a, b) => b.severity - a.severity);

      return {
        publicationId,
        title:          publication.title,
        publicationStatus:  publication.status,
        authorId:       author?.id ?? null,
        authorName:     author ? `${author.firstName} ${author.lastName}`.trim() : 'Inconnu',
        reportCount:    reports.length,
        pendingCount:   reports.filter((r) => r.status === 'pending').length,
        reviewedCount:  reports.filter((r) => r.status === 'reviewed').length,
        dismissedCount: reports.filter((r) => r.status === 'dismissed').length,
        riskScore:      score,
        riskLevel:      level,
        priority,
        recentCount:    recent,
        topReason:      reasons[0]?.reason ?? null,
        reasons,
        firstReportAt:  reports[reports.length - 1]?.createdAt ?? null,
        lastReportAt:   reports[0]?.createdAt ?? null,
        uniqueReporters: new Set(reports.map((r) => r.reporter?.id)).size,
        trend,
      };
    });

    if (opts.riskLevel && opts.riskLevel !== 'all') {
      entries = entries.filter((e) => e.riskLevel === opts.riskLevel);
    }
    if (opts.priority && opts.priority !== 'all') {
      entries = entries.filter((e) => e.priority === opts.priority);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      entries = entries.filter(
        (e) => e.title.toLowerCase().includes(q) || e.authorName.toLowerCase().includes(q),
      );
    }

    const PRIORITY_ORDER = { urgent: 5, high: 4, normal: 3, low: 2 };
    const LEVEL_ORDER    = { critical: 4, high: 3, medium: 2, low: 1 };
    entries.sort((a, b) => {
      const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
      if (pd !== 0) return pd;
      const ld = (LEVEL_ORDER[b.riskLevel] ?? 0) - (LEVEL_ORDER[a.riskLevel] ?? 0);
      if (ld !== 0) return ld;
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return b.pendingCount - a.pendingCount;
    });

    const total     = entries.length;
    const paginated = entries.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        critical:     entries.filter((e) => e.riskLevel === 'critical').length,
        high:         entries.filter((e) => e.riskLevel === 'high').length,
        medium:       entries.filter((e) => e.riskLevel === 'medium').length,
        low:          entries.filter((e) => e.riskLevel === 'low').length,
        urgent:       entries.filter((e) => e.priority === 'urgent').length,
        totalPending: entries.reduce((s, e) => s + e.pendingCount, 0),
      },
    };
  }

  async getPublicationReportDetail(publicationId: number) {
    const publication = await this.publicationRepo.findOne({
      where: { id: publicationId },
      relations: ['author'],
    });
    if (!publication) throw new NotFoundException('Publication introuvable');

    const reports = await this.publicationReportRepo.find({
      where: { publication: { id: publicationId } },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });

    const score  = computeRiskScore(reports, this.moderationConfig.timeWindowHours);
    const recent = recentReports(reports, this.moderationConfig.timeWindowHours);
    const level  = getRiskLevel(score, recent);
    const trend  = calculateTrend([score * 0.7, score * 0.85, score]);
    const priority = getPriorityLevel(level, score, trend);
    const autoDecision = getAutoDecision(
      score,
      new Set(reports.map((r) => r.reporter?.id)).size,
      this.moderationConfig,
    );

    const reasonMap = new Map<string, { count: number; severity: number }>();
    reports.forEach((r) => {
      const existing = reasonMap.get(r.reason) || { count: 0, severity: REASON_SEVERITY[r.reason] ?? 2 };
      existing.count++;
      reasonMap.set(r.reason, existing);
    });

    return {
      publication: {
        id:      publication.id,
        title:   publication.title,
        status:  publication.status,
        content: publication.content?.slice(0, 400) + (publication.content?.length > 400 ? '…' : ''),
        author: {
          id:   (publication as any).author?.id,
          name: (publication as any).author ? `${(publication as any).author.firstName} ${(publication as any).author.lastName}`.trim() : 'Inconnu',
        },
        createdAt: publication.createdAt,
      },
      intelligence: {
        riskScore:       score,
        riskLevel:       level,
        priority,
        recentCount:     recent,
        uniqueReporters: new Set(reports.map((r) => r.reporter?.id)).size,
        topReasons: Array.from(reasonMap.entries())
          .map(([reason, data]) => ({ reason, count: data.count, severity: data.severity }))
          .sort((a, b) => b.severity - a.severity),
        recommendation: this.getPublicationRecommendation(level, reports, score),
        autoDecision:   autoDecision.decision,
        confidence:     autoDecision.confidence,
        trend,
      },
      reports: reports.map((r) => ({
        id:        r.id,
        reason:    r.reason,
        details:   r.details,
        status:    r.status,
        createdAt: r.createdAt,
        reporter: {
          id:   r.reporter?.id,
          name: r.reporter ? `${r.reporter.firstName} ${r.reporter.lastName}`.trim() : 'Inconnu',
        },
      })),
    };
  }

  async takeActionOnPublication(publicationId: number, action: ReportAction, adminId: number, note?: string) {
    const publication = await this.publicationRepo.findOne({
      where: { id: publicationId },
      relations: ['author'],
    });
    if (!publication) throw new NotFoundException('Publication introuvable');

    const pendingReports = await this.publicationReportRepo.find({
      where: { publication: { id: publicationId }, status: 'pending' },
    });

    let message = '';
    switch (action) {
      case 'dismiss_all':
        await this.publicationReportRepo.update(
          { publication: { id: publicationId }, status: 'pending' },
          { status: 'dismissed' },
        );
        message = `${pendingReports.length} signalement(s) clôturé(s)`;
        break;

      case 'review_all':
        await this.publicationReportRepo.update(
          { publication: { id: publicationId }, status: 'pending' },
          { status: 'reviewed' },
        );
        message = `${pendingReports.length} signalement(s) marqué(s) comme examiné(s)`;
        break;

      case 'unpublish':
        await this.publicationRepo.update(publicationId, { status: PublicationStatus.REJECTED });
        await this.publicationReportRepo.update(
          { publication: { id: publicationId }, status: 'pending' },
          { status: 'reviewed' },
        );
        if ((publication as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.PUBLICATION_REJECTED,
            (publication as any).author,
            null,
            `Votre publication "${publication.title}" a été dépublié suite à des signalements.${note ? ` Note : ${note}` : ''}`,
            { publicationId },
          );
        }
        message = 'Publication dépublié et signalements marqués comme examinés';
        break;

      case 'republish':
        await this.publicationRepo.update(publicationId, { status: PublicationStatus.PUBLISHED });
        await this.publicationReportRepo.update(
          { publication: { id: publicationId } },
          { status: 'dismissed' },
        );
        if ((publication as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.PUBLICATION_PUBLISHED,
            (publication as any).author,
            null,
            `Votre publication "${publication.title}" a été réactivé par un administrateur.`,
            { publicationId },
          );
        }
        message = 'Publication republié et signalements clôturés';
        break;

      case 'warn_author':
        await this.publicationReportRepo.update(
          { publication: { id: publicationId }, status: 'pending' },
          { status: 'reviewed' },
        );
        if ((publication as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.SYSTEM_INFO,
            (publication as any).author,
            null,
            `Avertissement : votre publication "${publication.title}" a été signalé plusieurs fois. Merci de respecter les règles de la communauté.${note ? ` Message de l'admin : ${note}` : ''}`,
            { publicationId },
          );
        }
        message = 'Avertissement envoyé à l\'auteur, signalements marqués comme examinés';
        break;

      default:
        throw new BadRequestException(`Action "${action}" non valide pour un publication`);
    }

    return { message, action };
  }

  // ── Bulk publication actions ──────────────────────────────────────────────────

  async bulkPublicationAction(publicationIds: number[], action: ReportAction, adminId: number, note?: string) {
    const results = await Promise.allSettled(
      publicationIds.map((id) => this.takeActionOnPublication(id, action, adminId, note)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.length - succeeded;
    return { message: `${succeeded} publication(s) traité(s)${failed ? `, ${failed} erreur(s)` : ''}`, processed: succeeded };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getReportedUsers(opts: {
    status?: string;
    riskLevel?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(50, opts.limit ?? 20);

    const qb = this.userReportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reportedUser', 'reportedUser')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .orderBy('r.createdAt', 'DESC');

    if (opts.status && opts.status !== 'all') {
      qb.andWhere('r.status = :status', { status: opts.status });
    }

    const allReports = await qb.getMany();

    const byUser = new Map<number, typeof allReports>();
    for (const rep of allReports) {
      if (!rep.reportedUser) continue;
      const id = rep.reportedUser.id;
      if (!byUser.has(id)) byUser.set(id, []);
      byUser.get(id)!.push(rep);
    }

    let entries = Array.from(byUser.entries()).map(([userId, reports]) => {
      const user   = reports[0].reportedUser!;
      const score  = computeRiskScore(reports, this.moderationConfig.timeWindowHours);
      const recent = recentReports(reports, this.moderationConfig.timeWindowHours);
      const level  = getRiskLevel(score, recent);
      const trend  = calculateTrend([score * 0.8, score * 0.9, score]);
      const priority = getPriorityLevel(level, score, trend);

      const reasonMap = new Map<string, { count: number; severity: number }>();
      reports.forEach((r) => {
        const existing = reasonMap.get(r.reason) || { count: 0, severity: REASON_SEVERITY[r.reason] ?? 2 };
        existing.count++;
        reasonMap.set(r.reason, existing);
      });
      const reasons = Array.from(reasonMap.entries())
        .map(([reason, data]) => ({ reason, count: data.count, severity: data.severity }))
        .sort((a, b) => b.severity - a.severity);

      return {
        userId,
        userName:       `${user.firstName} ${user.lastName}`.trim(),
        userEmail:      user.email ?? '',
        department:     user.department ?? '',
        isActive:       user.status === UserStatus.ACTIVE,
        reportCount:    reports.length,
        pendingCount:   reports.filter((r) => r.status === 'pending').length,
        reviewedCount:  reports.filter((r) => r.status === 'reviewed').length,
        dismissedCount: reports.filter((r) => r.status === 'dismissed').length,
        riskScore:      score,
        riskLevel:      level,
        priority,
        recentCount:    recent,
        topReason:      reasons[0]?.reason ?? null,
        reasons,
        firstReportAt:  reports[reports.length - 1]?.createdAt ?? null,
        lastReportAt:   reports[0]?.createdAt ?? null,
        uniqueReporters: new Set(reports.map((r) => r.reporter?.id)).size,
        trend,
      };
    });

    if (opts.riskLevel && opts.riskLevel !== 'all') {
      entries = entries.filter((e) => e.riskLevel === opts.riskLevel);
    }
    if (opts.priority && opts.priority !== 'all') {
      entries = entries.filter((e) => e.priority === opts.priority);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.userName.toLowerCase().includes(q) ||
          e.userEmail.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q),
      );
    }

    const PRIORITY_ORDER = { urgent: 5, high: 4, normal: 3, low: 2 };
    const LEVEL_ORDER    = { critical: 4, high: 3, medium: 2, low: 1 };
    entries.sort((a, b) => {
      const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
      if (pd !== 0) return pd;
      const ld = (LEVEL_ORDER[b.riskLevel] ?? 0) - (LEVEL_ORDER[a.riskLevel] ?? 0);
      if (ld !== 0) return ld;
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return b.pendingCount - a.pendingCount;
    });

    const total     = entries.length;
    const paginated = entries.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        critical:     entries.filter((e) => e.riskLevel === 'critical').length,
        high:         entries.filter((e) => e.riskLevel === 'high').length,
        medium:       entries.filter((e) => e.riskLevel === 'medium').length,
        low:          entries.filter((e) => e.riskLevel === 'low').length,
        urgent:       entries.filter((e) => e.priority === 'urgent').length,
        totalPending: entries.reduce((s, e) => s + e.pendingCount, 0),
        bannedUsers:  entries.filter((e) => !e.isActive).length,
      },
    };
  }

  async getUserReportDetail(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const reports = await this.userReportRepo.find({
      where: { reportedUser: { id: userId } },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });

    const score  = computeRiskScore(reports, this.moderationConfig.timeWindowHours);
    const recent = recentReports(reports, this.moderationConfig.timeWindowHours);
    const level  = getRiskLevel(score, recent);
    const trend  = calculateTrend([score * 0.7, score * 0.85, score]);
    const priority = getPriorityLevel(level, score, trend);
    const autoDecision = getAutoDecision(
      score,
      new Set(reports.map((r) => r.reporter?.id)).size,
      this.moderationConfig,
    );

    const reasonMap = new Map<string, { count: number; severity: number }>();
    reports.forEach((r) => {
      const existing = reasonMap.get(r.reason) || { count: 0, severity: REASON_SEVERITY[r.reason] ?? 2 };
      existing.count++;
      reasonMap.set(r.reason, existing);
    });

    return {
      user: {
        id:         user.id,
        name:       `${user.firstName} ${user.lastName}`.trim(),
        email:      user.email,
        department: user.department,
        isActive:   user.status === UserStatus.ACTIVE,
        role:       user.role,
        createdAt:  user.createdAt,
      },
      intelligence: {
        riskScore:       score,
        riskLevel:       level,
        priority,
        recentCount:     recent,
        uniqueReporters: new Set(reports.map((r) => r.reporter?.id)).size,
        topReasons: Array.from(reasonMap.entries())
          .map(([reason, data]) => ({ reason, count: data.count, severity: data.severity }))
          .sort((a, b) => b.severity - a.severity),
        recommendation: this.getUserRecommendation(level, user.status === UserStatus.ACTIVE, reports, score),
        autoDecision:   autoDecision.decision,
        confidence:     autoDecision.confidence,
        trend,
      },
      reports: reports.map((r) => ({
        id:        r.id,
        reason:    r.reason,
        details:   r.details,
        status:    r.status,
        createdAt: r.createdAt,
        reporter: {
          id:   r.reporter?.id,
          name: r.reporter ? `${r.reporter.firstName} ${r.reporter.lastName}`.trim() : 'Inconnu',
        },
      })),
    };
  }

  async takeActionOnUser(userId: number, action: ReportAction, adminId: number, note?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (userId === adminId) throw new BadRequestException('Action impossible sur votre propre compte');

    let message = '';
    switch (action) {
      case 'dismiss_all':
        await this.userReportRepo.update(
          { reportedUser: { id: userId }, status: 'pending' },
          { status: 'dismissed' },
        );
        message = 'Signalements clôturés';
        break;

      case 'review_all':
        await this.userReportRepo.update(
          { reportedUser: { id: userId }, status: 'pending' },
          { status: 'reviewed' },
        );
        message = 'Signalements marqués comme examinés';
        break;

      case 'warn':
        await this.userReportRepo.update(
          { reportedUser: { id: userId }, status: 'pending' },
          { status: 'reviewed' },
        );
        await this.notificationService.createAndNotify(
          NotificationType.SYSTEM_INFO,
          user,
          null,
          `Avertissement : votre comportement sur la plateforme a été signalé plusieurs fois. Tout manquement répété aux règles entraînera la suspension de votre compte.${note ? ` Message de l'admin : ${note}` : ''}`,
          {},
        );
        message = 'Avertissement envoyé à l\'utilisateur';
        break;

      case 'ban':
        if (user.status === UserStatus.INACTIVE) {
          throw new BadRequestException('Ce compte est déjà suspendu');
        }
        await this.userRepo.update(userId, { status: UserStatus.INACTIVE });
        await this.userReportRepo.update(
          { reportedUser: { id: userId }, status: 'pending' },
          { status: 'reviewed' },
        );
        await this.notificationService.createAndNotify(
          NotificationType.ACCOUNT_DEACTIVATED,
          user,
          null,
          `Votre compte a été suspendu suite à plusieurs signalements.${note ? ` Raison : ${note}` : ''}`,
          {},
        );
        message = 'Compte suspendu et signalements marqués comme examinés';
        break;

      case 'unban':
        if (user.status === UserStatus.ACTIVE) {
          throw new BadRequestException('Ce compte est déjà actif');
        }
        await this.userRepo.update(userId, { status: UserStatus.ACTIVE });
        await this.userReportRepo.update(
          { reportedUser: { id: userId } },
          { status: 'dismissed' },
        );
        await this.notificationService.createAndNotify(
          NotificationType.ACCOUNT_ACTIVATED,
          user,
          null,
          `Votre compte a été réactivé par un administrateur.${note ? ` Message : ${note}` : ''}`,
          {},
        );
        message = 'Compte réactivé et signalements clôturés';
        break;

      default:
        throw new BadRequestException(`Action "${action}" non valide`);
    }

    return { message, action };
  }

  // ── Bulk user actions ──────────────────────────────────────────────────────

  async bulkUserAction(userIds: number[], action: ReportAction, adminId: number, note?: string) {
    const results = await Promise.allSettled(
      userIds.map((id) => this.takeActionOnUser(id, action, adminId, note)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.length - succeeded;
    return { message: `${succeeded} utilisateur(s) traité(s)${failed ? `, ${failed} erreur(s)` : ''}`, processed: succeeded };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  getConfig(): AutoModerationConfig {
    return { ...this.moderationConfig };
  }

  updateConfig(partial: Partial<AutoModerationConfig>): AutoModerationConfig {
    this.moderationConfig = { ...this.moderationConfig, ...partial };
    return { ...this.moderationConfig };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async exportReports(type: 'publications' | 'users', format: 'csv' | 'json') {
    if (type === 'publications') {
      const result = await this.getReportedPublications({ page: 1, limit: 1000 });
      if (format === 'json') return result.items;

      const headers = 'publicationId,title,authorName,riskLevel,riskScore,reportCount,pendingCount,publicationStatus,lastReportAt';
      const rows = result.items.map((i) =>
        [i.publicationId, `"${i.title.replace(/"/g, '""')}"`, `"${i.authorName}"`,
          i.riskLevel, i.riskScore, i.reportCount, i.pendingCount, i.publicationStatus,
          i.lastReportAt ?? ''].join(','),
      );
      return [headers, ...rows].join('\n');
    } else {
      const result = await this.getReportedUsers({ page: 1, limit: 1000 });
      if (format === 'json') return result.items;

      const headers = 'userId,userName,userEmail,department,isActive,riskLevel,riskScore,reportCount,pendingCount,lastReportAt';
      const rows = result.items.map((i) =>
        [i.userId, `"${i.userName}"`, i.userEmail, `"${i.department}"`,
          i.isActive, i.riskLevel, i.riskScore, i.reportCount, i.pendingCount,
          i.lastReportAt ?? ''].join(','),
      );
      return [headers, ...rows].join('\n');
    }
  }

  // ── Smart recommendations ─────────────────────────────────────────────────

  private getPublicationRecommendation(
    level: string,
    reports: { reason: string }[],
    score: number,
  ): { label: string; action: ReportAction; severity: 'danger' | 'warning' | 'info' } {
    const reasons = reports.map((r) => r.reason);
    if (score >= DEFAULT_MODERATION_CONFIG.autoBanThreshold) {
      return { label: '🚨 ACTION IMMÉDIATE - Dépublier', action: 'unpublish', severity: 'danger' };
    }
    if (level === 'critical' || reasons.includes('hate_speech') || reasons.includes('harassment')) {
      return { label: '⚠️ Dépublier immédiatement', action: 'unpublish', severity: 'danger' };
    }
    if (level === 'high' || reasons.includes('misinformation') || reasons.includes('inappropriate_content')) {
      return { label: '📝 Dépublier et avertir l\'auteur', action: 'unpublish', severity: 'warning' };
    }
    if (level === 'medium') {
      return { label: '💬 Avertir l\'auteur', action: 'warn_author', severity: 'warning' };
    }
    return { label: '👁️ Examiner et clôturer', action: 'review_all', severity: 'info' };
  }

  private getUserRecommendation(
    level: string,
    isActive: boolean,
    reports: { reason: string }[],
    score: number,
  ): { label: string; action: ReportAction; severity: 'danger' | 'warning' | 'info' } {
    if (!isActive) {
      return { label: '🔓 Compte suspendu — Réactiver si besoin', action: 'unban', severity: 'info' };
    }
    const reasons = reports.map((r) => r.reason);
    if (score >= DEFAULT_MODERATION_CONFIG.autoBanThreshold) {
      return { label: '🚨 BAN AUTOMATIQUE RECOMMANDÉ', action: 'ban', severity: 'danger' };
    }
    if (level === 'critical' || reasons.includes('harassment') || reasons.includes('hate_speech')) {
      return { label: '⛔ Suspendre le compte', action: 'ban', severity: 'danger' };
    }
    if (level === 'high') {
      return { label: '⚠️ Avertir l\'utilisateur', action: 'warn', severity: 'warning' };
    }
    return { label: '👁️ Examiner et clôturer', action: 'review_all', severity: 'info' };
  }
}
