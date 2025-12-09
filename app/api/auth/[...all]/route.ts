/**
 * BetterAuth API route handler.
 * Handles all auth requests: /api/auth/*
 */

import { auth } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('GET request to auth route:', request.url);
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  console.log('POST request to auth route:', request.url);
  return auth.handler(request);
}
