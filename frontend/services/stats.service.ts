// services/stats.service.ts
import { getToken } from './auth.service';

// ─── Admin stats interfaces ──────────────────────────────────────────────────

export interface DashboardStats {
  totalPublications: number;
  totalUsers: number;
  totalCategories: number;
  totalTags: number;
  totalComments: number;
  totalLikes: number;
  publicationsThisWeek: number;
  publicationsThisMonth: number;
  newUsersThisMonth: number;
  mostActiveCategory: { id: number; name: string; publicationCount: number } | null;
  topContributor: { userId: number; fullName: string; publicationsCount: number } | null;
}

export interface MonthlyUserActivity {
  month: string;
  newUsers: number;
  activeUsers: number;
  publicationsPublished: number;
  commentsMade: number;
}

export interface UserActivityStats {
  currentMonth: MonthlyUserActivity;
  previousMonth: MonthlyUserActivity;
  growthRate: { newUsers: number; activeUsers: number; publicationsPublished: number };
  history: MonthlyUserActivity[];
}

export interface ModerationStatusItem {
  status: string;
  count: number;
  percentage: number;
}

export interface ModerationStats {
  totalModerated: number;
  statusBreakdown: ModerationStatusItem[];
  flaggedCategories: { category: string; count: number; severity: string }[];
  dailyTrend: { date: string; approved: number; rejected: number; pending: number; flagged: number }[];
  rejectionRate: number;
  autoModerationRate: number;
}

export interface EngagementStats {
  mostLikedPublications: { id: number; title: string; likesCount: number; viewsCount: number; category: string; author: { fullName: string } }[];
  mostBookmarkedPublications: { id: number; title: string; bookmarksCount: number; viewsCount: number; category: string; author: { fullName: string } }[];
  totalLikes: number;
  totalBookmarks: number;
  avgLikesPerPublication: number;
  avgBookmarksPerPublication: number;
}

export interface CategoryStat {
  id: number;
  name: string;
  publicationCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementScore: number;
}

export interface CategoryStats {
  categories: CategoryStat[];
  totalPublications: number;
  mostPopularCategory: CategoryStat | null;
}

export interface TagPerformance {
  id: number;
  name: string;
  publicationCount: number;
  totalViews: number;
  totalLikes: number;
  avgEngagement: number;
  trending: boolean;
  growthRate: number;
}

export interface TagStats {
  tags: TagPerformance[];
  totalTags: number;
  topTrending: TagPerformance[];
  mostUsed: TagPerformance[];
  unusedTags: number;
}

export interface ReportReasonCount { reason: string; count: number; }
export interface ReportTrendDay { day: string; count: number; }
export interface TopReportedItem { id: number; title?: string; name?: string; reportCount: number; }

export interface ReportsStats {
  publications: {
    total: number;
    pending: number;
    reviewed: number;
    dismissed: number;
    byReason: ReportReasonCount[];
    recentTrend: ReportTrendDay[];
    topReported: TopReportedItem[];
  };
  users: {
    total: number;
    pending: number;
    reviewed: number;
    dismissed: number;
    byReason: ReportReasonCount[];
    recentTrend: ReportTrendDay[];
    topReported: TopReportedItem[];
  };
}

// ─── Employee-facing interfaces ──────────────────────────────────────────────

export interface TrendingPublicationAuthor {
  name: string;
  initials: string;
  department?: string;
}

export interface TrendingPublicationCategory {
  name: string;
  slug: string;
}

export interface TrendingPublication {
  id: number;
  title: string;
  description: string;
  content: string;
  category: TrendingPublicationCategory;
  author: TrendingPublicationAuthor;
  tags: string[];
  publishedAt: string;
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
  trendScore: number;
  rank: number;
}

export interface TrendingPublicationsResponse {
  period: { from: string; to: string };
  publications: TrendingPublication[];
}

export interface TopContributor {
  userId: number;
  fullName: string;
  initials: string;
  department?: string;
  profileImage?: string | null;
  publicationsCount: number;
  totalViews: number;
  totalLikes: number;
  score: number;
  rank: number;
}

export interface TopContributorsResponse {
  period: { from: string; to: string };
  contributors: TopContributor[];
}

