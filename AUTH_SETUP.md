# Authentication Setup Guide

This project uses **BetterAuth** with **Drizzle ORM** and **Vercel Postgres** for authentication.

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Vercel Postgres Database** - Create one from the Vercel dashboard

## Database Setup

### 1. Create a Vercel Postgres Database

1. Go to your Vercel dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a name (e.g., `llm-council-db`)
6. Select a region close to your users
7. Click **Create**

### 2. Get Database Credentials

After creating the database:

1. Go to the database's **.env.local** tab
2. Copy all the environment variables
3. Create or update `.env.local` in your project root:

```bash
# Vercel Postgres
POSTGRES_URL="************"
POSTGRES_PRISMA_URL="************"
POSTGRES_URL_NO_SSL="************"
POSTGRES_URL_NON_POOLING="************"
POSTGRES_USER="************"
POSTGRES_HOST="************"
POSTGRES_PASSWORD="************"
POSTGRES_DATABASE="************"

# OpenRouter API Key (for LLM Council)
OPENROUTER_API_KEY="your_openrouter_api_key"

# Better Auth Secret (generate a random string)
BETTER_AUTH_SECRET="your_random_secret_key_here"

# App URL (for auth callbacks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Generate a Secret Key

Generate a secure random string for `BETTER_AUTH_SECRET`:

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Run Database Migrations

Push the schema to your database:

```bash
# Generate migration
npx drizzle-kit generate

# Push schema to database
npx drizzle-kit push
```

This creates the following tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts and credentials
- `verification` - Email verification tokens

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the App

- **Main App**: http://localhost:3000
- **Auth Page**: http://localhost:3000/auth

## User Registration & Login

### Sign Up

1. Go to `/auth`
2. Click "Don't have an account? Sign up"
3. Enter name, email, and password (min 8 characters)
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the main app

### Sign In

1. Go to `/auth`
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to the main app

### Sign Out

1. Click your name in the sidebar (bottom)
2. Click "Sign Out"

## How Authentication Works

### Session Management

- Sessions are stored in the database
- Session cookies are HTTP-only and secure
- Sessions expire after 7 days of inactivity
- Sessions are automatically refreshed

### Protected Routes

All routes except `/auth` and `/api/auth/*` require authentication. The middleware (`middleware.ts`) handles this automatically.

### User-Scoped Data

- Each user's conversations are stored separately
- Data structure: `data/{userId}/{conversationId}.json`
- Users can only access their own conversations

## API Authentication

All API routes check for a valid session:

```typescript
import { getSession } from '@/lib/auth-server';

const session = await getSession();
const userId = session?.user?.id; // Use this to scope data
```

## Database Schema

### User Table

```typescript
{
  id: string (primary key)
  name: string
  email: string (unique)
  emailVerified: boolean
  image: string | null
  createdAt: Date
  updatedAt: Date
}
```

### Session Table

```typescript
{
  id: string (primary key)
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  userId: string (foreign key)
  createdAt: Date
}
```

## Production Deployment

### 1. Deploy to Vercel

```bash
vercel deploy --prod
```

### 2. Set Environment Variables

In Vercel dashboard:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add all the variables from `.env.local`
4. Update `NEXT_PUBLIC_APP_URL` to your production URL

### 3. Run Migrations

Migrations run automatically when you push the schema, but you can also run them manually:

```bash
# Connect to production database
vercel env pull .env.production.local

# Push schema
npx drizzle-kit push
```

## Adding OAuth Providers (Optional)

To add Google, GitHub, or other OAuth providers:

### 1. Get OAuth Credentials

For Google:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://yourapp.com/api/auth/callback/google`

### 2. Update Auth Configuration

Edit `lib/auth.ts`:

```typescript
export const auth = betterAuth({
  // ... existing config
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

### 3. Update Environment Variables

Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### 4. Update Auth UI

Edit `components/AuthForm.tsx` to add social login buttons.

## Troubleshooting

### "Database connection failed"

- Check that all `POSTGRES_*` environment variables are set correctly
- Verify the database is running in Vercel dashboard
- Try regenerating the credentials

### "Session not found"

- Clear browser cookies
- Check that `BETTER_AUTH_SECRET` is set
- Verify the session hasn't expired

### "Unauthorized" errors

- Make sure you're logged in
- Check that the middleware is configured correctly
- Verify the session cookie is being sent with requests

### Cannot access other users' data

This is by design! Each user's data is isolated. If you need to share data between users, you'll need to implement a sharing feature.

## Database Management

### View Data

Use Drizzle Studio to browse your database:

```bash
npx drizzle-kit studio
```

This opens a web interface at http://localhost:4983

### Backup Data

```bash
# Export schema
npx drizzle-kit introspect

# Backup conversations
cp -r data data-backup
```

### Reset Database

⚠️ **Warning**: This deletes all data!

```bash
# Drop and recreate tables
npx drizzle-kit drop
npx drizzle-kit push
```

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use strong passwords** - Minimum 8 characters
3. **Rotate secrets regularly** - Change `BETTER_AUTH_SECRET` periodically
4. **Enable HTTPS in production** - Vercel does this automatically
5. **Monitor failed login attempts** - Check logs for suspicious activity

## Cost Estimation

### Vercel Postgres Pricing

**Free Tier** (Perfect for starting):
- 256 MB storage
- 60 compute hours/month
- Unlimited data transfer

**Paid Tier** ($20/month):
- 512 MB storage
- Unlimited compute hours
- Unlimited data transfer

For this app, the free tier is sufficient unless you have:
- More than 1000 users
- Heavy usage (100+ conversations per user)

## Need Help?

- **BetterAuth Docs**: https://better-auth.com
- **Drizzle ORM Docs**: https://orm.drizzle.team
- **Vercel Postgres Docs**: https://vercel.com/docs/storage/vercel-postgres
- **Project Issues**: Open an issue on GitHub
