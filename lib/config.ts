/**
 * Configuration for the LLM Council.
 */

// OpenRouter API key
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Council members - list of OpenRouter model identifiers
export const COUNCIL_MODELS = [
  "openai/gpt-5.1",
  "google/gemini-3-pro-preview",
  "anthropic/claude-sonnet-4.5",
  "x-ai/grok-4",
];

// Chairman model - synthesizes final response
export const CHAIRMAN_MODEL = "google/gemini-3-pro-preview";

// OpenRouter API endpoint
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Data directory for conversation storage
export const DATA_DIR = "data/conversations";
