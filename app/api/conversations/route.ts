/**
 * API routes for listing and creating conversations.
 */

import { NextResponse } from 'next/server';
import { listConversations, createConversation } from '@/lib/storage';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const conversations = listConversations();
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
    const conversationId = randomUUID();
    const conversation = createConversation(conversationId);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
