# Database Setup Scripts

This directory contains SQL scripts for setting up the Gulp database schema.

## Scripts Overview

### 1. `setup-user-profile.sql`
Sets up the user profile system with automatic profile creation on signup. This script should be run first.

### 2. `setup-gulp-schema.sql`
Sets up all tables, indexes, RLS policies, and helper functions required for the Gulp chatbot platform.

## Running the Scripts

### Via Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to **SQL Editor**

2. **Run User Profile Script (if not already run)**
   - Open `setup-user-profile.sql`
   - Copy and paste the entire content
   - Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

3. **Run Gulp Schema Script**
   - Open `setup-gulp-schema.sql`
   - Copy and paste the entire content
   - Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Via Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project (if not already linked)
supabase link --project-ref <your-project-ref>

# Run the scripts
supabase db execute -f scripts/setup-user-profile.sql
supabase db execute -f scripts/setup-gulp-schema.sql
```

### Via psql (Direct Connection)

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
# Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f scripts/setup-user-profile.sql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f scripts/setup-gulp-schema.sql
```

## What Gets Created

### Extensions
- `uuid-ossp` - For UUID generation
- `vector` - pgvector extension for embeddings (1536-dimensional vectors)

### Tables Created by `setup-gulp-schema.sql`

1. **`bots`** - Bot configurations
   - Stores bot name, description, system prompt, LLM settings
   - Links to `auth.users` via `created_by`

2. **`sources`** - Data sources (documents, URLs)
   - Tracks uploaded files and URLs
   - Status tracking: `uploaded` → `parsing` → `indexed` → `failed`

3. **`chunks`** - Text chunks with embeddings
   - Stores extracted text chunks from sources
   - Vector embeddings for semantic search
   - HNSW index for fast similarity search

4. **`queries`** - Query logs for analytics
   - Stores all user queries and responses
   - Includes token usage, confidence, latency
   - Supports user feedback (thumbs up/down)

5. **`system_prompt_updates`** - Prompt version history
   - Tracks changes to bot system prompts
   - Audit trail for prompt updates

6. **`widget_tokens`** - Widget authentication tokens
   - Secure token storage (hashed)
   - Domain whitelist support
   - Optional expiration

7. **`rate_limits`** - Rate limiting tracking
   - Per-bot, per-minute request counts
   - Auto-cleanup of old records

### Security Features

- **Row-Level Security (RLS)** enabled on all tables
- Users can only access their own bots and related data
- Service role has access for widget queries and ingestion
- Token-based authentication for widgets

### Helper Functions

1. **`get_bot_stats(bot_uuid)`** - Get statistics for a bot
2. **`search_similar_chunks(...)`** - Vector similarity search
3. **`cleanup_old_rate_limits()`** - Clean up old rate limit records
4. **`cleanup_old_queries()`** - Clean up queries based on retention policy

### Analytics Views

1. **`bot_analytics_summary`** - Aggregate statistics per bot
2. **`top_queries`** - Most frequently asked questions
3. **`unanswered_queries`** - Queries with low confidence or no sources

### Storage Buckets Setup

Run `setup-storage-buckets.sql` to create the necessary storage buckets:

```bash
# Via Supabase Dashboard SQL Editor or CLI
psql -h <your-supabase-db-host> -U postgres -d postgres -f scripts/setup-storage-buckets.sql
```

**Creates:**
- `sources` bucket for file uploads (PDF, DOCX, TXT)
- Storage policies for RLS (users can only access their own bot sources)
- 50MB file size limit
- MIME type restrictions

**Storage Structure:**
```
sources/
  └── bots/
      └── {bot_id}/
          └── sources/
              └── {source_id}/
                  └── {filename}
```

## Important Notes

### Vector Embedding Dimension

The script uses **1536 dimensions** for embeddings, which is the default for:
- OpenAI `text-embedding-3-large`
- OpenAI `text-embedding-ada-002`

If you plan to use Gemini embeddings or a different model:
- Update the `vector(1536)` type to match your model's dimension
- Common alternatives: `768` (smaller models), `512` (older models)

### Index Performance

The HNSW (Hierarchical Navigable Small World) index is optimized for:
- **Fast approximate similarity search**
- Large-scale vector databases
- Query performance with millions of chunks

For smaller datasets (< 100k chunks), you might consider using IVFFlat instead:
- Comment out the HNSW index
- Uncomment the IVFFlat index in the script

### Retention Policy

Queries are automatically cleaned up based on each bot's `retention_days` setting. Run `cleanup_old_queries()` periodically (e.g., via cron job) to enforce retention policies.

### Rate Limits

Old rate limit records are automatically cleaned up after 1 hour. The `cleanup_old_rate_limits()` function can be called periodically.

## Verification

After running the scripts, verify the setup:

```sql
-- Check extensions
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');

-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bots', 'sources', 'chunks', 'queries', 'system_prompt_updates', 'widget_tokens', 'rate_limits');

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('bots', 'sources', 'chunks', 'queries');

-- Test helper function
SELECT * FROM public.get_bot_stats('00000000-0000-0000-0000-000000000000'::uuid);
```

## Troubleshooting

### Error: "extension vector does not exist"
- Enable the pgvector extension in Supabase Dashboard
- Go to Database → Extensions
- Search for "vector" and enable it

### Error: "permission denied for schema public"
- Ensure you're using the service role key or a user with admin privileges
- Service role bypasses RLS policies

### Error: "relation already exists"
- Tables may already exist from a previous run
- Drop existing tables first if you need to re-run the script:
  ```sql
  DROP TABLE IF EXISTS public.rate_limits CASCADE;
  DROP TABLE IF EXISTS public.widget_tokens CASCADE;
  DROP TABLE IF EXISTS public.system_prompt_updates CASCADE;
  DROP TABLE IF EXISTS public.queries CASCADE;
  DROP TABLE IF EXISTS public.chunks CASCADE;
  DROP TABLE IF EXISTS public.sources CASCADE;
  DROP TABLE IF EXISTS public.bots CASCADE;
  ```

## Next Steps

After running these scripts:

1. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --project-id <project-id> > frontend/lib/types/database.ts
   ```

2. **Set up backend models**
   - Create Pydantic models matching the database schema
   - Set up repository/service layers for each table

3. **Test the setup**
   - Create a test bot via API
   - Upload a test document
   - Run a test query

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review pgvector documentation: https://github.com/pgvector/pgvector

