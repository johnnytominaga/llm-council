/**
 * Storage adapter using Turso database.
 * All conversations and messages are stored in the database.
 */

import {
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
  saveConversation as dbSaveConversation,
  listConversations as dbListConversations,
  addUserMessage as dbAddUserMessage,
  addAssistantMessage as dbAddAssistantMessage,
  updateConversationTitle as dbUpdateConversationTitle,
  deleteConversation as dbDeleteConversation,
} from './storage';

import type { Conversation, ConversationMetadata } from './storage';

console.log('Using Turso database storage');

export const createConversation = dbCreateConversation;
export const getConversation = dbGetConversation;
export const saveConversation = dbSaveConversation;
export const listConversations = dbListConversations;
export const addUserMessage = dbAddUserMessage;
export const addAssistantMessage = dbAddAssistantMessage;
export const updateConversationTitle = dbUpdateConversationTitle;
export const deleteConversation = dbDeleteConversation;

export type { Conversation, ConversationMetadata };
