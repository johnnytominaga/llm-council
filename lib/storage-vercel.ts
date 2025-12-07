/**
 * Vercel Blob-based storage for conversations.
 * Use this version when deploying to Vercel.
 */

import { put, del, list, head } from '@vercel/blob';

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

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function getConversationBlobPath(conversationId: string): string {
  return `conversations/${conversationId}.json`;
}

export async function createConversation(conversationId: string): Promise<Conversation> {
  const conversation: Conversation = {
    id: conversationId,
    created_at: new Date().toISOString(),
    title: 'New Conversation',
    messages: [],
  };

  const blobPath = getConversationBlobPath(conversationId);
  await put(blobPath, JSON.stringify(conversation, null, 2), {
    access: 'public',
    token: BLOB_TOKEN,
    contentType: 'application/json',
  });

  return conversation;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const blobPath = getConversationBlobPath(conversationId);

  try {
    const blobUrl = `https://${process.env.BLOB_STORE_ID}.public.blob.vercel-storage.com/${blobPath}`;
    const response = await fetch(blobUrl);

    if (!response.ok) {
      return null;
    }

    return await response.json() as Conversation;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return null;
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const blobPath = getConversationBlobPath(conversation.id);

  await put(blobPath, JSON.stringify(conversation, null, 2), {
    access: 'public',
    token: BLOB_TOKEN,
    contentType: 'application/json',
  });
}

export async function listConversations(): Promise<ConversationMetadata[]> {
  if (!BLOB_TOKEN) {
    console.warn('BLOB_READ_WRITE_TOKEN not set, returning empty list');
    return [];
  }

  try {
    const { blobs } = await list({
      prefix: 'conversations/',
      token: BLOB_TOKEN,
    });

    const conversations: ConversationMetadata[] = [];

    // Fetch each conversation to get metadata
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        if (response.ok) {
          const conv = await response.json();
          conversations.push({
            id: conv.id,
            created_at: conv.created_at,
            title: conv.title || 'New Conversation',
            message_count: conv.messages.length,
          });
        }
      } catch (error) {
        console.error(`Error fetching blob ${blob.url}:`, error);
      }
    }

    // Sort by creation time, newest first
    conversations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return conversations;
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [];
  }
}

export async function addUserMessage(conversationId: string, content: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'user',
    content,
  });

  await saveConversation(conversation);
}

export async function addAssistantMessage(
  conversationId: string,
  stage1: any[],
  stage2: any[],
  stage3: any
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'assistant',
    stage1,
    stage2,
    stage3,
  });

  await saveConversation(conversation);
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.title = title;
  await saveConversation(conversation);
}
