/**
 * Next.js proxy for authentication.
 * Protects routes that require authentication.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes for auth should always be accessible
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // If no session and trying to access protected route, redirect to auth
  if (!sessionToken && !isPublicRoute) {
    const url = new URL('/auth', request.url);
    return NextResponse.redirect(url);
  }

  // If has session and trying to access auth page, redirect to home
  if (sessionToken && pathname === '/auth') {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
