'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { fetchCurrentUser, getToken } from '../../services/auth.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurrentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
  role: string;
  department?: string | null;
  bio?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  postalCode?: string | null;
  isOnline?: boolean;
  isGoogleAccount?: boolean;
  emailNotificationsEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  [key: string]: unknown;
}

interface UserContextValue {
  /** The currently authenticated user, or null if not logged in / still loading. */
  user: CurrentUser | null;
  /** True only during the very first auth check on app mount. */
  loading: boolean;
  /**
   * Call this immediately after a successful login (token already stored).
   * Fetches /current-user, populates the context, and returns the user so
   * the caller can navigate only after state is ready — no refresh needed.
   */
  refreshUser: () => Promise<void>;
  /**
   * Merge partial updates into the user object without a round-trip.
   * Useful after a profile PATCH to instantly sync every consumer.
   */
  updateUser: (updates: Partial<CurrentUser>) => void;
  /** Reset user to null (called after logout). */
  clearUser: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the current user from the API and updates the context state.
   * Safe to call at any time — if no token exists it simply sets user=null.
   */
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchCurrentUser();
      setUser(data ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — runs once on mount to rehydrate session from storage.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const updateUser = useCallback((updates: Partial<CurrentUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser() must be called inside <UserProvider>');
  return ctx;
}