// Types pour la page trending (employee)
export interface EmployeeTrendingPublication {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  author: {
    id: number;
    name: string;
    avatar?: string | null;
  };
  category: {
    id: number;
    name: string;
  };
  publishedAt: string;
}

export interface EmployeeTrendingTag {
  id: number;
  name: string;
  publicationCount: number;
  totalViews: number;
  trend: 'up' | 'down' | 'stable';
  热度: number;
}

export interface EmployeeTopAuthor {
  id: number;
  name: string;
  avatar?: string | null;
  department?: string;
  publicationCount: number;
  totalViews: number;
  totalLikes: number;
  engagementRate: number;
}

export interface EmployeeDailyActivity {
  date: string;
  publications: number;
  views: number;
}

export interface EmployeeTrendingStats {
  period: { from: string; to: string };
  stats: {
    totalPublications: number;
    publicationsGrowth: number;
    totalViews: number;
    viewsGrowth: number;
    activeAuthors: number;
  };
  topPublications: EmployeeTrendingPublication[];
  trendingTags: EmployeeTrendingTag[];
  topAuthors: EmployeeTopAuthor[];
  dailyActivity: EmployeeDailyActivity[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class StatsService {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }
    
    return response.json() as Promise<T>;
  }

  async getTrendingPublications(limit: number = 5): Promise<TrendingPublicationsResponse> {
    const response = await fetch(`${API_URL}/stats/trending-publications?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<TrendingPublicationsResponse>(response);
  }

  async getTopContributors(limit: number = 5): Promise<TopContributorsResponse> {
    const response = await fetch(`${API_URL}/stats/top-contributors?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<TopContributorsResponse>(response);
  }

  // Nouvelle méthode pour la page trending employee
  async getEmployeeTrendingStats(): Promise<EmployeeTrendingStats> {
    const response = await fetch(`${API_URL}/stats/employee/trending`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<EmployeeTrendingStats>(response);
  }

  async getPopularPublicationsForEmployees(limit: number = 10, period: 'week' | 'month' | 'year' = 'week'): Promise<EmployeeTrendingPublication[]> {
    const response = await fetch(`${API_URL}/stats/employee/popular-publications?limit=${limit}&period=${period}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<EmployeeTrendingPublication[]>(response);
  }

  async getTrendingTagsForEmployees(limit: number = 5): Promise<EmployeeTrendingTag[]> {
    const response = await fetch(`${API_URL}/stats/employee/trending-tags?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<EmployeeTrendingTag[]>(response);
  }

  async getTopAuthorsForEmployees(limit: number = 10, period: 'week' | 'month' | 'year' = 'month'): Promise<EmployeeTopAuthor[]> {
    const response = await fetch(`${API_URL}/stats/employee/top-authors?limit=${limit}&period=${period}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<EmployeeTopAuthor[]>(response);
  }

  async getActivityTimelineForEmployees(days: number = 30): Promise<EmployeeDailyActivity[]> {
    const response = await fetch(`${API_URL}/stats/employee/activity-timeline?days=${days}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<EmployeeDailyActivity[]>(response);
  }

  // ─── Admin stats ────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_URL}/stats/dashboard`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<DashboardStats>(response);
  }

  async getUserActivityStats(months = 6): Promise<UserActivityStats> {
    const response = await fetch(`${API_URL}/stats/user-activity?months=${months}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<UserActivityStats>(response);
  }

  async getModerationStats(days = 30): Promise<ModerationStats> {
    const response = await fetch(`${API_URL}/stats/moderation?days=${days}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ModerationStats>(response);
  }

  async getEngagementStats(limit = 10): Promise<EngagementStats> {
    const response = await fetch(`${API_URL}/stats/engagement?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<EngagementStats>(response);
  }

  async getCategoryStats(): Promise<CategoryStats> {
    const response = await fetch(`${API_URL}/stats/categories`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<CategoryStats>(response);
  }

  async getTagStats(): Promise<TagStats> {
    const response = await fetch(`${API_URL}/stats/tags`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<TagStats>(response);
  }

  async getReportsStats(): Promise<ReportsStats> {
    const response = await fetch(`${API_URL}/stats/reports`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ReportsStats>(response);
  }
}

export const statsService = new StatsService();