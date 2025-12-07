# Vercel Timeout Configuration for Paid Models

This document explains how the LLM Council Next.js app handles Vercel's timeout limits when using slower paid models.

## Vercel Timeout Limits

Vercel has different timeout limits based on your plan:

- **Hobby**: 10 seconds (default)
- **Pro**: 60 seconds
- **Enterprise**: 900 seconds (15 minutes)

## Current Configuration

### API Route Timeout

The streaming API route (`app/api/conversations/[id]/message/stream/route.ts`) has been configured with:

```typescript
export const maxDuration = 300; // 5 minutes
```

This setting:
- **Requires Vercel Pro or Enterprise plan** to work
- On Hobby plan, the route will still timeout at 10 seconds
- Allows up to 5 minutes for the entire council process to complete

### Model Query Timeout

Individual model queries (`lib/openrouter.ts`) have:

```typescript
timeout: number = 180000 // 3 minutes per model
```

This gives each model 3 minutes to respond before timing out.

## Why These Timeouts?

With 4 paid models, the council process involves:

1. **Stage 1**: 4 parallel model queries (concurrent)
2. **Stage 2**: 4 parallel ranking queries (concurrent)
3. **Stage 3**: 1 chairman synthesis query (sequential)
4. **Title Generation**: 1 additional query (sequential, first message only)

**Worst case timing** (if all sequential):
- Stage 1: ~30-60 seconds (parallel, so slowest model determines duration)
- Stage 2: ~30-60 seconds (parallel)
- Stage 3: ~30-60 seconds (sequential)
- Title: ~10-30 seconds (sequential, first message only)
- **Total**: ~100-210 seconds (1.5-3.5 minutes)

**Typical timing** with paid models:
- Usually completes in 2-3 minutes
- Sometimes takes longer for complex queries

## Required: Vercel Plan

To use the current configuration with paid models, you need:

- **Vercel Pro Plan** ($20/month) - supports up to 60 seconds
- **Vercel Enterprise** - supports up to 900 seconds

If you're on the **Hobby plan**, you have two options:

### Option 1: Upgrade to Vercel Pro

The simplest solution. Visit [Vercel Pricing](https://vercel.com/pricing) to upgrade.

### Option 2: Reduce Council Size (Hobby Plan)

If staying on Hobby plan, reduce the council to 2 models:

```typescript
// In lib/config.ts
export const COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "anthropic/claude-sonnet-4.5",
];

export const CHAIRMAN_MODEL = "openai/gpt-5.1";
```

This reduces total time to ~60-90 seconds, which may still timeout on Hobby plan.

**Note**: Even with 2 models, paid models may take longer than 10 seconds, so timeouts are still possible on Hobby plan.

## Monitoring Performance

### Check Response Times

Monitor your Vercel deployment logs to see actual response times:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to "Deployments" → "Functions"
4. Check the streaming route's execution time

### Optimize for Speed

If you're seeing timeouts or slow responses:

1. **Reduce Council Size**: Use 2 models instead of 4
2. **Use Faster Models**: Some paid models are faster than others
3. **Upgrade Vercel Plan**: Get more timeout allowance

## Alternative: Use Faster Models

Some OpenRouter models are faster than others. Consider these options:

### Fast Paid Models
- `openai/gpt-4o-mini` - Faster, cheaper version of GPT-4o
- `anthropic/claude-3-5-haiku` - Fast Claude model
- `google/gemini-flash-1.5` - Fast Gemini model

### Current Config (Slower but Higher Quality)
- `openai/gpt-5.1` - Very capable but slower
- `google/gemini-3-pro-preview` - High quality, moderate speed
- `anthropic/claude-sonnet-4.5` - High quality, moderate speed
- `x-ai/grok-4` - Fast to moderate

## Deployment Checklist

When deploying to Vercel with paid models:

- [ ] Verify you're on Vercel Pro or Enterprise plan
- [ ] Set `OPENROUTER_API_KEY` environment variable
- [ ] Set `BLOB_READ_WRITE_TOKEN` environment variable
- [ ] Deploy and test with a simple query first
- [ ] Monitor function execution times in Vercel dashboard
- [ ] Adjust `maxDuration` if needed (up to 60s Pro, 900s Enterprise)

## Troubleshooting

### Error: Function execution timed out

**Symptoms:**
```
Error: Function execution timed out after 10.0s
```

**Solutions:**
1. Verify you're on Vercel Pro or Enterprise plan
2. Check that `maxDuration = 300` is set in the route file
3. Redeploy the application (environment changes require redeployment)
4. Reduce council size to 2 models if on Hobby plan

### Error: 504 Gateway Timeout

**Symptoms:**
- No response from API
- Browser shows gateway timeout

**Solutions:**
1. Check Vercel dashboard for function logs
2. Verify OpenRouter API is responding (not their server issue)
3. Reduce model query timeout in `lib/openrouter.ts`
4. Consider using faster models

## Summary

**For Hobby Plan Users:**
- Default 10-second timeout is too short for paid models
- Consider upgrading to Pro ($20/month) for 60-second timeout
- Or use free models which respond faster

**For Pro/Enterprise Users:**
- Current config supports up to 5 minutes
- Should handle all paid model responses comfortably
- Monitor actual execution times and adjust as needed

The app is configured to work with paid models on Vercel Pro/Enterprise plans without timeout issues.
