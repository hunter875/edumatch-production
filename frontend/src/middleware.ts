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
  
  // Get auth token from cookies
  const token = request.cookies.get('auth_token')?.value;
  const isAuthenticated = !!token;
  
  // Get user role from cookies
  let userRole = null;
  if (token) {
    try {
      const userData = request.cookies.get('auth_user')?.value;
      if (userData) {
        // Try to parse - userData might already be decoded by Next.js
        let user;
        try {
          user = JSON.parse(userData);
        } catch {
          // If fails, try decoding first
          user = JSON.parse(decodeURIComponent(userData));
        }
        userRole = user.role;
        
        // Debug: log để check
        if (pathname.includes('/profile')) {
          console.log('🔍 [Middleware] Profile access attempt');
          console.log('🔍 Token exists:', !!token);
          console.log('🔍 Parsed role:', userRole);
        }
      } else {
        console.log('⚠️ [Middleware] No auth_user cookie found for path:', pathname);
      }
    } catch (error) {
      // Invalid user data in cookies
      console.error('❌ [Middleware] Cookie parse error:', error);
      console.error('❌ Path:', pathname);
    }
  } else {
    if (!isPublicScholarshipRoute && (pathname.startsWith('/user') || pathname.startsWith('/employer') || pathname.startsWith('/admin'))) {
      console.log('⚠️ [Middleware] No auth_token for protected route:', pathname);
    }
  }

  const normalizedRole = typeof userRole === 'string' ? userRole.replace(/^ROLE_/, '') : null;

  // Protect shared messaging routes for all authenticated roles.
  if (pathname.startsWith('/messages')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
  }

  // Protect employer routes
  if (pathname.startsWith('/employer')) {
    // Allow /employer/register for USER role (they need to register as employer)
    const isRegisterRoute = pathname === '/employer/register' || pathname.startsWith('/employer/register/');
    
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    
    // Allow USER to access /employer/register
    if (isRegisterRoute && normalizedRole === 'USER') {
      return NextResponse.next();
    }
    
    if (normalizedRole !== 'EMPLOYER') {
      // Redirect wrong role to their own dashboard
      if (normalizedRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (normalizedRole === 'USER') {
        return NextResponse.redirect(new URL('/user/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect user routes (except public scholarship browsing)
  if (pathname.startsWith('/user') && !isPublicScholarshipRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    if (normalizedRole !== 'USER') {
      // Redirect wrong role to their own dashboard
      if (normalizedRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (normalizedRole === 'EMPLOYER') {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
    if (normalizedRole !== 'ADMIN') {
      // Redirect wrong role to their own dashboard
      if (normalizedRole === 'EMPLOYER') {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      } else if (normalizedRole === 'USER') {
        return NextResponse.redirect(new URL('/user/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
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
