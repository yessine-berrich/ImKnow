// services/admin-reports.service.ts
import { getToken } from './auth.service';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'all';
export type ArticleAction = 'dismiss_all' | 'review_all' | 'unpublish' | 'republish' | 'warn_author';
export type UserAction    = 'dismiss_all' | 'review_all' | 'warn' | 'ban' | 'unban';
export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

export interface ReasonCount { reason: string; count: number; severity: number; }

export interface ReportedArticleItem {
  articleId:      number;
  title:          string;
  articleStatus:  string;
  authorId:       number | null;
  authorName:     string;
  reportCount:    number;
  pendingCount:   number;
  reviewedCount:  number;
  dismissedCount: number;
  riskScore:      number;
  riskLevel:      RiskLevel;
  priority:       PriorityLevel;
  recentCount:    number;
  topReason:      string | null;
  reasons:        ReasonCount[];
  firstReportAt:  string | null;
  lastReportAt:   string | null;
  uniqueReporters:number;
  trend:          'up' | 'down' | 'stable';
}

export interface ReportedUserItem {
  userId:         number;
  userName:       string;
  userEmail:      string;
  department:     string;
  isActive:       boolean;
  reportCount:    number;
  pendingCount:   number;
  reviewedCount:  number;
  dismissedCount: number;
  riskScore:      number;
  riskLevel:      RiskLevel;
  priority:       PriorityLevel;
  recentCount:    number;
  topReason:      string | null;
  reasons:        ReasonCount[];
  firstReportAt:  string | null;
  lastReportAt:   string | null;
  uniqueReporters:number;
  trend:          'up' | 'down' | 'stable';
}

export interface ListSummary {
  critical:     number;
  high:         number;
  medium:       number;
  low:          number;
  urgent:       number;
  totalPending: number;
  bannedUsers?: number;
}

export interface ArticleReportListResponse {
  items:      ReportedArticleItem[];
  total:      number;
  page:       number;
  totalPages: number;
  summary:    ListSummary;
}

export interface UserReportListResponse {
  items:      ReportedUserItem[];
  total:      number;
  page:       number;
  totalPages: number;
  summary:    ListSummary;
}

export interface IndividualReport {
  id:        number;
  reason:    string;
  details:   string | null;
  status:    string;
  createdAt: string;
  reporter:  { id: number; name: string };
}

export interface ArticleReportDetail {
  article: {
    id:        number;
    title:     string;
    status:    string;
    content:   string;
    author:    { id: number; name: string };
    createdAt: string;
  };
  intelligence: {
    riskScore:       number;
    riskLevel:       RiskLevel;
    priority:        PriorityLevel;
    recentCount:     number;
    uniqueReporters: number;
    topReasons:      { reason: string; count: number; severity: number }[];
    recommendation:  { label: string; action: string; severity: 'danger' | 'warning' | 'info' };
    autoDecision:    'auto_ban' | 'auto_warn' | 'auto_dismiss' | 'human_review';
    confidence:      number;
  };
  reports: IndividualReport[];
}

export interface UserReportDetail {
  user: {
    id:         number;
    name:       string;
    email:      string;
    department: string;
    isActive:   boolean;
    role:       string;
    createdAt:  string;
  };
  intelligence: {
    riskScore:       number;
    riskLevel:       RiskLevel;
    priority:        PriorityLevel;
    recentCount:     number;
    uniqueReporters: number;
    topReasons:      { reason: string; count: number; severity: number }[];
    recommendation:  { label: string; action: string; severity: 'danger' | 'warning' | 'info' };
    autoDecision:    'auto_ban' | 'auto_warn' | 'auto_dismiss' | 'human_review';
    confidence:      number;
  };
  reports: IndividualReport[];
}

export interface BulkAction {
  action: ArticleAction | UserAction;
  ids: number[];
  note?: string;
}

