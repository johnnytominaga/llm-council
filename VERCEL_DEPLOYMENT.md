# Deploying LLM Council to Vercel

This guide walks you through deploying the LLM Council Next.js app to Vercel with Blob Storage.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- An [OpenRouter API key](https://openrouter.ai/keys)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Enable Vercel Blob Storage

The app uses Vercel Blob Storage for storing conversations in production (since Vercel's serverless environment has a read-only filesystem).

### Option A: Enable via Vercel Dashboard

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create a new one)
3. Go to the **Storage** tab
4. Click **Create Database** → Choose **Blob**
5. Follow the prompts to create a Blob store
6. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your environment variables

### Option B: Enable via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Link your project
vercel link

# Create a Blob store
vercel blob create
```

## Step 2: Set Environment Variables

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Required for LLM API access |
| `BLOB_READ_WRITE_TOKEN` | (Auto-set by Vercel) | For Blob Storage access |

**Note**: The `BLOB_READ_WRITE_TOKEN` is automatically set when you enable Blob Storage.

## Step 3: Deploy

### Deploy from Git Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your Git repository
4. Vercel will auto-detect it's a Next.js project
5. Click **Deploy**

### Deploy via CLI

```bash
# From your project directory
vercel --prod
```

## Step 4: Verify Deployment

1. Once deployed, visit your production URL (e.g., `https://your-app.vercel.app`)
2. Create a new conversation
3. Send a test message
4. Verify the conversation is saved (refresh the page and check if it persists)

## How It Works

The app automatically detects which storage backend to use:

- **Local Development**: Uses file-based storage in `data/conversations/`
- **Vercel Production**: Uses Blob Storage when `BLOB_READ_WRITE_TOKEN` is present

The storage adapter (`lib/storage-adapter.ts`) handles this automatically.

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN not set"

**Solution**: Enable Blob Storage in your Vercel project (see Step 1)

### Error: "Failed to list conversations"

**Possible causes**:
1. Blob Storage not enabled → Enable it in Vercel dashboard
2. API key issues → Check that `BLOB_READ_WRITE_TOKEN` is set
3. First deployment → This is normal, conversations list will be empty initially

### Error: "OpenRouter API error"

**Solution**:
1. Verify `OPENROUTER_API_KEY` is set correctly in environment variables
2. Check your OpenRouter account has sufficient credits
3. Ensure the API key has the correct permissions

### Conversations not persisting

**Check**:
1. Blob Storage is enabled
2. `BLOB_READ_WRITE_TOKEN` environment variable is set
3. Check Vercel logs for any storage errors: `vercel logs`

## Storage Costs

Vercel Blob Storage pricing (as of 2025):

- **Hobby Plan**: 1GB included free
- **Pro Plan**: First 10GB included
- **Enterprise**: Custom pricing

A typical conversation (with 1-2 exchanges) uses ~5-10KB. With 1GB, you can store approximately 100,000-200,000 conversations.

## Alternative Deployment Options

If you prefer not to use Vercel Blob Storage, consider:

### Option 1: Deploy to Railway/Render

These platforms support persistent storage:

```bash
# No code changes needed
# Just deploy with file-based storage
```

### Option 2: Use a Database

Modify `lib/storage-adapter.ts` to use:
- **PostgreSQL** (with Vercel Postgres or Supabase)
- **MongoDB** (with MongoDB Atlas)
- **Redis** (with Upstash Redis)

### Option 3: Use Vercel KV (Redis)

Instead of Blob Storage, you can use Vercel KV:

```bash
vercel kv create
```

Then modify the storage adapter to use KV instead of Blob.

## Monitoring

Monitor your deployment:

```bash
# View real-time logs
vercel logs --follow

# Check deployment status
vercel list
```

## Redeployment

To redeploy after changes:

```bash
# Push to your Git branch
git push

# Or redeploy via CLI
vercel --prod
```

Vercel will automatically redeploy when you push to your main branch.

## Environment Variables Per Environment

You can set different variables for:
- **Production** - Your main deployment
- **Preview** - Pull request previews
- **Development** - Local development

Set these separately in **Settings** → **Environment Variables** by selecting the appropriate environment.

## Next Steps

- Monitor your app at the Vercel Dashboard
- Set up custom domains in **Settings** → **Domains**
- Configure deployment protection if needed
- Set up monitoring and analytics

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
