import { getToken } from './auth.service';

export interface Publication {
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

export interface CreatePublicationDto {
  title: string;
  content: string;
  categoryId: number;
  status?: 'published' | 'draft' | 'archived' | 'pending';
}

export interface UpdatePublicationDto {
  title?: string;
  content?: string;
  categoryId?: number;
  tagIds?: number[];
  status?: 'published' | 'draft' | 'archived' | 'pending';
  changeSummary?: string;
}

export interface SearchPublicationsDto {
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
  results: Publication[];
}

export interface LikeResponse {
  success: boolean;
  message: string;
  publication: {
    id: number;
    title: string;
    likesCount: number;
    isLiked: boolean;
  };
}

export interface BookmarkResponse {
  success: boolean;
  message: string;
  publication: {
    id: number;
    title: string;
    bookmarksCount: number;
    isBookmarked: boolean;
  };
}

export interface UserPublicationsResponse {
  success: boolean;
  count: number;
  publications: Array<{
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

/** Shape of each publication item returned by /api/recommendations/feed */
export interface FeedPublicationItem {
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
  /** Which bucket this publication came from in the recommendation engine */
  source: 'followed' | 'trending' | 'personalized';
  isTrending: boolean;
}

export interface RecommendationsFeedResponse {
  success: boolean;
  data: FeedPublicationItem[];
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

class PublicationService {
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

  async findAll(): Promise<Publication[]> {
    const response = await fetch(`${API_URL}/publications`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Publication[]>(response);
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

  async findByCategory(categoryId: number): Promise<Publication[]> {
    const publications = await this.findAll();
    return publications.filter(publication => publication.category?.id === categoryId);
  }

  async findOne(id: number): Promise<Publication> {
    const response = await fetch(`${API_URL}/publications/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<Publication>(response);
  }

  async create(data: CreatePublicationDto): Promise<Publication> {
    const response = await fetch(`${API_URL}/publications`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return this.handleResponse<Publication>(response);
  }

  async update(id: number, data: UpdatePublicationDto): Promise<Publication> {
    const response = await fetch(`${API_URL}/publications/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return this.handleResponse<Publication>(response);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/publications/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<void>(response);
  }

  async incrementView(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/publications/${id}/view`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<void>(response);
  }

  async toggleLike(id: number): Promise<LikeResponse> {
    const response = await fetch(`${API_URL}/publications/${id}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<LikeResponse>(response);
  }

  async toggleBookmark(id: number): Promise<BookmarkResponse> {
    const response = await fetch(`${API_URL}/publications/${id}/bookmark`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return this.handleResponse<BookmarkResponse>(response);
  }

  async getUserLikedPublications(): Promise<UserPublicationsResponse> {
    const response = await fetch(`${API_URL}/publications/user/liked`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<UserPublicationsResponse>(response);
  }

  async getUserBookmarkedPublications(): Promise<UserPublicationsResponse> {
    const response = await fetch(`${API_URL}/publications/user/bookmarked`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<UserPublicationsResponse>(response);
  }

  async getPublicationsByUserId(userId: number): Promise<any[]> {
    const response = await fetch(`${API_URL}/publications/user/${userId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    return this.handleResponse<any[]>(response);
  }

  async semanticSearch(data: SearchPublicationsDto): Promise<SearchResponse> {
    const response = await fetch(`${API_URL}/publications/search`, {
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

  async reportPublication(
    publicationId: number,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; message: string; reportId: number }> {
    const response = await fetch(`${API_URL}/publications/${publicationId}/report`, {
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

export const publicationService = new PublicationService();
