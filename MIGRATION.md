# Migration from Python/FastAPI + React to Next.js

This document outlines the migration process and differences between the original Python/FastAPI backend with React frontend and the new unified Next.js application.

## Overview

The original LLM Council application consisted of:
- **Backend**: Python with FastAPI, running on port 8001
- **Frontend**: React with Vite, running on port 5173
- **Communication**: REST API + Server-Sent Events (SSE)

The new Next.js version consolidates both into a single application running on port 3000.

## Key Changes

### Architecture

| Original | Next.js |
|----------|---------|
| Separate Python backend | Unified Next.js app |
| FastAPI routes | Next.js API routes |
| CORS configuration needed | Same-origin, no CORS |
| Two separate processes | Single process |
| Python + JavaScript | TypeScript only |

### File Structure Mapping

```
Original                          →  Next.js
────────────────────────────────────────────────────────────
backend/config.py                 →  lib/config.ts
backend/openrouter.py             →  lib/openrouter.ts
backend/storage.py                →  lib/storage.ts
backend/council.py                →  lib/council.ts
backend/main.py (FastAPI routes)  →  app/api/**/route.ts
frontend/src/App.jsx              →  app/page.tsx
frontend/src/api.js               →  lib/api.ts
frontend/src/components/*.jsx     →  components/*.tsx
frontend/src/index.css            →  app/globals.css
frontend/src/App.css              →  (merged into globals.css)
```

### Technology Stack Changes

**Removed:**
- Python, FastAPI, uvicorn
- Vite
- Python virtual environment (venv/uv)
- pyproject.toml
- Separate .jsx files

**Added:**
- TypeScript
- Next.js 15 with App Router
- React Server Components (for API routes)
- Unified build system

**Unchanged:**
- React 19
- ReactMarkdown
- File-based JSON storage
- OpenRouter API integration
- UI/UX design

### API Endpoints

Endpoints remain functionally identical but use Next.js conventions:

```
Original: POST http://localhost:8001/api/conversations
Next.js:  POST http://localhost:3000/api/conversations

Original: GET http://localhost:8001/api/conversations/{id}
Next.js:  GET http://localhost:3000/api/conversations/[id]

Original: POST http://localhost:8001/api/conversations/{id}/message/stream
Next.js:  POST http://localhost:3000/api/conversations/[id]/message/stream
```

### Environment Variables

**Original:**
- Python loaded `.env` file using `python-dotenv`
- Accessed via `os.getenv("OPENROUTER_API_KEY")`

**Next.js:**
- Use `.env.local` file
- Accessed via `process.env.OPENROUTER_API_KEY`
- Automatically loaded by Next.js

### Storage

**Unchanged:** Both versions use the same file-based JSON storage in `data/conversations/`.

**Compatibility:** Conversation files created by the original Python version can be read by the Next.js version and vice versa. The JSON structure is identical.

### Code Equivalents

#### Python → TypeScript Examples

**Config:**
```python
# Python
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
]
```

```typescript
// TypeScript
export const COUNCIL_MODELS = [
  "openai/gpt-5.1",
  "google/gemini-3-pro-preview",
];
```

**Async Functions:**
```python
# Python
async def query_model(model: str, messages: List[Dict]) -> Optional[Dict]:
    async with httpx.AsyncClient() as client:
        response = await client.post(...)
        return response.json()
```

```typescript
// TypeScript
async function queryModel(model: string, messages: Message[]): Promise<ModelResponse | null> {
    const response = await fetch(...);
    return await response.json();
}
```

**API Routes:**
```python
# Python (FastAPI)
@app.get("/api/conversations")
async def list_conversations():
    return storage.list_conversations()
```

```typescript
// TypeScript (Next.js)
export async function GET() {
  const conversations = listConversations();
  return NextResponse.json(conversations);
}
```

## Running Both Versions

You can run both versions simultaneously:

**Original:**
```bash
# In project root
./start.sh  # Starts Python backend on 8001 and React on 5173
```

**Next.js:**
```bash
# In llm-council-nextjs directory
npm run dev  # Starts Next.js on 3000
```

They use the same `data/conversations` directory, so conversations are shared!

## Migration Benefits

1. **Simplified Deployment**: Single application to deploy
2. **Type Safety**: Full TypeScript coverage
3. **Better DX**: Unified tooling, single package.json
4. **No CORS**: Same-origin requests
5. **Modern Stack**: Latest Next.js features
6. **Easier Maintenance**: One codebase instead of two

## Migration Checklist

If you want to switch from the original to Next.js:

- [ ] Install Node.js 18+ if not already installed
- [ ] Navigate to `llm-council-nextjs` directory
- [ ] Run `npm install`
- [ ] Create `.env.local` with your `OPENROUTER_API_KEY`
- [ ] Run `npm run dev`
- [ ] Access at http://localhost:3000
- [ ] Verify existing conversations are visible (they share the same storage)

## Rollback

To go back to the original Python/React version:
1. Stop the Next.js dev server
2. Run `./start.sh` from the project root
3. Conversations remain in `data/conversations/` and work with both versions

## Future Considerations

The Next.js version opens up new possibilities:

- **Database Migration**: Easier to add Prisma/Drizzle ORM
- **Edge Runtime**: Deploy to Vercel Edge for faster response times
- **API Routes**: Can add more REST endpoints easily
- **Middleware**: Auth, rate limiting, logging
- **Incremental Static Regeneration**: Cache static pages
- **Image Optimization**: Next.js built-in image optimizer

## Questions?

See the main [README.md](./README.md) for usage instructions or refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Original CLAUDE.md for project architecture details
