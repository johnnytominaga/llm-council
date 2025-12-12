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
        mode: settings.mode || 'single',
        singleModel: settings.singleModel || COUNCIL_MODELS[0],
        preprocessModel: settings.preprocessModel || null,
        stage1Prompt: settings.stage1Prompt || null,
        stage2Prompt: settings.stage2Prompt || null,
        stage3Prompt: settings.stage3Prompt || null,
        preprocessPrompt: settings.preprocessPrompt || null,
      });
    }

    // Return defaults from config
    return NextResponse.json({
      councilModels: COUNCIL_MODELS,
      chairmanModel: CHAIRMAN_MODEL,
      mode: 'single',
      singleModel: COUNCIL_MODELS[0],
      preprocessModel: null,
      stage1Prompt: null,
      stage2Prompt: null,
      stage3Prompt: null,
      preprocessPrompt: null,
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
    const {
      councilModels,
      chairmanModel,
      mode,
      singleModel,
      preprocessModel,
      stage1Prompt,
      stage2Prompt,
      stage3Prompt,
      preprocessPrompt,
    } = body;

    console.log('PUT /api/settings - Request body:', {
      mode,
      singleModel,
      councilModels,
      chairmanModel,
      preprocessModel,
      stage1Prompt: stage1Prompt ? `${stage1Prompt.substring(0, 50)}...` : stage1Prompt,
      stage2Prompt: stage2Prompt ? `${stage2Prompt.substring(0, 50)}...` : stage2Prompt,
      stage3Prompt: stage3Prompt ? `${stage3Prompt.substring(0, 50)}...` : stage3Prompt,
      preprocessPrompt: preprocessPrompt ? `${preprocessPrompt.substring(0, 50)}...` : preprocessPrompt,
    });

    // Default to single mode if not specified
    const effectiveMode = mode || 'single';

    // Validate based on mode
    if (effectiveMode === 'single') {
      if (!singleModel || typeof singleModel !== 'string') {
        return NextResponse.json(
          { error: 'Single model is required for single mode' },
          { status: 400 }
        );
      }
    } else if (effectiveMode === 'council') {
      if (!Array.isArray(councilModels) || councilModels.length !== 4) {
        return NextResponse.json(
          { error: 'Council models must be an array of 4 model IDs' },
          { status: 400 }
        );
      }

      if (!chairmanModel || typeof chairmanModel !== 'string') {
        return NextResponse.json(
          { error: 'Chairman model is required for council mode' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Mode must be either "single" or "council"' },
        { status: 400 }
      );
    }

    // Check if settings exist
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      // Update existing settings
      const updateData = {
        councilModels: effectiveMode === 'council' ? JSON.stringify(councilModels) : existing.councilModels,
        chairmanModel: effectiveMode === 'council' ? chairmanModel : existing.chairmanModel,
        mode: effectiveMode,
        singleModel: effectiveMode === 'single' ? singleModel : existing.singleModel,
        preprocessModel: preprocessModel || null,
        // Update custom prompts (undefined means don't change, null means clear)
        stage1Prompt: stage1Prompt !== undefined ? stage1Prompt : existing.stage1Prompt,
        stage2Prompt: stage2Prompt !== undefined ? stage2Prompt : existing.stage2Prompt,
        stage3Prompt: stage3Prompt !== undefined ? stage3Prompt : existing.stage3Prompt,
        preprocessPrompt: preprocessPrompt !== undefined ? preprocessPrompt : existing.preprocessPrompt,
        updatedAt: new Date(),
      };
      console.log('Updating existing settings with:', {
        ...updateData,
        stage1Prompt: updateData.stage1Prompt ? `${updateData.stage1Prompt.substring(0, 50)}...` : updateData.stage1Prompt,
        stage2Prompt: updateData.stage2Prompt ? `${updateData.stage2Prompt.substring(0, 50)}...` : updateData.stage2Prompt,
        stage3Prompt: updateData.stage3Prompt ? `${updateData.stage3Prompt.substring(0, 50)}...` : updateData.stage3Prompt,
        preprocessPrompt: updateData.preprocessPrompt ? `${updateData.preprocessPrompt.substring(0, 50)}...` : updateData.preprocessPrompt,
      });
      await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId));
    } else {
      // Create new settings - use defaults for fields not provided
      await db.insert(userSettings).values({
        id: randomUUID(),
        userId,
        councilModels: effectiveMode === 'council' ? JSON.stringify(councilModels) : JSON.stringify(COUNCIL_MODELS),
        chairmanModel: effectiveMode === 'council' ? chairmanModel : CHAIRMAN_MODEL,
        mode: effectiveMode,
        singleModel: effectiveMode === 'single' ? singleModel : COUNCIL_MODELS[0],
        preprocessModel: preprocessModel || null,
        stage1Prompt: stage1Prompt || null,
        stage2Prompt: stage2Prompt || null,
        stage3Prompt: stage3Prompt || null,
        preprocessPrompt: preprocessPrompt || null,
      });
    }

    return NextResponse.json({
      councilModels: effectiveMode === 'council' ? councilModels : JSON.parse(existing?.councilModels || JSON.stringify(COUNCIL_MODELS)),
      chairmanModel: effectiveMode === 'council' ? chairmanModel : (existing?.chairmanModel || CHAIRMAN_MODEL),
      mode: effectiveMode,
      singleModel: effectiveMode === 'single' ? singleModel : (existing?.singleModel || COUNCIL_MODELS[0]),
      preprocessModel: preprocessModel || null,
      stage1Prompt: stage1Prompt || existing?.stage1Prompt || null,
      stage2Prompt: stage2Prompt || existing?.stage2Prompt || null,
      stage3Prompt: stage3Prompt || existing?.stage3Prompt || null,
      preprocessPrompt: preprocessPrompt || existing?.preprocessPrompt || null,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
