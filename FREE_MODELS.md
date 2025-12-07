# Using Free Models on OpenRouter

This guide helps you configure the LLM Council to use free models available on OpenRouter.

## Current Free Model Configuration

The app is configured with these verified free models:

```typescript
// In lib/config.ts
export const COUNCIL_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemini-flash-1.5:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

export const CHAIRMAN_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
```

## Finding Available Free Models

### Method 1: OpenRouter Website
1. Go to [OpenRouter Models](https://openrouter.ai/models)
2. Use filters:
   - Check "Free" to show only free models
   - Sort by "Context" or "Pricing"
3. Click on a model to see its full identifier (e.g., `meta-llama/llama-3.2-3b-instruct:free`)

### Method 2: OpenRouter API
Query the API to get all free models programmatically:

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | jq '.data[] | select(.pricing.prompt == "0") | .id'
```

## Common Free Models (as of December 2025)

### Small, Fast Models (Good for Council Members)
- `meta-llama/llama-3.2-3b-instruct:free` - Fast, good quality
- `google/gemini-flash-1.5:free` - Google's fast model
- `qwen/qwen-2.5-7b-instruct:free` - Chinese model, good English
- `microsoft/phi-3-mini-128k-instruct:free` - Microsoft's small model

### Larger Models (Good for Chairman)
- `nousresearch/hermes-3-llama-3.1-405b:free` - Very large, high quality
- `meta-llama/llama-3.1-70b-instruct:free` - Good balance
- `google/gemini-flash-1.5:free` - Fast and capable

### Specialized Models
- `qwen/qwen-2.5-coder-32b-instruct:free` - Code-focused
- `mistralai/mistral-7b-instruct:free` - Good general purpose

## Rate Limits on Free Models

Free models have rate limits:
- **Per minute**: Usually 10-20 requests
- **Per day**: Usually 200-1000 requests
- **Concurrent**: Usually 1-3 simultaneous requests

### Dealing with Rate Limits

#### Error: 429 (Too Many Requests)

**Symptoms:**
```
Error querying model: HTTP error! status: 429
```

**Solutions:**

1. **Reduce Council Size** - Use fewer models:
   ```typescript
   export const COUNCIL_MODELS = [
     "meta-llama/llama-3.2-3b-instruct:free",
     "google/gemini-flash-1.5:free",
   ];
   ```

2. **Add Delays Between Stages** - Modify `lib/council.ts` to add delays

3. **Use Different Free Models** - Spread across providers to avoid hitting one provider's limit

## Common Errors and Solutions

### Error: 404 (Model Not Found)

**Cause:** The model identifier is incorrect or the model was removed.

**Example:**
```
Error querying model openai/gpt-oss-120b:free: HTTP error! status: 404
```

**Solution:**
1. Check the model exists on [OpenRouter Models](https://openrouter.ai/models)
2. Verify the exact model ID (including `:free` suffix)
3. Update `lib/config.ts` with correct ID

### Error: 402 (Payment Required)

**Cause:** The model requires credits, or you've exhausted free tier limits.

**Example:**
```
Error querying model google/gemini-2.5-flash: HTTP error! status: 402
```

**Solution:**
1. Ensure model ID includes `:free` suffix
2. Check your OpenRouter account credits
3. Wait if you've hit daily limits
4. Use a different free model

### Error: 500 (Server Error)

**Cause:** The model provider's servers are having issues.

**Solution:**
1. Wait and retry
2. Use a different model temporarily
3. Check OpenRouter status page

## Optimizing for Free Tier

### Best Practices

1. **Use Smaller Council**
   ```typescript
   // Good for free tier
   export const COUNCIL_MODELS = [
     "meta-llama/llama-3.2-3b-instruct:free",
     "google/gemini-flash-1.5:free",
   ];
   ```

2. **Same Model for Chairman**
   ```typescript
   // Reuse a council model to save requests
   export const CHAIRMAN_MODEL = COUNCIL_MODELS[0];
   ```

3. **Disable Title Generation** (optional)
   Comment out title generation in `app/api/conversations/[id]/message/stream/route.ts`:
   ```typescript
   // if (conversation.messages.length === 0) {
   //   const title = await generateConversationTitle(content);
   //   await updateConversationTitle(id, title);
   //   sendEvent('title_complete', { title });
   // }
   ```

4. **Cache Responses** (advanced)
   Implement caching to avoid re-querying for similar questions

## Testing Free Models Locally

Test a model before adding it to your config:

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct:free",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Upgrading to Paid Models

When ready to use paid models:

1. **Add Credits** to your OpenRouter account
2. **Remove `:free` suffix** from model IDs
3. **Use Premium Models**:
   ```typescript
   export const COUNCIL_MODELS = [
     "openai/gpt-4o",
     "anthropic/claude-3.5-sonnet",
     "google/gemini-pro",
     "meta-llama/llama-3.1-70b-instruct",
   ];
   ```

## Monitoring Usage

Check your OpenRouter usage:
1. Go to [OpenRouter Dashboard](https://openrouter.ai/settings/usage)
2. View requests per model
3. Monitor rate limit hits
4. Track daily usage

## Alternative: Mix Free and Paid

You can mix free and paid models:

```typescript
export const COUNCIL_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",    // Free
  "google/gemini-flash-1.5:free",             // Free
  "anthropic/claude-3.5-sonnet",              // Paid (better quality)
];

export const CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"; // Use best model for synthesis
```

This gives you a good balance of cost and quality!

## Troubleshooting

### Check Model Availability
```bash
# List all free models
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | jq '.data[] | select(.pricing.prompt == "0") | {id, name}'
```

### Test Specific Model
```bash
# Replace with your model
MODEL="meta-llama/llama-3.2-3b-instruct:free"

curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d "{\"model\": \"$MODEL\", \"messages\": [{\"role\": \"user\", \"content\": \"Test\"}]}"
```

### View Error Details
Check `lib/openrouter.ts` - it now logs detailed error messages from OpenRouter including:
- Specific error from API
- Model that failed
- HTTP status code

## Resources

- [OpenRouter Models Page](https://openrouter.ai/models)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference)
- [Rate Limits Info](https://openrouter.ai/docs/limits)
