/**
 * API client for the LLM Council backend.
 */

const API_BASE = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId: string) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Update a conversation title.
   */
  async updateConversationTitle(conversationId: string, title: string) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/title`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update conversation title');
    }
    return response.json();
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId: string) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param conversationId - The conversation ID
   * @param content - The message content
   * @param onEvent - Callback function for each event: (eventType, data) => void
   * @param attachments - Optional file attachments
   * @param useCouncil - Whether to use council mode (overrides user settings)
   * @returns Promise<void>
   */
  async sendMessageStream(
    conversationId: string,
    content: string,
    onEvent: (eventType: string, event: any) => void,
    attachments?: any[],
    useCouncil?: boolean
  ) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, attachments, useCouncil }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete lines

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue; // Skip empty data

          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e, 'Data:', data);
          }
        }
      }
    }

    // Process any remaining buffered content
    if (buffer.trim() && buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim();
      try {
        const event = JSON.parse(data);
        onEvent(event.type, event);
      } catch (e) {
        console.error('Failed to parse final SSE event:', e);
      }
    }
  },

  /**
   * Get user settings.
   */
  async getSettings() {
    const response = await fetch(`${API_BASE}/api/settings`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to get settings');
    }
    return response.json();
  },

  /**
   * Update user settings.
   */
  async updateSettings(settings: {
    mode?: 'single' | 'council';
    singleModel?: string;
    councilModels?: string[];
    chairmanModel?: string;
    preprocessModel?: string | null;
    stage1Prompt?: string | null;
    stage2Prompt?: string | null;
    stage3Prompt?: string | null;
    preprocessPrompt?: string | null;
  }) {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  /**
   * Fetch available models from OpenRouter.
   */
  async getAvailableModels() {
    const response = await fetch(`${API_BASE}/api/models`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to get available models');
    }
    return response.json();
  },

  /**
   * Get all attachments for a conversation.
   */
  async getConversationAttachments(conversationId: string) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/attachments`,
      {
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation attachments');
    }
    return response.json();
  },

  /**
   * Add an attachment to a conversation's pool.
   */
  async addConversationAttachment(
    conversationId: string,
    attachment: {
      key: string;
      url: string;
      filename: string;
      contentType: string;
      size: number;
    }
  ) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/attachments`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachment),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to add conversation attachment');
    }
    return response.json();
  },

  /**
   * Delete an attachment from a conversation and S3.
   */
  async deleteConversationAttachment(
    conversationId: string,
    attachmentId: string
  ) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/attachments`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attachmentId }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation attachment');
    }
    return response.json();
  },

  /**
   * Delete an uploaded file from S3.
   */
  async deleteUploadedFile(key: string) {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete uploaded file');
    }
    return response.json();
  },
};
