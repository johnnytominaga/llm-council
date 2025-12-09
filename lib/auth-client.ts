/**
 * BetterAuth client for use in client components.
 */

'use client';

import { createAuthClient } from 'better-auth/react';

// Determine baseURL at module load time
// This ensures it's available before any hooks are called
const baseURL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

console.log('[auth-client] Initializing with baseURL:', baseURL);

export const authClient = createAuthClient({ baseURL });

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
