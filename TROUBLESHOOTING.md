# Troubleshooting Guide

## Common Issues and Solutions

### Issue: Conversation 404 Error on Vercel

**Symptoms:**
- Conversations are created and appear in the list
- Clicking a conversation shows 404 error
- Vercel logs show `Conversation not found`

**Cause:**
The Blob Storage implementation was trying to construct URLs manually instead of using the URLs provided by the Vercel Blob SDK.

**Solution:**
This has been fixed in the latest version. The `getConversation()` function now:
1. Uses `list()` to find the blob by its path
2. Retrieves the correct URL from the blob metadata
3. Fetches the conversation using that URL

**If you still see this issue:**
```bash
git pull  # Get latest fixes
git push  # Redeploy to Vercel
```

### Issue: Blobs Created but Empty Conversations List

**Symptoms:**
- Blobs are visible in Vercel dashboard
- But conversations list is empty in the UI

**Check:**
1. Verify `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
2. Check Vercel logs: `vercel logs --follow`
3. Look for errors like:
   - `BLOB_READ_WRITE_TOKEN not set`
   - `Failed to fetch blob`

**Solution:**
Ensure Blob Storage is properly enabled:
```bash
vercel blob create
```

### Issue: "Failed to list conversations" Error

**Symptoms:**
- Error in console: "Failed to list conversations"
- Sidebar shows "No conversations yet"

**Possible Causes:**
1. **Missing Blob Token**: `BLOB_READ_WRITE_TOKEN` not set
2. **Network Error**: Can't reach Vercel Blob Storage
3. **Blob Storage Not Enabled**: Storage not created in Vercel

**Debug Steps:**
1. Check Vercel logs:
   ```bash
   vercel logs production --follow
   ```

2. Verify environment variables in Vercel dashboard:
   - Go to Settings → Environment Variables
   - Ensure `BLOB_READ_WRITE_TOKEN` exists

3. Check blob storage exists:
   - Go to Storage tab in Vercel dashboard
   - Should see a Blob store listed

### Issue: Local Development Not Working

**Symptoms:**
- Errors like "Cannot find module 'fs'"
- Storage errors in local dev

**Solution:**
Local development should use file-based storage automatically. If you see errors:

1. Check your `.env.local` doesn't have `BLOB_READ_WRITE_TOKEN`
2. Verify `data/conversations/` directory is writable
3. Try clearing `.next` folder:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Issue: "Using file-based storage" on Vercel

**Symptoms:**
- Vercel logs show "Using file-based storage"
- But filesystem errors occur

**Cause:**
`BLOB_READ_WRITE_TOKEN` is not set in production environment variables.

**Solution:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Verify `BLOB_READ_WRITE_TOKEN` is set for Production
4. If missing, enable Blob Storage:
   - Go to Storage tab
   - Create a Blob store
   - Redeploy

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Can't fetch conversations

**Cause:**
Blob Storage URLs might not be allowing your domain.

**Solution:**
This is rare with Vercel Blob, but if it happens:
1. Ensure blobs are created with `access: 'public'` (already done in code)
2. Check Network tab in browser DevTools for actual error
3. Contact Vercel support if blobs aren't publicly accessible

### Issue: Slow Performance

**Symptoms:**
- Loading conversations takes a long time
- UI feels sluggish

**Cause:**
Fetching all conversation contents to show metadata.

**Optimization (Future Enhancement):**
Store metadata separately or use blob metadata tags. Current implementation fetches each blob's full content to get title and message count.

**Temporary Workaround:**
Consider pagination if you have many conversations (100+).

### Issue: TypeScript Errors During Build

**Symptoms:**
- Build fails with TypeScript errors
- Mentions storage types

**Solution:**
```bash
npm install  # Ensure all deps installed
npm run build  # Check for specific errors
```

If storage type errors persist:
1. Check `lib/storage-adapter.ts` is importing types correctly
2. Ensure both `storage.ts` and `storage-vercel.ts` export same interface

### Debugging Tips

**Check which storage backend is being used:**
Look at build logs or runtime logs:
```
Using file-based storage  # Local dev
Using Vercel Blob Storage  # Production
```

**Test blob operations manually:**
```bash
# Install Vercel CLI
npm i -g vercel

# List blobs
vercel blob list

# View blob content
vercel blob get <blob-url>
```

**Check conversation ID format:**
Conversation IDs should be valid UUIDs. If you see weird IDs, there might be an issue with `randomUUID()` in the creation endpoint.

**Verify JSON structure:**
Download a blob and check its JSON structure matches:
```json
{
  "id": "uuid-here",
  "created_at": "2025-...",
  "title": "Conversation Title",
  "messages": []
}
```

## Getting Help

If you're still stuck:

1. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```

2. **Enable Debug Mode:**
   Add to `.env.local` or Vercel env vars:
   ```
   NODE_ENV=development
   ```

3. **Check Browser Console:**
   Open DevTools → Console tab for client-side errors

4. **Review Network Tab:**
   DevTools → Network tab to see failed API requests

5. **Contact Support:**
   - Vercel Support: https://vercel.com/support
   - Check Vercel Status: https://vercel-status.com

## Useful Commands

```bash
# View production logs
vercel logs production

# List all blobs
vercel blob list

# Remove all blobs (CAUTION!)
vercel blob list | xargs -n1 vercel blob delete

# Redeploy without changes
vercel --prod --force

# Check environment variables
vercel env ls
```

## Known Limitations

1. **No Pagination**: All conversations loaded at once (could be slow with 100+ conversations)
2. **No Search**: Can't search conversation content
3. **No Bulk Operations**: Can't delete multiple conversations at once
4. **Metadata Performance**: Fetches full conversation to show title/count

These could be optimized in future versions if needed.
