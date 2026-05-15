'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface GoogleAuthProviderProps {
  children: React.ReactNode;
}

export default function GoogleAuthProvider({ children }: GoogleAuthProviderProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[GoogleAuthProvider] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined. ' +
          'Google login will be unavailable.',
      );
    }
    // Still render children so the rest of the app is not broken.
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}