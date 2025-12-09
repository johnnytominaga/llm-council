/**
 * BetterAuth client for use in client components.
 */

import { createAuthClient } from 'better-auth/react';

// For production, we don't specify baseURL and let BetterAuth use relative URLs
// This ensures it always uses the current domain
export const authClient = createAuthClient({
  // Don't set baseURL - let it default to current origin
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