export interface AutoModerationConfig {
  autoBanThreshold: number;     // Score seuil pour bannissement auto
  autoWarnThreshold: number;    // Score seuil pour avertissement auto
  reviewThreshold: number;      // Score seuil pour révision humaine
  timeWindowHours: number;      // Fenêtre temporelle pour les signalements récents
  minUniqueReporters: number;   // Nombre min de rapporteurs uniques
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class AdminReportsService {
  private getHeaders(): HeadersInit {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handle<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Articles ────────────────────────────────────────────────────────────

  async getReportedArticles(params: {
    status?:    string;
    riskLevel?: string;
    priority?:  string;
    search?:    string;
    page?:      number;
    limit?:     number;
  }): Promise<ArticleReportListResponse> {
    const q = new URLSearchParams();
    if (params.status)     q.set('status',     params.status);
    if (params.riskLevel)  q.set('riskLevel',  params.riskLevel);
    if (params.priority)   q.set('priority',   params.priority);
    if (params.search)     q.set('search',     params.search);
    if (params.page)       q.set('page',       String(params.page));
    if (params.limit)      q.set('limit',      String(params.limit));
    const res = await fetch(`${API_URL}/admin/reports/articles?${q}`, { headers: this.getHeaders() });
    return this.handle<ArticleReportListResponse>(res);
  }

  async getArticleReportDetail(articleId: number): Promise<ArticleReportDetail> {
    const res = await fetch(`${API_URL}/admin/reports/articles/${articleId}`, { headers: this.getHeaders() });
    return this.handle<ArticleReportDetail>(res);
  }

  async takeArticleAction(articleId: number, action: ArticleAction, note?: string): Promise<{ message: string; action: string }> {
    const res = await fetch(`${API_URL}/admin/reports/articles/${articleId}/action`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, note }),
    });
    return this.handle(res);
  }

  // ── Users ───────────────────────────────────────────────────────────────

  async getReportedUsers(params: {
    status?:    string;
    riskLevel?: string;
    priority?:  string;
    search?:    string;
    page?:      number;
    limit?:     number;
  }): Promise<UserReportListResponse> {
    const q = new URLSearchParams();
    if (params.status)     q.set('status',     params.status);
    if (params.riskLevel)  q.set('riskLevel',  params.riskLevel);
    if (params.priority)   q.set('priority',   params.priority);
    if (params.search)     q.set('search',     params.search);
    if (params.page)       q.set('page',       String(params.page));
    if (params.limit)      q.set('limit',      String(params.limit));
    const res = await fetch(`${API_URL}/admin/reports/users?${q}`, { headers: this.getHeaders() });
    return this.handle<UserReportListResponse>(res);
  }

  async getUserReportDetail(userId: number): Promise<UserReportDetail> {
    const res = await fetch(`${API_URL}/admin/reports/users/${userId}`, { headers: this.getHeaders() });
    return this.handle<UserReportDetail>(res);
  }

  async takeUserAction(userId: number, action: UserAction, note?: string): Promise<{ message: string; action: string }> {
    const res = await fetch(`${API_URL}/admin/reports/users/${userId}/action`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, note }),
    });
    return this.handle(res);
  }

  // ── Bulk Actions ───────────────────────────────────────────────────────

  async bulkArticleAction(bulkAction: BulkAction): Promise<{ message: string; processed: number }> {
    const res = await fetch(`${API_URL}/admin/reports/articles/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(bulkAction),
    });
    return this.handle(res);
  }

  async bulkUserAction(bulkAction: BulkAction): Promise<{ message: string; processed: number }> {
    const res = await fetch(`${API_URL}/admin/reports/users/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(bulkAction),
    });
    return this.handle(res);
  }

  // ── Auto-moderation ────────────────────────────────────────────────────

  async getAutoModerationConfig(): Promise<AutoModerationConfig> {
    const res = await fetch(`${API_URL}/admin/reports/config`, { headers: this.getHeaders() });
    return this.handle<AutoModerationConfig>(res);
  }

  async updateAutoModerationConfig(config: Partial<AutoModerationConfig>): Promise<AutoModerationConfig> {
    const res = await fetch(`${API_URL}/admin/reports/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return this.handle<AutoModerationConfig>(res);
  }

  // ── Export ─────────────────────────────────────────────────────────────

  async exportReports(type: 'articles' | 'users', format: 'csv' | 'json'): Promise<Blob> {
    const res = await fetch(`${API_URL}/admin/reports/export?type=${type}&format=${format}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }
}

export const adminReportsService = new AdminReportsService();