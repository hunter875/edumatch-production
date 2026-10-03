import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to scholarships list and details for browsing
  const publicScholarshipRoutes = [
    '/user/scholarships',
    '/user/scholarships/'
  ];

  const isPublicScholarshipRoute = publicScholarshipRoutes.some(route =>
    pathname.startsWith(route) && !pathname.includes('/applications')
  );

  // Session presence is decided by the auth_session cookie.
  //
  // Earlier versions read `auth_token`, a cookie the backend never sets — the
  // session cookies are `refresh_token` (Path=/api/auth) and `auth_session`
  // (Path=/). Because `auth_token` was always absent, every protected route was
  // treated as signed out and redirected to /auth/login, so a user who had just
  // signed in still could not open their profile. `auth_session` is the one
  // scoped to the whole site, so it is the one visible on these navigations.
  const hasSessionMarker = Boolean(request.cookies.get('auth_session')?.value);
  const isAuthenticated = hasSessionMarker;

  // NOTE: We do NOT read auth_user cookie for role decisions.
  // Backend enforces authorization; middleware only checks authentication presence
  // for basic route protection and UX redirects.

  // Protect shared messaging routes for all authenticated roles.
  if (pathname.startsWith('/messages')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
  }

  // Protect employer routes — redirect to login if not authenticated
  if (pathname.startsWith('/employer')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    // Backend enforces actual role authorization; middleware only gates by auth presence
  }

  // Protect user routes (except public scholarship browsing)
  if (pathname.startsWith('/user') && !isPublicScholarshipRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    // Backend enforces actual role authorization; middleware only gates by auth presence
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    // Backend enforces actual role authorization; middleware only gates by auth presence
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/employer/:path*',
    '/user/:path*',
    '/admin/:path*',
    '/messages/:path*'
  ]
};
