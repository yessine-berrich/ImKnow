// services/comment.service.ts
import { getToken } from './auth.service';

export interface CommentAuthor {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
}

export interface Comment {
  id: number;
  content: string;
  likes: number;
  isEdited?: boolean;
  isLiked?: boolean;
  author: CommentAuthor;
  parentId?: number | null;
  replies?: Comment[];
  createdAt: string;
}

export interface CreateCommentDto {
  articleId: number;
  content: string;
  parentId?: number;
  /** IDs of users mentioned via @ in the comment text */
  mentionedUserIds?: number[];
}

export interface UpdateCommentDto {
  content: string;
}

export interface CommentStats {
  totalComments: number;
  totalLikes: number;
}

export interface CommentLikeResponse {
  id: number;
  likes: number;
  isLiked: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class CommentService {
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }
    // 204 No Content ou réponse sans corps (ex: DELETE)
    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0') {
      return undefined as unknown as T;
    }
    return response.json() as Promise<T>;
  }

  /** Create a new comment (supports parentId + mentionedUserIds) */
  async create(data: CreateCommentDto): Promise<Comment> {
    const response = await fetch(`${API_URL}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Comment>(response);
  }

  /** Get all comments for an article */
  async findByArticle(articleId: number): Promise<Comment[]> {
    const response = await fetch(`${API_URL}/comments/article/${articleId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Comment[]>(response);
  }

  /** Get comment stats for an article */
  async getCommentStats(articleId: number): Promise<CommentStats> {
    const response = await fetch(`${API_URL}/comments/article/${articleId}/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<CommentStats>(response);
  }

  /** Toggle like on a comment — returns { id, likes (count), isLiked } */
  async toggleLike(commentId: number): Promise<CommentLikeResponse> {
    const response = await fetch(`${API_URL}/comments/${commentId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<CommentLikeResponse>(response);
  }

  /** Update a comment's content */
  async update(commentId: number, data: UpdateCommentDto): Promise<Comment> {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Comment>(response);
  }

  /** Delete a comment */
  async remove(commentId: number): Promise<void> {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  /** Get all comments by current user */
  async findByUser(): Promise<Comment[]> {
    const response = await fetch(`${API_URL}/comments/user`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Comment[]>(response);
  }

  /** Get articles commented by current user */
  async findCommentedArticlesByUser(): Promise<any[]> {
    const response = await fetch(`${API_URL}/comments/user/articles`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }
}

export const commentService = new CommentService();