/**
 * OpenRouter API client for making LLM requests.
 */

import { OPENROUTER_API_KEY, OPENROUTER_API_URL } from './config';

export interface Message {
  role: string;
  content: string;
}

export interface ModelResponse {
  content: string;
  reasoning_details?: any;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function queryModel(
  model: string,
  messages: Message[],
  timeout: number = 120000,
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
