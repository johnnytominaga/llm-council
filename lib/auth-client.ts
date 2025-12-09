/**
 * BetterAuth client for use in client components.
 */

'use client';

import { createAuthClient } from 'better-auth/react';

// Per Better Auth docs: "If the auth server is running on the same domain
// as your client, you can skip" passing baseURL
// This allows proper cookie handling
console.log('[auth-client] Initializing without explicit baseURL (same domain)');

export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
