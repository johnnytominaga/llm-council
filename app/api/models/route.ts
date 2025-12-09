/**
 * API route to fetch available models from OpenRouter.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models from OpenRouter');
    }

    const data = await response.json();

    // Return just the models array with id and name
    const models = data.data.map((model: any) => ({
      id: model.id,
      name: model.name,
      context_length: model.context_length,
      pricing: model.pricing,
    }));

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
