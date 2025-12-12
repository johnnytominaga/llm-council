/**
 * API endpoints for conversation-level attachments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { conversationAttachment, conversation } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { deleteFileFromS3 } from '@/lib/s3';

/**
 * GET - List all attachments for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify conversation ownership
    const conv = await db.query.conversation.findFirst({
      where: (conversations, { eq, and }) =>
        and(eq(conversations.id, id), eq(conversations.userId, userId)),
    });

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get all attachments for this conversation
    const attachments = await db.query.conversationAttachment.findMany({
      where: eq(conversationAttachment.conversationId, id),
      orderBy: desc(conversationAttachment.createdAt),
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error getting conversation attachments:', error);
    return NextResponse.json(
      { error: 'Failed to get attachments' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add attachment to conversation pool
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify conversation ownership
    const conv = await db.query.conversation.findFirst({
      where: (conversations, { eq, and }) =>
        and(eq(conversations.id, id), eq(conversations.userId, userId)),
    });

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { key, url, filename, contentType, size } = body;

    // Validate required fields
    if (!key || !url || !filename || !contentType || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: key, url, filename, contentType, size' },
        { status: 400 }
      );
    }

    // Insert into conversationAttachment table
    const attachment = await db.insert(conversationAttachment).values({
      id: nanoid(),
      conversationId: id,
      key,
      url,
      filename,
      contentType,
      size,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      attachment: attachment[0]
    });
  } catch (error) {
    console.error('Error adding conversation attachment:', error);
    return NextResponse.json(
      { error: 'Failed to add attachment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove attachment from conversation and S3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify conversation ownership
    const conv = await db.query.conversation.findFirst({
      where: (conversations, { eq, and }) =>
        and(eq(conversations.id, id), eq(conversations.userId, userId)),
    });

    if (!conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { attachmentId } = body;

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    // Get attachment to retrieve S3 key
    const attachment = await db.query.conversationAttachment.findFirst({
      where: (attachments, { eq, and }) =>
        and(
          eq(attachments.id, attachmentId),
          eq(attachments.conversationId, id)
        ),
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      await deleteFileFromS3(attachment.key);
    } catch (s3Error) {
      console.error('Failed to delete from S3:', s3Error);
      // Continue with DB deletion even if S3 fails
    }

    // Delete from database
    await db
      .delete(conversationAttachment)
      .where(eq(conversationAttachment.id, attachmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
