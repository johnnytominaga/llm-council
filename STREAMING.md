# OpenRouter Streaming Implementation

This document describes the real-time streaming implementation for the LLM Council app.

## Overview

The app now uses OpenRouter's streaming API to display model responses in real-time as they're generated, providing immediate user feedback and a more engaging experience.

## How It Works

### Backend (OpenRouter API)

**New Streaming Function**: `queryModelStream()` in `lib/openrouter.ts`

```typescript
export async function queryModelStream(
  model: string,
  messages: Message[],
  onChunk: (chunk: StreamChunk) => void,
  timeout: number = 180000,
  maxRetries: number = 3
): Promise<ModelResponse | null>
```

**Features:**
- Streams responses using OpenRouter's `stream: true` parameter
- Calls `onChunk` callback for each text chunk received
- Handles SSE (Server-Sent Events) format
- Supports mid-stream error detection
- Includes retry logic for rate limits
- Ignores SSE comments per spec (`: OPENROUTER PROCESSING`)

### Council Orchestration

**New Streaming Functions** in `lib/council.ts`:

1. `stage1CollectResponsesStream()` - Streams individual model responses in parallel
2. `stage2CollectRankingsStream()` - Streams peer rankings in parallel
3. `stage3SynthesizeFinalStream()` - Streams chairman synthesis

Each function:
- Accepts an `onChunk` callback to stream text as it arrives
- Returns the complete result when done
- Runs multiple models in parallel (Stage 1 and 2)

### API Route

**Updated**: `app/api/conversations/[id]/message/stream/route.ts`

The streaming route now:
1. Sends new event types: `stage1_chunk`, `stage2_chunk`, `stage3_chunk`
2. Accumulates partial results server-side
3. Streams updates to the client in real-time

**New Event Types:**
```typescript
// Chunk events (sent continuously during streaming)
stage1_chunk: { model: string, chunk: string, partial: string }
stage2_chunk: { model: string, chunk: string, partial: string }
stage3_chunk: { chunk: string, partial: string }

// Complete events (sent when stage finishes)
stage1_complete: { data: Stage1Result[] }
stage2_complete: { data: Stage2Result[], metadata: Metadata }
stage3_complete: { data: Stage3Result }
```

### Frontend

**Updated Components:**

1. **`app/page.tsx`**
   - Added `streaming` object to message state
   - Handles new chunk events
   - Updates streaming content progressively

2. **`components/Stage1.tsx`**
   - Accepts `streaming` prop with partial responses per model
   - Shows blinking cursor during streaming
   - Seamlessly transitions to final response

3. **`components/Stage2.tsx`**
   - Accepts `streaming` prop with partial rankings per model
   - Shows streaming content with cursor
   - Hides parsed ranking until complete

4. **`components/Stage3.tsx`**
   - Accepts `streaming` prop for chairman response
   - Shows progressive synthesis with cursor
   - Chairman label appears immediately

5. **`app/globals.css`**
   - Added `.streaming-cursor` class with blinking animation

## User Experience

### Before (No Streaming)
1. User sends question
2. Loading spinner for 2-3 minutes
3. All responses appear at once

### After (With Streaming)
1. User sends question
2. Stage 1 tabs appear immediately
3. Text appears word-by-word across all models simultaneously
4. Stage 2 tabs appear when Stage 1 completes
5. Rankings stream in real-time
6. Stage 3 streams final synthesis
7. Much more engaging and responsive

## Visual Indicators

