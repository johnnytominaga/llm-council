# LLM Council - Next.js

A Next.js implementation of the LLM Council, a 3-stage deliberation system where multiple LLMs collaboratively answer user questions with anonymized peer review.

## Features

- **Stage 1**: Collect individual responses from multiple AI models
- **Stage 2**: Anonymized peer review where models rank each other's responses
- **Stage 3**: Chairman synthesizes the final answer from all input
- **Real-time streaming**: Progressive updates as each stage completes
- **Conversation management**: Save and load conversation history
- **Responsive UI**: Clean, modern interface with tab-based navigation

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe code
- **React Markdown** - Render formatted responses
- **OpenRouter API** - Access to multiple frontier AI models
- **Server-Sent Events (SSE)** - Real-time streaming updates

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

   Get your API key from [OpenRouter](https://openrouter.ai/keys).

3. **Configure council models** (optional):
   Edit `lib/config.ts` to customize which models participate in the council and which model acts as chairman.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
llm-council-nextjs/
├── app/
│   ├── api/                    # Next.js API routes
│   │   └── conversations/      # Conversation endpoints
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/                 # React components
│   ├── ChatInterface.tsx      # Main chat UI
│   ├── Sidebar.tsx            # Conversation list
│   ├── Stage1.tsx             # Individual responses
│   ├── Stage2.tsx             # Peer rankings
│   └── Stage3.tsx             # Final synthesis
├── lib/                       # Utility functions
│   ├── api.ts                 # Client-side API calls
│   ├── config.ts              # App configuration
│   ├── council.ts             # Council orchestration logic
│   ├── openrouter.ts          # OpenRouter API client
│   └── storage.ts             # File-based conversation storage
└── data/                      # Conversation data (created at runtime)
    └── conversations/
```

## How It Works

### Stage 1: Individual Responses
All council models receive the user's question and provide independent responses in parallel.

### Stage 2: Peer Rankings
- Responses are anonymized as "Response A, B, C, etc."
- Each model evaluates and ranks all responses without knowing which model produced each
- This prevents bias and ensures objective evaluation
- The system calculates aggregate rankings across all peer reviews

### Stage 3: Final Synthesis
The chairman model synthesizes all responses and rankings into a comprehensive final answer.

## Configuration

### Council Models
Edit `lib/config.ts` to customize the council:

```typescript
export const COUNCIL_MODELS = [
  "openai/gpt-5.1",
  "google/gemini-3-pro-preview",
  "anthropic/claude-sonnet-4.5",
  "x-ai/grok-4",
];

export const CHAIRMAN_MODEL = "google/gemini-3-pro-preview";
```

### API Endpoints

- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get conversation details
- `POST /api/conversations/[id]/message/stream` - Send message with streaming

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Production Deployment

1. Set environment variables in your hosting platform
2. Build the application: `npm run build`
3. Start the server: `npm start`

Recommended platforms:
- **Vercel** - Optimized for Next.js (with some edge runtime considerations)
- **Railway** / **Render** - Good for Node.js apps with file storage
- **DigitalOcean App Platform** - Full Node.js support

**Note**: The app uses file-based storage in the `data/conversations` directory. For production, consider:
- Using a persistent volume if deploying to containers
- Migrating to a database (PostgreSQL, MongoDB) for scalability
- Using cloud storage (S3, GCS) for conversation data

## Differences from Original

This Next.js version consolidates the separate Python backend and React frontend into a single unified application:

- Backend logic converted from Python/FastAPI to TypeScript/Next.js API routes
- All API endpoints are now Next.js route handlers
- Same file-based storage system (compatible with original format)
- Identical UI and user experience
- TypeScript for improved type safety

## Troubleshooting

**API errors**: Ensure your `OPENROUTER_API_KEY` is valid and has sufficient credits

**Build errors**: Make sure all dependencies are installed with `npm install`

**Storage issues**: The app creates a `data/conversations` directory automatically. Ensure write permissions.

**Port conflicts**: Next.js defaults to port 3000. Change with `PORT=3001 npm run dev`

## License

Same license as the original LLM Council project.
