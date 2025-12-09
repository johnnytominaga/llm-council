# Vercel Deployment Fix - Summary

## Problem
The original Next.js app used file-based storage, which doesn't work on Vercel because:
- Vercel uses serverless functions with **read-only filesystems**
- Only `/tmp` directory is writable, but it's ephemeral (cleared between invocations)
- This caused the error: `ENOENT: no such file or directory, mkdir '/var/task/data/conversations'`

## Solution
Implemented a **dual-storage system** that automatically uses the right backend:

### Local Development (No Changes Needed)
- Uses file-based storage (`lib/storage.ts`)
- Stores conversations in `data/conversations/` directory
- Works exactly as before

### Vercel Production (Automatic)
- Uses Vercel Blob Storage (`lib/storage-vercel.ts`)
- Stores conversations in Vercel's cloud storage
- Activates automatically when `BLOB_READ_WRITE_TOKEN` is present

## What Was Changed

### New Files Created
1. **`lib/storage-vercel.ts`** - Blob Storage implementation
2. **`lib/storage-adapter.ts`** - Smart adapter that chooses the right storage
3. **`VERCEL_DEPLOYMENT.md`** - Complete deployment guide
4. **`VERCEL_FIX.md`** - This summary document

### Modified Files
1. **`app/api/conversations/route.ts`** - Now uses storage adapter + async/await
2. **`app/api/conversations/[id]/route.ts`** - Now uses storage adapter + async/await
3. **`app/api/conversations/[id]/message/stream/route.ts`** - Now uses storage adapter + async/await
4. **`.env.example`** - Added Blob Storage token documentation
5. **`package.json`** - Added `@vercel/blob` dependency

## How It Works

```typescript
// lib/storage-adapter.ts automatically detects the environment
if (process.env.BLOB_READ_WRITE_TOKEN) {
  // Use Vercel Blob Storage
  import from './storage-vercel';
} else {
  // Use file-based storage
  import from './storage';
}
```

All API routes now import from `@/lib/storage-adapter` instead of `@/lib/storage`, making storage backend transparent to the application code.

## Deployment Steps

### 1. Enable Blob Storage on Vercel

**Via Dashboard:**
- Go to your Vercel project
- Navigate to **Storage** tab
- Click **Create Database** → **Blob**
- Vercel auto-sets `BLOB_READ_WRITE_TOKEN`

**Via CLI:**
```bash
vercel blob create
```

### 2. Set Environment Variable

In Vercel project settings:
- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)
- `BLOB_READ_WRITE_TOKEN` - Auto-set by Vercel when you create a Blob store

### 3. Deploy

```bash
git push  # Auto-deploys if connected to Git
# or
vercel --prod  # Deploy via CLI
```

## Testing Locally

The app still works exactly as before in local development:

```bash
npm run dev
# Uses file-based storage in data/conversations/
```

## Storage Compatibility

**Data format is identical** between both storage backends:
- Same JSON structure
- Same conversation format
- Same message format

You can even export conversations from Blob Storage and import them locally (and vice versa) if needed.

## Costs

Vercel Blob Storage:
- **Hobby Plan**: 1GB free (enough for ~100k-200k conversations)
- **Pro Plan**: 10GB included
- A conversation typically uses 5-10KB

## Alternative Deployment Options

If you don't want to use Vercel Blob Storage:

1. **Deploy to Railway/Render** - They support persistent filesystem
2. **Use Vercel KV (Redis)** - Modify adapter to use Redis
3. **Use a database** - PostgreSQL, MongoDB, etc.
4. **Use other platforms** - DigitalOcean App Platform, Fly.io, etc.

## Verification

After deployment, verify it works:
1. Visit your Vercel URL
2. Create a new conversation
3. Send a message
4. Refresh the page
5. Verify conversation persists

Check Vercel logs if issues:
```bash
vercel logs --follow
```

## Benefits

✅ **Zero code changes for local development**
✅ **Automatic storage selection**
✅ **Same API interface**
✅ **Works on Vercel serverless**
✅ **Same data format**
✅ **Backwards compatible**

## Questions?

See `VERCEL_DEPLOYMENT.md` for the complete deployment guide.
