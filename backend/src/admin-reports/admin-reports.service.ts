// src/admin-reports/admin-reports.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleReport } from 'src/article/entities/article-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { Article } from 'src/article/entities/article.entity';
import { User } from 'src/users/entities/user.entity';
import { ArticleStatus, NotificationType, UserStatus } from 'utils/constants';
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
    @InjectRepository(ArticleReport)
    private readonly articleReportRepo: Repository<ArticleReport>,
    @InjectRepository(UserReport)
    private readonly userReportRepo: Repository<UserReport>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTICLE REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getReportedArticles(opts: {
    status?: string;
    riskLevel?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(50, opts.limit ?? 20);

    const qb = this.articleReportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.article', 'article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .orderBy('r.createdAt', 'DESC');

    if (opts.status && opts.status !== 'all') {
      qb.andWhere('r.status = :status', { status: opts.status });
    }

    const allReports = await qb.getMany();

    const byArticle = new Map<number, typeof allReports>();
    for (const rep of allReports) {
      if (!rep.article) continue;
      const id = rep.article.id;
      if (!byArticle.has(id)) byArticle.set(id, []);
      byArticle.get(id)!.push(rep);
    }

    let entries = Array.from(byArticle.entries()).map(([articleId, reports]) => {
      const article = reports[0].article!;
      const author  = (article as any).author;
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
        articleId,
        title:          article.title,
        articleStatus:  article.status,
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

  async getArticleReportDetail(articleId: number) {
    const article = await this.articleRepo.findOne({
      where: { id: articleId },
      relations: ['author'],
    });
    if (!article) throw new NotFoundException('Article introuvable');

    const reports = await this.articleReportRepo.find({
      where: { article: { id: articleId } },
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
      article: {
        id:      article.id,
        title:   article.title,
        status:  article.status,
        content: article.content?.slice(0, 400) + (article.content?.length > 400 ? '…' : ''),
        author: {
          id:   (article as any).author?.id,
          name: (article as any).author ? `${(article as any).author.firstName} ${(article as any).author.lastName}`.trim() : 'Inconnu',
        },
        createdAt: article.createdAt,
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
        recommendation: this.getArticleRecommendation(level, reports, score),
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

  async takeActionOnArticle(articleId: number, action: ReportAction, adminId: number, note?: string) {
    const article = await this.articleRepo.findOne({
      where: { id: articleId },
      relations: ['author'],
    });
    if (!article) throw new NotFoundException('Article introuvable');

    const pendingReports = await this.articleReportRepo.find({
      where: { article: { id: articleId }, status: 'pending' },
    });

    let message = '';
    switch (action) {
      case 'dismiss_all':
        await this.articleReportRepo.update(
          { article: { id: articleId }, status: 'pending' },
          { status: 'dismissed' },
        );
        message = `${pendingReports.length} signalement(s) clôturé(s)`;
        break;

      case 'review_all':
        await this.articleReportRepo.update(
          { article: { id: articleId }, status: 'pending' },
          { status: 'reviewed' },
        );
        message = `${pendingReports.length} signalement(s) marqué(s) comme examiné(s)`;
        break;

      case 'unpublish':
        await this.articleRepo.update(articleId, { status: ArticleStatus.REJECTED });
        await this.articleReportRepo.update(
          { article: { id: articleId }, status: 'pending' },
          { status: 'reviewed' },
        );
        if ((article as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.ARTICLE_REJECTED,
            (article as any).author,
            null,
            `Votre article "${article.title}" a été dépublié suite à des signalements.${note ? ` Note : ${note}` : ''}`,
            { articleId },
          );
        }
        message = 'Article dépublié et signalements marqués comme examinés';
        break;

      case 'republish':
        await this.articleRepo.update(articleId, { status: ArticleStatus.PUBLISHED });
        await this.articleReportRepo.update(
          { article: { id: articleId } },
          { status: 'dismissed' },
        );
        if ((article as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.ARTICLE_PUBLISHED,
            (article as any).author,
            null,
            `Votre article "${article.title}" a été réactivé par un administrateur.`,
            { articleId },
          );
        }
        message = 'Article republié et signalements clôturés';
        break;

      case 'warn_author':
        await this.articleReportRepo.update(
          { article: { id: articleId }, status: 'pending' },
          { status: 'reviewed' },
        );
        if ((article as any).author) {
          await this.notificationService.createAndNotify(
            NotificationType.SYSTEM_INFO,
            (article as any).author,
            null,
            `Avertissement : votre article "${article.title}" a été signalé plusieurs fois. Merci de respecter les règles de la communauté.${note ? ` Message de l'admin : ${note}` : ''}`,
            { articleId },
          );
        }
        message = 'Avertissement envoyé à l\'auteur, signalements marqués comme examinés';
        break;

      default:
        throw new BadRequestException(`Action "${action}" non valide pour un article`);
    }

    return { message, action };
  }

  // ── Bulk article actions ──────────────────────────────────────────────────

  async bulkArticleAction(articleIds: number[], action: ReportAction, adminId: number, note?: string) {
    const results = await Promise.allSettled(
      articleIds.map((id) => this.takeActionOnArticle(id, action, adminId, note)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.length - succeeded;
    return { message: `${succeeded} article(s) traité(s)${failed ? `, ${failed} erreur(s)` : ''}`, processed: succeeded };
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

  async exportReports(type: 'articles' | 'users', format: 'csv' | 'json') {
    if (type === 'articles') {
      const result = await this.getReportedArticles({ page: 1, limit: 1000 });
      if (format === 'json') return result.items;

      const headers = 'articleId,title,authorName,riskLevel,riskScore,reportCount,pendingCount,articleStatus,lastReportAt';
      const rows = result.items.map((i) =>
        [i.articleId, `"${i.title.replace(/"/g, '""')}"`, `"${i.authorName}"`,
          i.riskLevel, i.riskScore, i.reportCount, i.pendingCount, i.articleStatus,
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

  private getArticleRecommendation(
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
