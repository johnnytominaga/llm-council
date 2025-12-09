/**
 * API routes for listing and creating conversations.
 */

import { NextResponse } from 'next/server';
import { listConversations, createConversation } from '@/lib/storage-adapter';
import { getSession } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

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

    const conversations = await listConversations(userId);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationId = randomUUID();
    const conversation = await createConversation(conversationId, userId);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
