// services/user.service.ts
import { getToken } from './auth.service';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  department: string | null;
  country: string | null;
  city: string | null;
  postalCode: string | null;
  profileImage: string | null;
  avatar?: string | null;
  role: string;
  isEmailActive: boolean;
  status: 'actif' | 'inactif' | 'pending';
  isOnline: boolean;
  lastSeenAt: string | null;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: number;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isActive: boolean;
  expiresAt: string;
  lastUsedAt: string;
  createdAt: string;
}

export type UserReportReason =
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'impersonation'
  | 'other';

// Always read from the env var; fall back to localhost for local dev only.
const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3000/api';

class UserService {
  /**
   * Build auth headers. Uses getToken() which checks both localStorage and
   * sessionStorage, so it works regardless of the "remember me" choice.
   */
  private getAuthHeaders(): HeadersInit {
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
      if (response.status === 401 && typeof window !== 'undefined') {
        // Token expired / invalid — clear storage and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('userId');
        window.location.href = '/signin';
      }

      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (errorData.message as string) || `HTTP error: ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async findOne(id: number): Promise<User> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  /** Alias kept for backwards compatibility */
  async findById(id: number): Promise<User> {
    return this.findOne(id);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<User[]>(response);
  }

  async updateProfile(userId: number, data: FormData): Promise<User> {
    const token = getToken();

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        // Do NOT set Content-Type for FormData — the browser sets the correct
        // multipart boundary automatically.
        Authorization: `Bearer ${token}`,
      },
      body: data,
    });

    return this.handleResponse<User>(response);
  }

  /**
   * Change the currently authenticated user's password.
   * The backend verifies currentPassword before applying newPassword.
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  /**
   * Update notification preferences for the current user.
   */
  async updateNotificationPreferences(
    userId: number,
    prefs: {
      emailNotificationsEnabled?: boolean;
      pushNotificationsEnabled?: boolean;
    },
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_URL}/users/me/notifications-preferences`,
      {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(prefs),
      },
    );

    return this.handleResponse<{ message: string }>(response);
  }

  async deleteAccount(password?: string): Promise<{ message: string; success: boolean; requiresEmailConfirmation?: boolean }> {
    const token = getToken();

    const response = await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    return this.handleResponse(response);
  }

  async reportUser(
    userId: number,
    data: { reason: UserReportReason; details?: string },
  ): Promise<{ message: string; reportId: number }> {
    const response = await fetch(`${API_URL}/users/${userId}/report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<{ message: string; reportId: number }>(response);
  }

  async searchUsers(
    query: string,
  ): Promise<Pick<User, 'id' | 'firstName' | 'lastName'>[]> {
    if (!query || query.length < 2) return [];

    const response = await fetch(
      `${API_URL}/users/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      },
    );

    return this.handleResponse<Pick<User, 'id' | 'firstName' | 'lastName'>[]>(
      response,
    );
  }

  // ── Session Management ────────────────────────────────────────────────────

  /**
   * Get all active sessions for the current user.
   */
  async getMySessions(): Promise<Session[]> {
    const response = await fetch(`${API_URL}/session`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<Session[]>(response);
  }

  /**
   * Revoke a specific session by its ID.
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/session/revoke/${sessionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  /**
   * Revoke all other sessions except the current one.
   */
  async revokeAllOtherSessions(): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/session/revoke-others`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // ── Email Change ──────────────────────────────────────────────────────────

  /**
   * Request an email address change.
   * Sends a confirmation link to the user's CURRENT email.
   */
  async requestEmailChange(newEmail: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/users/me/change-email`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newEmail }),
    });

    return this.handleResponse<{ message: string }>(response);
  }
}

export const userService = new UserService();
