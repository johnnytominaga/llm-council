/**
 * Vercel Blob-based storage for conversations.
 * Use this version when deploying to Vercel.
 */

import { put, list, del } from '@vercel/blob';

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
    addRandomSuffix: false,
  });

  return conversation;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const blobPath = getConversationBlobPath(conversationId);

  try {
    // First, list blobs to get the full URL
    const { blobs } = await list({
      prefix: blobPath,
      token: BLOB_TOKEN,
      limit: 1,
    });

    if (blobs.length === 0) {
      console.log(`Conversation ${conversationId} not found in blob storage`);
      return null;
    }

    // Use the URL from the blob metadata
    const blobUrl = blobs[0].url;
    const response = await fetch(blobUrl);

    if (!response.ok) {
      console.error(`Failed to fetch conversation: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as Conversation;
    return data;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return null;
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const blobPath = getConversationBlobPath(conversation.id);

  try {
    // First, try to find and delete the existing blob
    const { blobs } = await list({
      prefix: blobPath,
      token: BLOB_TOKEN,
      limit: 1,
    });

    // Delete existing blob if it exists
    if (blobs.length > 0) {
      await del(blobs[0].url, { token: BLOB_TOKEN });
    }
  } catch (error) {
    console.log('No existing blob to delete or error deleting:', error);
  }

  // Create new blob with the conversation data
  await put(blobPath, JSON.stringify(conversation, null, 2), {
    access: 'public',
    token: BLOB_TOKEN,
    contentType: 'application/json',
    addRandomSuffix: false,
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

    console.log(`Found ${blobs.length} conversations in blob storage`);

    const conversations: ConversationMetadata[] = [];

    // Fetch each conversation to get metadata
    for (const blob of blobs) {
      try {
        console.log(`Fetching conversation from: ${blob.url}`);
        const response = await fetch(blob.url);
        if (response.ok) {
          const conv = await response.json();
          conversations.push({
            id: conv.id,
            created_at: conv.created_at,
            title: conv.title || 'New Conversation',
            message_count: conv.messages.length,
          });
        } else {
          console.error(`Failed to fetch blob ${blob.pathname}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error fetching blob ${blob.pathname}:`, error);
      }
    }

    // Sort by creation time, newest first
    conversations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`Successfully loaded ${conversations.length} conversations`);
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
