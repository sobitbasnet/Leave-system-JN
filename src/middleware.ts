import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'jaynepal-action-volunteers-production-super-secret-key-32-chars-min'
);

const COOKIE_NAME = 'jav_leave_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next requests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let user: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      user = payload;
    } catch {
      // Invalid/expired token
    }
  }

  // 1. Guard Approver/Admin Routes Server-Side
  if (pathname.startsWith('/approver') && pathname !== '/approver/login') {
    if (!user) {
      const loginUrl = new URL('/approver/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user.role !== 'APPROVER' && user.role !== 'ADMIN') {
      // Staff member manually attempted to access approver URL -> strictly deny server-side
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized_approver_access');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 2. Guard Staff Routes Server-Side
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/leave') ||
    (pathname.startsWith('/profile') && !pathname.startsWith('/profile/password'))
  ) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Prevent logged-in users from seeing login pages again
  if (pathname === '/login' || pathname === '/approver/login') {
    if (user) {
      if (user.role === 'APPROVER' || user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/approver/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
