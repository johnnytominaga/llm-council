/**
 * BetterAuth client for use in client components.
 */

'use client';

import { createAuthClient } from 'better-auth/react';

// Create auth client with dynamic baseURL
// In browser, use current origin; for SSR, use env var
let _authClient: ReturnType<typeof createAuthClient> | null = null;

const getAuthClient = () => {
  if (!_authClient) {
    const baseURL = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    console.log('[auth-client] Initializing with baseURL:', baseURL);
    _authClient = createAuthClient({ baseURL });
  }
  return _authClient;
};

export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(_, prop) {
    return getAuthClient()[prop as keyof ReturnType<typeof createAuthClient>];
  }
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
