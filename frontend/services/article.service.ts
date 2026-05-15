import { getToken } from './auth.service';

export interface Article {
  id: number;
  title: string;
  content: string;
  status: 'published' | 'draft' | 'archived' | 'pending';
  category: {
    id: number;
    name: string;
  };
  author: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  viewsCount: number;
  likes?: any[];
  bookmarks?: any[];
  comments?: any[];
}

export interface CreateArticleDto {
  title: string;
  content: string;
  categoryId: number;
  status?: 'published' | 'draft' | 'archived' | 'pending';
}

export interface UpdateArticleDto {
  title?: string;
  content?: string;
  categoryId?: number;
  tagIds?: number[];
  status?: 'published' | 'draft' | 'archived' | 'pending';
  changeSummary?: string;
}

export interface SearchArticlesDto {
  q: string;
  limit?: number;
  minSimilarity?: number;
  status?: 'published' | 'draft' | 'archived' | 'pending';
}

export interface SearchResponse {
  success: boolean;
  query: string;
  params: {
    limit: number;
    minSimilarity: number;
    status: string;
  };
  found: number;
  results: Article[];
}

export interface LikeResponse {
  success: boolean;
  message: string;
  article: {
    id: number;
    title: string;
    likesCount: number;
    isLiked: boolean;
  };
}

export interface BookmarkResponse {
  success: boolean;
  message: string;
  article: {
    id: number;
    title: string;
    bookmarksCount: number;
    isBookmarked: boolean;
  };
}

export interface UserArticlesResponse {
  success: boolean;
  count: number;
  articles: Array<{
    id: number;
    title: string;
    description: string;
    author: {
      id: number;
      name: string;
      avatar?: string;
    } | null;
    category: {
      id: number;
      name: string;
    } | null;
    createdAt: Date;
    likesCount: number;
    bookmarksCount: number;
  }>;
}

/** Shape of each article item returned by /api/recommendations/feed */
export interface FeedArticleItem {
  id: number;
  title: string;
  content: string;
  description: string;
  status: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    initials: string;
    department: string;
    avatar?: string | null;
  } | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  tags: { id: number; name: string }[];
  media: Array<{
    id: number;
    url: string;
    filename: string;
    mimetype: string;
    type: 'image' | 'video' | 'document';
    size: number | null;
  }>;
  stats: {
    likes: number;
    comments: number;
    views: number;
  };
  isLiked: boolean;
  isBookmarked: boolean;
  isFeatured: boolean;
  /** Which bucket this article came from in the recommendation engine */
  source: 'followed' | 'trending' | 'personalized';
  isTrending: boolean;
}

export interface RecommendationsFeedResponse {
  success: boolean;
  data: FeedArticleItem[];
  meta: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    totalCandidates: number;
    filter: string;
  };
}

export interface TagSuggestionResponse {
  success: boolean;
  existingTags: { id: number; name: string }[];
  newSuggestions: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ArticleService {
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
          window.location.href = '/login';
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async findAll(): Promise<Article[]> {
    const response = await fetch(`${API_URL}/articles`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Article[]>(response);
  }

  /**
   * Get the smart homepage feed (paginated, filterable).
   * Corresponds to GET /api/recommendations/feed
   */
  async getFeeds(
    page = 1,
    pageSize = 20,
    filter: 'all' | 'following' | 'trending' = 'all',
  ): Promise<RecommendationsFeedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      filter,
    });

    const response = await fetch(`${API_URL}/recommendations/feed?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<RecommendationsFeedResponse>(response);
  }

  async findByCategory(categoryId: number): Promise<Article[]> {
    const articles = await this.findAll();
    return articles.filter(article => article.category?.id === categoryId);
  }

  async findOne(id: number): Promise<Article> {
    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Article>(response);
  }

  async create(data: CreateArticleDto): Promise<Article> {
    const response = await fetch(`${API_URL}/articles`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return this.handleResponse<Article>(response);
  }

  async update(id: number, data: UpdateArticleDto): Promise<Article> {
    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return this.handleResponse<Article>(response);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<void>(response);
  }

  async incrementView(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/articles/${id}/view`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<void>(response);
  }

  async toggleLike(id: number): Promise<LikeResponse> {
    const response = await fetch(`${API_URL}/articles/${id}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<LikeResponse>(response);
  }

  async toggleBookmark(id: number): Promise<BookmarkResponse> {
    const response = await fetch(`${API_URL}/articles/${id}/bookmark`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<BookmarkResponse>(response);
  }

  async getUserLikedArticles(): Promise<UserArticlesResponse> {
    const response = await fetch(`${API_URL}/articles/user/liked`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<UserArticlesResponse>(response);
  }

  async getUserBookmarkedArticles(): Promise<UserArticlesResponse> {
    const response = await fetch(`${API_URL}/articles/user/bookmarked`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<UserArticlesResponse>(response);
  }

  async getArticlesByUserId(userId: number): Promise<any[]> {
    const response = await fetch(`${API_URL}/articles/user/${userId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<any[]>(response);
  }

  async semanticSearch(data: SearchArticlesDto): Promise<SearchResponse> {
    const response = await fetch(`${API_URL}/articles/search`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        q: data.q,
        limit: data.limit || 10,
        minSimilarity: data.minSimilarity || 0.72,
        status: data.status || 'PUBLISHED',
      }),
    });

    return this.handleResponse<SearchResponse>(response);
  }

  async reportArticle(
    articleId: number,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; message: string; reportId: number }> {
    const response = await fetch(`${API_URL}/articles/${articleId}/report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason, details }),
    });
    return this.handleResponse<{ success: boolean; message: string; reportId: number }>(response);
  }

  async suggestTags(title: string, content: string): Promise<TagSuggestionResponse> {
    const response = await fetch(`${API_URL}/tags/suggest`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ title, content }),
    });

    return this.handleResponse<TagSuggestionResponse>(response);
  }
}

export const articleService = new ArticleService();
