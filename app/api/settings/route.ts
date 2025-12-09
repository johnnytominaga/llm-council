/**
 * API routes for user settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from '@/lib/config';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user settings or return defaults
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (settings) {
      return NextResponse.json({
        councilModels: JSON.parse(settings.councilModels),
        chairmanModel: settings.chairmanModel,
      });
    }

    // Return defaults from config
    return NextResponse.json({
      councilModels: COUNCIL_MODELS,
      chairmanModel: CHAIRMAN_MODEL,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { councilModels, chairmanModel } = body;

    // Validate input
    if (!Array.isArray(councilModels) || councilModels.length !== 4) {
      return NextResponse.json(
        { error: 'Council models must be an array of 4 model IDs' },
        { status: 400 }
      );
    }

    if (!chairmanModel || typeof chairmanModel !== 'string') {
      return NextResponse.json(
        { error: 'Chairman model is required' },
        { status: 400 }
      );
    }

    // Check if settings exist
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          councilModels: JSON.stringify(councilModels),
          chairmanModel,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        id: randomUUID(),
        userId,
        councilModels: JSON.stringify(councilModels),
        chairmanModel,
      });
    }

    return NextResponse.json({
      councilModels,
      chairmanModel,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
