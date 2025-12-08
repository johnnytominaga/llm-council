/**
 * Database storage for conversations and messages.
 */

import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import { conversation, message } from './db/schema';
import { nanoid } from 'nanoid';

export interface Conversation {
  id: string;
  created_at: string;
  title: string;
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content?: string;
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
}

export interface ConversationMetadata {
  id: string;
  created_at: string;
  title: string;
  message_count: number;
}

export async function createConversation(conversationId: string, userId: string): Promise<Conversation> {
  /**
   * Create a new conversation.
   *
   * Args:
   *   conversationId: Unique identifier for the conversation
   *   userId: User ID to scope conversation to user
   *
   * Returns:
   *   New conversation object
   */
  const now = new Date();

  await db.insert(conversation).values({
    id: conversationId,
    userId,
    title: 'New Conversation',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: conversationId,
    created_at: now.toISOString(),
    title: 'New Conversation',
    messages: [],
  };
}

export async function getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
  /**
   * Load a conversation from database.
   *
   * Args:
   *   conversationId: Unique identifier for the conversation
   *   userId: User ID to scope conversation to user
   *
   * Returns:
   *   Conversation object or null if not found
   */
  const conv = await db.query.conversation.findFirst({
    where: (conversations, { eq, and }) =>
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
  });

  if (!conv) {
    return null;
  }

  const messages = await db.query.message.findMany({
    where: (messages, { eq }) => eq(messages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  return {
    id: conv.id,
    created_at: conv.createdAt.toISOString(),
    title: conv.title,
    messages: messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content || undefined,
      stage1: msg.stage1 ? JSON.parse(msg.stage1) : undefined,
      stage2: msg.stage2 ? JSON.parse(msg.stage2) : undefined,
      stage3: msg.stage3 ? JSON.parse(msg.stage3) : undefined,
    })),
  };
}

export async function saveConversation(conv: Conversation, userId: string): Promise<void> {
  /**
   * This function is kept for backward compatibility but doesn't do anything
   * since we now save messages individually through addUserMessage and addAssistantMessage.
   */
  // No-op - messages are saved individually
}

export async function listConversations(userId: string): Promise<ConversationMetadata[]> {
  /**
   * List all conversations (metadata only).
   *
   * Args:
   *   userId: User ID to scope conversations to user
   *
   * Returns:
   *   List of conversation metadata objects
   */
  const conversations = await db.query.conversation.findMany({
    where: (conversations, { eq }) => eq(conversations.userId, userId),
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
  });

  // Get message counts for each conversation
  const conversationsWithCounts = await Promise.all(
    conversations.map(async (conv) => {
      const messageCount = await db.query.message.findMany({
        where: (messages, { eq }) => eq(messages.conversationId, conv.id),
      });

      return {
        id: conv.id,
        created_at: conv.createdAt.toISOString(),
        title: conv.title,
        message_count: messageCount.length,
      };
    })
  );

  return conversationsWithCounts;
}

export async function addUserMessage(conversationId: string, content: string, userId: string): Promise<void> {
  /**
   * Add a user message to a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   content: User message content
   *   userId: User ID to scope conversation to user
   */
  const conv = await db.query.conversation.findFirst({
    where: (conversations, { eq, and }) =>
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
  });

  if (!conv) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  await db.insert(message).values({
    id: nanoid(),
    conversationId,
    role: 'user',
    content,
    createdAt: new Date(),
  });

  // Update conversation updatedAt
  await db
    .update(conversation)
    .set({ updatedAt: new Date() })
    .where(eq(conversation.id, conversationId));
}

export async function addAssistantMessage(
  conversationId: string,
  stage1: any[],
  stage2: any[],
  stage3: any,
  userId: string
): Promise<void> {
  /**
   * Add an assistant message with all 3 stages to a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   stage1: List of individual model responses
   *   stage2: List of model rankings
   *   stage3: Final synthesized response
   *   userId: User ID to scope conversation to user
   */
  const conv = await db.query.conversation.findFirst({
    where: (conversations, { eq, and }) =>
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
  });

  if (!conv) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  await db.insert(message).values({
    id: nanoid(),
    conversationId,
    role: 'assistant',
    stage1: JSON.stringify(stage1),
    stage2: JSON.stringify(stage2),
    stage3: JSON.stringify(stage3),
    createdAt: new Date(),
  });

  // Update conversation updatedAt
  await db
    .update(conversation)
    .set({ updatedAt: new Date() })
    .where(eq(conversation.id, conversationId));
}

export async function updateConversationTitle(conversationId: string, title: string, userId: string): Promise<void> {
  /**
   * Update the title of a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   title: New title for the conversation
   *   userId: User ID to scope conversation to user
   */
  const conv = await db.query.conversation.findFirst({
    where: (conversations, { eq, and }) =>
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
  });

  if (!conv) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  await db
    .update(conversation)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversation.id, conversationId));
}
