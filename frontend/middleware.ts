import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes réservées aux admins
const ADMIN_ONLY_ROUTES = [
  '/users',
  '/admin',
  '/categories',
  '/tags',
  '/settings',
  '/statistics',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // The token is written to this cookie by auth.service.ts → persistSession()
  // and GoogleLoginButton after every successful login.
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  try {
    // JWT is base64url-encoded; decode the payload (middle segment).
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) throw new Error('malformed token');

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8'),
    );

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const res = NextResponse.redirect(new URL('/signin', request.url));
      res.cookies.delete('auth_token');
      return res;
    }

    if (payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/error-403', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/users/:path*',
    '/admin/:path*',
    '/categories/:path*',
    '/tags/:path*',
    '/settings/:path*',
    '/statistics/:path*',
  ],
};