/**
 * Storage adapter that automatically uses the correct storage backend.
 * - Vercel Blob Storage when BLOB_READ_WRITE_TOKEN is available
 * - File-based storage for local development
 */

import type { Conversation, ConversationMetadata } from './storage';

// Check if we're running on Vercel with Blob Storage configured
const USE_BLOB_STORAGE = !!process.env.BLOB_READ_WRITE_TOKEN;

let storage: any;

if (USE_BLOB_STORAGE) {
  // Use Vercel Blob Storage
  storage = require('./storage-vercel');
  console.log('Using Vercel Blob Storage');
} else {
  // Use file-based storage
  storage = require('./storage');
  console.log('Using file-based storage');
}

export const createConversation = storage.createConversation;
export const getConversation = storage.getConversation;
export const saveConversation = storage.saveConversation;
export const listConversations = storage.listConversations;
export const addUserMessage = storage.addUserMessage;
export const addAssistantMessage = storage.addAssistantMessage;
export const updateConversationTitle = storage.updateConversationTitle;

export type { Conversation, ConversationMetadata };