**Streaming Cursor**: `▊` (blinking)
- Appears at the end of streaming text
- Blue color (#4a90e2)
- Blinks every 1 second
- Disappears when streaming completes

## Performance Benefits

1. **Perceived Performance**: Users see output immediately instead of waiting
2. **Early Feedback**: Can read partial responses while others are still generating
3. **Engagement**: Dynamic updates keep users engaged
4. **Parallel Display**: All 4 models stream simultaneously in Stage 1 and 2

## Technical Details

### SSE Format Handling

The implementation correctly handles OpenRouter's SSE format:
```text
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

**Special Cases:**
- SSE comments (`: OPENROUTER PROCESSING`) are ignored per spec
- Mid-stream errors are detected and handled
- Finish reasons are checked for proper completion

### Error Handling

**Pre-Stream Errors** (before any tokens):
- HTTP error responses (400, 401, 429, etc.)
- Handled with retry logic for rate limits

**Mid-Stream Errors** (after tokens started):
- Error object in response: `{ error: { message: "..." } }`
- Finish reason = "error"
- Stream terminates gracefully

### Parallel Streaming

**Stage 1 and 2**: Multiple models stream simultaneously
- Each model has its own stream handler
- Chunks are identified by model name
- UI updates independently for each model
- All streams run in parallel using `Promise.all()`

**Stage 3**: Single chairman model streams
- No parallel processing needed
- Chunks append to single text area

## Code Example

### Backend (Simplified)
```typescript
await stage1CollectResponsesStream(content, (model, chunk) => {
  // Accumulate chunks
  stage1Partial[model] += chunk;

  // Send to client
  sendEvent('stage1_chunk', {
    model,
    chunk,
    partial: stage1Partial[model],
  });
});
```

### Frontend (Simplified)
```typescript
case 'stage1_chunk':
  setCurrentConversation((prev) => {
    const lastMsg = prev.messages[prev.messages.length - 1];
    lastMsg.streaming.stage1[event.model] = event.partial;
    return { ...prev, messages: [...prev.messages] };
  });
  break;
```

### Component (Simplified)
```typescript
<Stage1
  responses={msg.stage1 || []}
  streaming={msg.streaming?.stage1}
/>

// Inside Stage1
const content = isStreaming ? streaming[currentModel] : responses.find(...).response;
{isStreaming && <span className="streaming-cursor">▊</span>}
```

## Compatibility

**OpenRouter Models**: All models support streaming
- GPT-4, GPT-5 (OpenAI)
- Claude Sonnet, Opus (Anthropic)
- Gemini (Google)
- Grok (xAI)

**Browser Support**: All modern browsers with SSE support
- Chrome, Firefox, Safari, Edge
- Mobile browsers

## Configuration

No configuration needed! Streaming is enabled by default.

**To disable streaming** (not recommended):
- Use original functions: `stage1CollectResponses()`, `stage2CollectRankings()`, `stage3SynthesizeFinal()`
- Remove `Stream` suffix from function names in the route

## Troubleshooting

### Issue: No streaming appears

**Cause**: Buffering in middleware or proxy
**Solution**: Ensure no response buffering in Vercel or CDN

### Issue: Chunks arrive slowly

**Cause**: Network latency or slow model
**Solution**: Normal behavior, varies by model and query complexity

### Issue: Stream cuts off mid-response

**Cause**: Timeout or connection interrupted
**Solution**: Check network, increase timeout values

## Performance Metrics

**Typical Streaming Performance:**
- First token: 1-2 seconds
- Tokens per second: 20-50 (varies by model)
- Stage 1 completion: 30-60 seconds (4 models in parallel)
- Stage 2 completion: 30-60 seconds (4 models in parallel)
- Stage 3 completion: 30-60 seconds (single model)
- Total: 2-3 minutes (same as before, but with real-time feedback)

## Future Enhancements

Possible improvements:
1. **Token usage display**: Show tokens consumed in real-time
2. **Speed indicators**: Show tokens/sec for each model
3. **Progress bars**: Visual progress for each stage
4. **Chunk size optimization**: Batch smaller chunks for smoother display
5. **Stream cancellation**: Allow user to stop generation mid-stream

## Summary

Streaming transforms the LLM Council experience from "wait and see everything" to "watch it happen in real-time." Users can:
- Read responses as they're generated
- Compare models' thinking in real-time
- See immediate progress feedback
- Feel more engaged with the process

The implementation is robust, handles errors gracefully, and works with all OpenRouter models.
