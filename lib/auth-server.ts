/**
 * Server-side auth helpers.
 */

import { cookies } from 'next/headers';
import { auth } from './auth';
import type { Session, User } from './auth';

/**
 * Get the current session from cookies.
 * Use this in Server Components and API routes.
 */
export async function getSession(): Promise<{ session: Session; user: User } | null> {
  const cookieStore = await cookies();
  // In production (HTTPS), BetterAuth adds __Secure- prefix to cookie names
  const sessionToken =
    cookieStore.get('__Secure-better-auth.session_token')?.value ||
    cookieStore.get('better-auth.session_token')?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    // Use the correct cookie name based on which one we found
    const cookieName = cookieStore.get('__Secure-better-auth.session_token')
      ? '__Secure-better-auth.session_token'
      : 'better-auth.session_token';

    const session = await auth.api.getSession({
      headers: {
        cookie: `${cookieName}=${sessionToken}`,
      },
    });

    return session;
  } catch {
    return null;
  }
}

/**
 * Require authentication or redirect to auth page.
 * Use this in Server Components to protect pages.
 */
export async function requireAuth(): Promise<{ session: Session; user: User }> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}
