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
  const sessionToken = cookieStore.get('better-auth.session_token')?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
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
