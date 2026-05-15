// components/auth/GoogleLoginButton.tsx
'use client';
import { useGoogleLogin } from '@react-oauth/google';
import Button from '@/components/ui/button/Button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeToken } from '../../../services/auth.service';
import { useUser } from '@/context/UserContext';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  /** Message shown on the button, e.g. "Sign in with Google" */
  text?: string;
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  text = 'Sign in with Google',
}: GoogleLoginButtonProps) {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // 1. Fetch the user's profile from Google
        const userInfoRes = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );

        if (!userInfoRes.ok) {
          throw new Error('Failed to fetch user info from Google');
        }

        const userInfo = await userInfoRes.json();

        // 2. Send Google profile to our backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const backendRes = await fetch(`${apiUrl}/api/users/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userInfo.email,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name ?? '',
            profileImage: userInfo.picture ?? null,
            googleId: userInfo.sub,
          }),
        });

        const data = await backendRes.json();

        if (!backendRes.ok) {
          // Surface the backend error (e.g. "account not approved yet")
          throw new Error(data.message || 'Google authentication failed');
        }

        if (!data.accessToken) {
          // Backend returned 200 but with a message instead of a token
          // (e.g. pending admin approval)
          throw new Error(
            data.message || 'No access token received from server',
          );
        }

        // 3. Persist token in localStorage (Google = always "remember me").
        //    persistSession is not exported, so we replicate its logic here.
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('userId');
        localStorage.setItem('auth_token', data.accessToken);

        const decoded = decodeToken(data.accessToken);
        const userId = decoded?.sub ?? decoded?.id ?? decoded?.userId;
        if (userId) {
          localStorage.setItem('userId', userId.toString());
        }

        // Sync cookie so Next.js middleware can authorise server-side requests.
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;

        // 4. Populate global auth context BEFORE navigating so every component
        //    sees the authenticated user immediately — no manual refresh needed.
        await refreshUser();

        onSuccess?.();
        router.push('/home');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Google login failed';
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },

    onError: () => {
      onError?.('Google login failed. Please try again.');
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => login()}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2" />
          Connecting…
        </div>
      ) : (
        <>
          {/* Google "G" logo */}
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {text}
        </>
      )}
    </Button>
  );
}