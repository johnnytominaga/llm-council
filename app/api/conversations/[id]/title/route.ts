/**
 * API route for updating conversation titles.
 */

import { NextResponse } from 'next/server';
import { updateConversationTitle, getConversation } from '@/lib/storage-adapter';
import { getSession } from '@/lib/auth-server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { title } = await request.json();

    // Validate title
    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title must be a non-empty string' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const conversation = await getConversation(id, userId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update title
    await updateConversationTitle(id, title.trim(), userId);

    return NextResponse.json({ success: true, title: title.trim() });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation title' },
      { status: 500 }
    );
  }
}
