/**
 * BetterAuth API route handler.
 * This catch-all route handles all BetterAuth endpoints:
 * - /api/auth/sign-in/email
 * - /api/auth/sign-up/email
 * - /api/auth/sign-out
 * - /api/auth/forget-password
 * - /api/auth/reset-password
 * - /api/auth/verify-email
 * - etc.
 */

import { auth } from '@/lib/auth';

export const { GET, POST } = auth.handler;
