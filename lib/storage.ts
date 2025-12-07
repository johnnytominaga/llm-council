/**
 * JSON-based storage for conversations.
 */

import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './config';

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

function ensureDataDir(): void {
  /**
   * Ensure the data directory exists.
   */
  const dirPath = path.join(process.cwd(), DATA_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getConversationPath(conversationId: string): string {
  /**
   * Get the file path for a conversation.
   */
  return path.join(process.cwd(), DATA_DIR, `${conversationId}.json`);
}

export function createConversation(conversationId: string): Conversation {
  /**
   * Create a new conversation.
   *
   * Args:
   *   conversationId: Unique identifier for the conversation
   *
   * Returns:
   *   New conversation object
   */
  ensureDataDir();

  const conversation: Conversation = {
    id: conversationId,
    created_at: new Date().toISOString(),
    title: 'New Conversation',
    messages: [],
  };

  // Save to file
  const filePath = getConversationPath(conversationId);
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}

export function getConversation(conversationId: string): Conversation | null {
  /**
   * Load a conversation from storage.
   *
   * Args:
   *   conversationId: Unique identifier for the conversation
   *
   * Returns:
   *   Conversation object or null if not found
   */
  const filePath = getConversationPath(conversationId);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as Conversation;
}

export function saveConversation(conversation: Conversation): void {
  /**
   * Save a conversation to storage.
   *
   * Args:
   *   conversation: Conversation object to save
   */
  ensureDataDir();

  const filePath = getConversationPath(conversation.id);
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
}

export function listConversations(): ConversationMetadata[] {
  /**
   * List all conversations (metadata only).
   *
   * Returns:
   *   List of conversation metadata objects
   */
  ensureDataDir();

  const dirPath = path.join(process.cwd(), DATA_DIR);
  const files = fs.readdirSync(dirPath);

  const conversations: ConversationMetadata[] = [];

  for (const filename of files) {
    if (filename.endsWith('.json')) {
      const filePath = path.join(dirPath, filename);
      const data = fs.readFileSync(filePath, 'utf-8');
      const conv = JSON.parse(data);

      // Return metadata only
      conversations.push({
        id: conv.id,
        created_at: conv.created_at,
        title: conv.title || 'New Conversation',
        message_count: conv.messages.length,
      });
    }
  }

  // Sort by creation time, newest first
  conversations.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return conversations;
}

export function addUserMessage(conversationId: string, content: string): void {
  /**
   * Add a user message to a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   content: User message content
   */
  const conversation = getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'user',
    content,
  });

  saveConversation(conversation);
}

export function addAssistantMessage(
  conversationId: string,
  stage1: any[],
  stage2: any[],
  stage3: any
): void {
  /**
   * Add an assistant message with all 3 stages to a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   stage1: List of individual model responses
   *   stage2: List of model rankings
   *   stage3: Final synthesized response
   */
  const conversation = getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'assistant',
    stage1,
    stage2,
    stage3,
  });

  saveConversation(conversation);
}

export function updateConversationTitle(conversationId: string, title: string): void {
  /**
   * Update the title of a conversation.
   *
   * Args:
   *   conversationId: Conversation identifier
   *   title: New title for the conversation
   */
  const conversation = getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.title = title;
  saveConversation(conversation);
}
