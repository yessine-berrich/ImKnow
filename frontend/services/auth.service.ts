// services/auth.service.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3000/api';

export async function signup(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/users/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Signup failed');
  }

  return res.json();
}

/**
 * Login with email + password.
 * rememberMe = true  → persists in localStorage (survives tab close)
 * rememberMe = false → scoped to sessionStorage (cleared on tab close)
 */
export async function login(
  email: string,
  password: string,
  rememberMe = false,
) {
  const res = await fetch(`${API_URL}/users/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Invalid credentials');
  }

  if (data.accessToken) {
    persistSession(data.accessToken, rememberMe);
  }

  return data;
}

/**
 * Persist the JWT in localStorage (always) so every component in the app
 * can read it via a plain localStorage.getItem() without importing getToken().
 *
 * rememberMe only controls the middleware cookie lifetime:
 *   true  → 7-day persistent cookie (survives browser restart)
 *   false → session cookie (cleared when browser closes)
 *
 * The JWT itself enforces the real session expiry (7 h from the backend).
 */
function persistSession(accessToken: string, rememberMe: boolean) {
  // Always localStorage — sessionStorage breaks any component that reads
  // auth_token directly without going through getToken().
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('userId');

  localStorage.setItem('auth_token', accessToken);

  const decoded = decodeToken(accessToken);
  const userId = decoded?.sub ?? decoded?.id ?? decoded?.userId;
  if (userId) {
    localStorage.setItem('userId', userId.toString());
  }

  // Sync to cookie so Next.js middleware (edge runtime) can read the token.
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 : undefined; // 7 days or session
  document.cookie = `auth_token=${accessToken}; path=/; SameSite=Strict${maxAge ? `; max-age=${maxAge}` : ''}`;
}

/** Checks localStorage first, then sessionStorage */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    null
  );
};

/** Returns the storage that currently holds the token (or null) */
function getActiveStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem('auth_token')) return localStorage;
  if (sessionStorage.getItem('auth_token')) return sessionStorage;
  return null;
}

export const logout = async () => {
  const token = getToken();

  if (token) {
    try {
      await fetch(`${API_URL}/users/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error during logout API call:', error);
    }
  }

  // Clear both storages regardless
  localStorage.removeItem('auth_token');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('userId');

  // Clear the middleware cookie
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict';

  window.location.href = '/home';
};

export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/users/current-user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(userId: number, data: FormData) {
  const token = getToken();

  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      // NOTE: Do NOT set Content-Type when sending FormData — the browser sets
      // the correct multipart boundary automatically.
    },
    body: data,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Update failed');
  }

  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const token = getToken();

  const res = await fetch(`${API_URL}/users/change-password`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to change password');
  }

  return data;
}

// ── Token Decoding Utilities ───────────────────────────────────────────────────

interface DecodedToken {
  sub?: string | number;
  id?: string | number;
  userId?: string | number;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as DecodedToken;
  } catch {
    console.error('Token decode error');
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/users/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to send reset password email');
  }

  return data;
}

export async function verifyResetPasswordLink(
  userId: string,
  resetPasswordToken: string,
): Promise<{ message: string }> {
  const res = await fetch(
    `${API_URL}/users/reset-password/${userId}/${resetPasswordToken}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Invalid or expired link');
  }

  return data;
}

export async function resetPassword(
  userId: string,
  resetPasswordToken: string,
  newPassword: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: Number(userId),
      resetPasswordToken,
      newPassword,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }

  return data;
}