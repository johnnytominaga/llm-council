/**
 * BetterAuth client for use in client components.
 */

import { createAuthClient } from 'better-auth/react';

// Dynamically determine the base URL for the client
// This ensures it works in both local and production environments
const getBaseURL = () => {
  // Use the environment variable if available at build time
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // In the browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Fallback for server-side rendering
  return 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
