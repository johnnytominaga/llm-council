/**
 * OpenRouter API client for making LLM requests.
 */

import { OPENROUTER_API_KEY, OPENROUTER_API_URL } from './config';

export type MessageContent =
  | string
  | Array<{
      type: 'text' | 'image_url' | 'file';
      text?: string;
      image_url?: { url: string };
      file?: { type: 'application/pdf'; url: string };
    }>;

export interface Message {
  role: string;
  content: MessageContent;
}

export interface ModelResponse {
  content: string;
  reasoning_details?: any;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function queryModel(
  model: string,
  messages: Message[],
  timeout: number = 180000, // Increased to 3 minutes for paid models
  maxRetries: number = 3
): Promise<ModelResponse | null> {
  /**
   * Query a single model via OpenRouter API with retry logic.
   *
   * Args:
   *   model: OpenRouter model identifier (e.g., "openai/gpt-4o")
   *   messages: List of message objects with 'role' and 'content'
   *   timeout: Request timeout in milliseconds
   *   maxRetries: Maximum number of retry attempts for rate limits
   *
   * Returns:
   *   Response object with 'content' and optional 'reasoning_details', or null if failed
   */

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    model,
    messages,
  };

  let lastError: Error | null = null;

  // Retry loop for rate limits
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from OpenRouter
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // If can't parse error, use status text
          errorMessage = `${response.status} ${response.statusText}`;
        }

        // If it's a rate limit error (429) and we have retries left, wait and retry
        if (response.status === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Rate limit hit for ${model}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue; // Retry
        }

        console.error(`Model ${model} failed: ${errorMessage}`);
        lastError = new Error(`HTTP error! status: ${response.status} - ${errorMessage}`);
        throw lastError;
      }

      const data = await response.json();

      // Check if response has the expected structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Model ${model} returned unexpected structure:`, data);
        throw new Error('Invalid response structure from model');
      }

      const message = data.choices[0].message;

      return {
        content: message.content,
        reasoning_details: message.reasoning_details,
      };
    } catch (error) {
      lastError = error as Error;
      // If it's not the last attempt and it's a retryable error, continue
      if (attempt < maxRetries && error instanceof Error && error.message.includes('429')) {
        continue;
      }
      // Otherwise, break out of retry loop
      break;
    }
  }

  // All retries exhausted
  console.error(`Error querying model ${model} after ${maxRetries} retries:`, lastError);
  return null;
}

export async function queryModelStream(
  model: string,
  messages: Message[],
  onChunk: (chunk: StreamChunk) => void,
  timeout: number = 180000,
  maxRetries: number = 3
): Promise<ModelResponse | null> {
  /**
   * Query a single model via OpenRouter API with streaming support.
   *
   * Args:
   *   model: OpenRouter model identifier
   *   messages: List of message objects with 'role' and 'content'
   *   onChunk: Callback function for each streamed chunk
   *   timeout: Request timeout in milliseconds
   *   maxRetries: Maximum number of retry attempts for rate limits
   *
   * Returns:
   *   Full response object with complete 'content', or null if failed
   */

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    model,
    messages,
    stream: true,
  };

  // Debug: log payload when it contains multimodal content
  if (messages.some(m => Array.isArray(m.content))) {
    console.log('Sending multimodal payload to OpenRouter:', JSON.stringify(payload, null, 2));
  }

  let lastError: Error | null = null;

  // Retry loop for rate limits
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Check for pre-stream errors (before any tokens sent)
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }

        // Handle rate limits with retry
        if (response.status === 429 && attempt < maxRetries) {
          clearTimeout(timeoutId);
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Rate limit hit for ${model}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        console.error(`Model ${model} failed: ${errorMessage}`);
        lastError = new Error(`HTTP error! status: ${response.status} - ${errorMessage}`);
        throw lastError;
      }

      clearTimeout(timeoutId);

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          while (true) {
            const lineEnd = buffer.indexOf('\n');
            if (lineEnd === -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            // Handle SSE comments (ignore per spec)
            if (line.startsWith(':')) {
              continue;
            }

            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onChunk({ content: '', done: true });
                return { content: fullContent };
              }

              try {
                const parsed = JSON.parse(data);

                // Check for mid-stream errors
                if (parsed.error) {
                  console.error(`Stream error for ${model}: ${parsed.error.message}`);
                  onChunk({
                    content: '',
                    done: true,
                    error: parsed.error.message
                  });
                  throw new Error(parsed.error.message);
                }

                // Extract content from delta
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  onChunk({ content, done: false });
                }

                // Check for finish_reason
                const finishReason = parsed.choices?.[0]?.finish_reason;
                if (finishReason) {
                  if (finishReason === 'error') {
                    throw new Error('Stream terminated with error finish_reason');
                  }
                  // Normal completion
                  onChunk({ content: '', done: true });
                  return { content: fullContent };
                }
              } catch (parseError) {
                if (parseError instanceof Error && parseError.message.includes('Stream')) {
                  throw parseError;
                }
                // Ignore JSON parse errors for malformed chunks
              }
            }
          }
        }

        // Stream ended without [DONE] marker
        onChunk({ content: '', done: true });
        return { content: fullContent };
      } finally {
        reader.cancel();
      }
    } catch (error) {
      lastError = error as Error;
      // If it's not the last attempt and it's a retryable error, continue
      if (attempt < maxRetries && error instanceof Error && error.message.includes('429')) {
        continue;
      }
      // Otherwise, break out of retry loop
      break;
    }
  }

  // All retries exhausted
  console.error(`Error querying model ${model} after ${maxRetries} retries:`, lastError);
  return null;
}

export async function queryModelsParallel(
  models: string[],
  messages: Message[]
): Promise<Record<string, ModelResponse | null>> {
  /**
   * Query multiple models in parallel.
   *
   * Args:
   *   models: List of OpenRouter model identifiers
   *   messages: List of message objects to send to each model
   *
   * Returns:
   *   Object mapping model identifier to response (or null if failed)
   */

  // Create promises for all models
  const promises = models.map((model) => queryModel(model, messages));

  // Wait for all to complete
  const responses = await Promise.all(promises);

  // Map models to their responses
  const result: Record<string, ModelResponse | null> = {};
  models.forEach((model, index) => {
    result[model] = responses[index];
  });

  return result;
}
