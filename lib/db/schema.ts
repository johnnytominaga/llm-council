/**
 * Database schema for authentication using Drizzle ORM with Turso (LibSQL/SQLite).
 * Compatible with BetterAuth.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const conversation = sqliteTable('conversation', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Conversation'),
  // Per-conversation custom prompts (null = use user settings or defaults)
  stage1Prompt: text('stage1Prompt'),
  stage2Prompt: text('stage2Prompt'),
  stage3Prompt: text('stage3Prompt'),
  preprocessPrompt: text('preprocessPrompt'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const message = sqliteTable('message', {
  id: text('id').primaryKey(),
  conversationId: text('conversationId')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content'), // For user messages
  attachments: text('attachments'), // JSON string for file attachments
  stage1: text('stage1'), // JSON string for stage1 data
  stage2: text('stage2'), // JSON string for stage2 data
  stage3: text('stage3'), // JSON string for stage3 data
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const userSettings = sqliteTable('userSettings', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  councilModels: text('councilModels').notNull(), // JSON array of 4 model IDs
  chairmanModel: text('chairmanModel').notNull(),
  mode: text('mode', { enum: ['single', 'council'] }).notNull().default('single'),
  singleModel: text('singleModel'), // Model ID for single mode
  preprocessModel: text('preprocessModel'), // Optional preprocessing model
  // Custom prompt templates (null = use defaults)
  stage1Prompt: text('stage1Prompt'), // Custom Stage 1 prompt
  stage2Prompt: text('stage2Prompt'), // Custom Stage 2 prompt
  stage3Prompt: text('stage3Prompt'), // Custom Stage 3 prompt
  preprocessPrompt: text('preprocessPrompt'), // Custom preprocessing prompt
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const conversationAttachment = sqliteTable('conversationAttachment', {
  id: text('id').primaryKey(),
  conversationId: text('conversationId')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  key: text('key').notNull(), // S3 key
  url: text('url').notNull(), // S3 URL
  filename: text('filename').notNull(),
  contentType: text('contentType').notNull(),
  size: integer('size').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
