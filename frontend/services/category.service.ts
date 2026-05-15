import { Article } from "./article.service";
import { getToken } from './auth.service';

export interface Category {
  id: number;
  name: string;
  description: string;
  articleCount?: number; // Calculé côté frontend
}

export interface CreateCategoryDto {
  name: string;
  description: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class CategoryService {
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
      // Gestion des erreurs HTTP
      if (response.status === 401) {
        // Token expiré ou invalide
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }
    
    return response.json() as Promise<T>;
  }

  async findAll(): Promise<Category[]> {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse<Category[]>(response);
  }

  async findOne(id: number): Promise<Category> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse<Category>(response);
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<Category>(response);
  }

  async update(id: number, data: UpdateCategoryDto): Promise<Category> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<Category>(response);
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse<void>(response);
  }

  async findArticlesByCategory(id: number): Promise<Article[]> {
    const response = await fetch(`${API_URL}/categories/${id}/articles`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    
    return this.handleResponse<Article[]>(response);
  }
}

export const categoryService = new CategoryService();