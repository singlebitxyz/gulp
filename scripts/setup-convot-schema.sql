-- =====================================================
-- CONVOT PRODUCT DATABASE SCHEMA SETUP SCRIPT
-- =====================================================
-- This script creates all tables required for the Convot
-- chatbot platform including bots, sources, chunks,
-- queries, analytics, and widget tokens
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- LLM Provider enum
DO $$ BEGIN
    CREATE TYPE llm_provider AS ENUM ('openai', 'gemini');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Source type enum
DO $$ BEGIN
    CREATE TYPE source_type AS ENUM ('pdf', 'docx', 'html', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Source status enum
DO $$ BEGIN
    CREATE TYPE source_status AS ENUM ('uploaded', 'parsing', 'indexed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE BOTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bots (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID,  -- Future: multi-org support, nullable for MVP
    
    -- Bot information
    name TEXT NOT NULL,
    description TEXT,
    
    -- LLM Configuration
    system_prompt TEXT NOT NULL DEFAULT 'You are an intelligent assistant. Answer user queries using the provided context. If you''re not sure, say "I''m not sure, but you can check this page: [link]." Always include citations when referring to a source. Keep tone friendly and professional.',
    llm_provider llm_provider NOT NULL DEFAULT 'openai',
    llm_config JSONB NOT NULL DEFAULT '{"temperature": 0.7, "max_tokens": 1000, "model_name": "gpt-4o"}'::jsonb,
    
    -- Settings
    retention_days INTEGER DEFAULT 90,  -- Query log retention period
    
    -- Ownership
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_name CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT valid_retention CHECK (retention_days >= 1 AND retention_days <= 3650)
);

-- Indexes for bots table
CREATE INDEX IF NOT EXISTS idx_bots_created_by ON public.bots(created_by);
CREATE INDEX IF NOT EXISTS idx_bots_org_id ON public.bots(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bots_created_at ON public.bots(created_at);
CREATE INDEX IF NOT EXISTS idx_bots_name ON public.bots(name);

-- =====================================================
-- 3. CREATE SOURCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sources (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Source information
    source_type source_type NOT NULL,
    original_url TEXT,  -- Original URL if applicable
    canonical_url TEXT,  -- Normalized URL
    storage_path TEXT NOT NULL,  -- S3/Supabase storage path
    
    -- Ingestion status
    status source_status NOT NULL DEFAULT 'uploaded',
    error_message TEXT,  -- Error details if status = 'failed'
    
    -- Web source metadata (for deduplication)
    etag TEXT,
    last_modified TIMESTAMP WITH TIME ZONE,
    page_checksum TEXT,  -- Content hash for deduplication
    
    -- Metadata
    file_size BIGINT,  -- File size in bytes
    mime_type TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_storage_path CHECK (char_length(storage_path) > 0),
    CONSTRAINT valid_url CHECK (
        (source_type IN ('pdf', 'docx', 'text') AND original_url IS NULL) OR
        (source_type = 'html' AND original_url IS NOT NULL)
    )
);

-- Indexes for sources table
CREATE INDEX IF NOT EXISTS idx_sources_bot_id ON public.sources(bot_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources(status);
-- Composite index for bot_id + status filtering (critical for performance)
CREATE INDEX IF NOT EXISTS idx_sources_bot_status ON public.sources(bot_id, status);
-- Partial index for indexed sources (most common filter)
CREATE INDEX IF NOT EXISTS idx_sources_bot_indexed ON public.sources(bot_id) WHERE status = 'indexed';
CREATE INDEX IF NOT EXISTS idx_sources_type ON public.sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_canonical_url ON public.sources(canonical_url) WHERE canonical_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sources_page_checksum ON public.sources(page_checksum) WHERE page_checksum IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON public.sources(created_at);

-- =====================================================
-- 4. CREATE CHUNKS TABLE (with vector embeddings)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chunks (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Chunk content
    chunk_index INTEGER NOT NULL,  -- Order within source
    excerpt TEXT NOT NULL,  -- The actual text chunk
    heading TEXT,  -- Heading/title if available
    
    -- Metadata
    publish_date TIMESTAMP WITH TIME ZONE,  -- For web sources
    char_range JSONB,  -- {start: int, end: int} character offsets
    tokens_estimate INTEGER NOT NULL DEFAULT 0,
    
    -- Vector embedding (pgvector)
    embedding vector(1536),  -- OpenAI embedding dimension (or 768 for smaller models)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
    CONSTRAINT valid_tokens CHECK (tokens_estimate >= 0),
    CONSTRAINT valid_excerpt CHECK (char_length(excerpt) > 0)
);

-- Indexes for chunks table (critical for vector search performance)
CREATE INDEX IF NOT EXISTS idx_chunks_bot_id ON public.chunks(bot_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source_id ON public.chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_bot_source ON public.chunks(bot_id, source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON public.chunks(source_id, chunk_index);
-- Partial index for bot_id with embeddings (optimizes vector search)
CREATE INDEX IF NOT EXISTS idx_chunks_bot_embedding ON public.chunks(bot_id) WHERE embedding IS NOT NULL;

-- Vector similarity search index (HNSW for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON public.chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- Additional vector index (IVFFlat for exact search, alternative to HNSW)
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat ON public.chunks 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100)
--     WHERE embedding IS NOT NULL;

-- =====================================================
-- 5. CREATE QUERIES TABLE (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.queries (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Query information
    session_id TEXT NOT NULL,  -- From localStorage
    query_text TEXT NOT NULL,
    page_url TEXT,  -- Origin page where query was made
    
    -- Response information
    returned_sources JSONB DEFAULT '[]'::jsonb,  -- Array of chunk IDs and metadata
    response_summary TEXT NOT NULL,  -- LLM response (trimmed)
    
    -- Usage metrics
    tokens_used INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER,  -- Detailed token breakdown
    completion_tokens INTEGER,
    
    -- Quality metrics
    confidence FLOAT,  -- Confidence score 0-1
    latency_ms INTEGER,  -- Response time in milliseconds
    
    -- Feedback
    user_feedback TEXT,  -- 'thumbs_up', 'thumbs_down', or NULL
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT valid_tokens CHECK (tokens_used >= 0),
    CONSTRAINT valid_query_text CHECK (char_length(query_text) > 0)
);

-- Indexes for queries table
CREATE INDEX IF NOT EXISTS idx_queries_bot_id ON public.queries(bot_id);
-- Composite index for bot_id + created_at (optimal for date range queries and daily count checks)
CREATE INDEX IF NOT EXISTS idx_queries_bot_created ON public.queries(bot_id, created_at DESC);
-- Composite index for analytics queries (with confidence filtering)
CREATE INDEX IF NOT EXISTS idx_queries_analytics ON public.queries(bot_id, created_at DESC, confidence)
    WHERE confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queries_session_id ON public.queries(session_id);
CREATE INDEX IF NOT EXISTS idx_queries_page_url ON public.queries(page_url) WHERE page_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON public.queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_confidence ON public.queries(confidence) WHERE confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queries_feedback ON public.queries(user_feedback) WHERE user_feedback IS NOT NULL;

-- =====================================================
-- 6. CREATE SYSTEM PROMPT UPDATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_prompt_updates (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Update information
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,  -- User-provided reason for update
    
    -- Prompt versions
    old_prompt TEXT NOT NULL,
    new_prompt TEXT NOT NULL,
    
    -- Application status
    auto_applied BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_prompts CHECK (char_length(old_prompt) > 0 AND char_length(new_prompt) > 0)
);

-- Indexes for system_prompt_updates table
CREATE INDEX IF NOT EXISTS idx_prompt_updates_bot_id ON public.system_prompt_updates(bot_id);
CREATE INDEX IF NOT EXISTS idx_prompt_updates_created_at ON public.system_prompt_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_updates_requested_by ON public.system_prompt_updates(requested_by);

-- =====================================================
-- 7. CREATE WIDGET TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.widget_tokens (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Token security
    token_hash TEXT NOT NULL UNIQUE,  -- Hashed token (never store plain tokens)
    token_prefix TEXT,  -- First 8 chars for identification (optional)
    
    -- Access control
    allowed_domains TEXT[] NOT NULL DEFAULT '{}',  -- Array of allowed origins
    expires_at TIMESTAMP WITH TIME ZONE,  -- Optional expiration
    
    -- Metadata
    name TEXT,  -- Optional descriptive name for token
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_token_hash CHECK (char_length(token_hash) >= 32),
    CONSTRAINT valid_allowed_domains CHECK (array_length(allowed_domains, 1) > 0)
);

-- Indexes for widget_tokens table
CREATE INDEX IF NOT EXISTS idx_widget_tokens_bot_id ON public.widget_tokens(bot_id);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_hash ON public.widget_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_widget_tokens_expires_at ON public.widget_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_widget_tokens_created_at ON public.widget_tokens(created_at);

-- =====================================================
-- 8. CREATE RATE LIMITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    
    -- Rate limit window
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,  -- Minute-based window
    count INTEGER NOT NULL DEFAULT 0,  -- Request count in this window
    
    -- Constraints
    CONSTRAINT valid_count CHECK (count >= 0),
    CONSTRAINT unique_bot_window UNIQUE (bot_id, window_start)
);

-- Indexes for rate_limits table
CREATE INDEX IF NOT EXISTS idx_rate_limits_bot_id ON public.rate_limits(bot_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(bot_id, window_start DESC);
-- Note: Cleanup queries will filter by window_start in the WHERE clause at query time
-- We don't use NOW() in index predicate as it's not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- =====================================================
-- 9. CREATE UPDATED_AT TRIGGER FUNCTION (if not exists)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for bots table
DROP TRIGGER IF EXISTS trigger_bots_updated_at ON public.bots;
CREATE TRIGGER trigger_bots_updated_at
    BEFORE UPDATE ON public.bots
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for sources table
DROP TRIGGER IF EXISTS trigger_sources_updated_at ON public.sources;
CREATE TRIGGER trigger_sources_updated_at
    BEFORE UPDATE ON public.sources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 11. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get bot statistics
CREATE OR REPLACE FUNCTION public.get_bot_stats(bot_uuid UUID)
RETURNS TABLE (
    total_sources BIGINT,
    indexed_sources BIGINT,
    total_chunks BIGINT,
    total_queries BIGINT,
    queries_today BIGINT,
    avg_confidence FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT s.id)::BIGINT as total_sources,
        COUNT(DISTINCT CASE WHEN s.status = 'indexed' THEN s.id END)::BIGINT as indexed_sources,
        COUNT(DISTINCT c.id)::BIGINT as total_chunks,
        COUNT(DISTINCT q.id)::BIGINT as total_queries,
        COUNT(DISTINCT CASE WHEN q.created_at >= CURRENT_DATE THEN q.id END)::BIGINT as queries_today,
        AVG(q.confidence)::FLOAT as avg_confidence
    FROM public.bots b
    LEFT JOIN public.sources s ON s.bot_id = b.id
    LEFT JOIN public.chunks c ON c.bot_id = b.id
    LEFT JOIN public.queries q ON q.bot_id = b.id
    WHERE b.id = bot_uuid
    GROUP BY b.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old queries based on retention policy
CREATE OR REPLACE FUNCTION public.cleanup_old_queries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.queries q
    USING public.bots b
    WHERE q.bot_id = b.id
    AND q.created_at < NOW() - (b.retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION public.search_similar_chunks(
    bot_uuid UUID,
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    source_id UUID,
    chunk_index INTEGER,
    excerpt TEXT,
    heading TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.source_id,
        c.chunk_index,
        c.excerpt,
        c.heading,
        1 - (c.embedding <=> query_embedding) as similarity
    FROM public.chunks c
    WHERE c.bot_id = bot_uuid
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompt_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. RLS POLICIES FOR BOTS TABLE
-- =====================================================

-- Users can view their own bots
CREATE POLICY "Users can view own bots" ON public.bots
    FOR SELECT USING (auth.uid() = created_by);

-- Users can create their own bots
CREATE POLICY "Users can create own bots" ON public.bots
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own bots
CREATE POLICY "Users can update own bots" ON public.bots
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own bots
CREATE POLICY "Users can delete own bots" ON public.bots
    FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- 14. RLS POLICIES FOR SOURCES TABLE
-- =====================================================

-- Users can view sources of their bots
CREATE POLICY "Users can view own bot sources" ON public.sources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = sources.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can create sources for their bots
CREATE POLICY "Users can create sources for own bots" ON public.sources
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = sources.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can update sources of their bots
CREATE POLICY "Users can update own bot sources" ON public.sources
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = sources.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can delete sources of their bots
CREATE POLICY "Users can delete own bot sources" ON public.sources
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = sources.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- =====================================================
-- 15. RLS POLICIES FOR CHUNKS TABLE
-- =====================================================

-- Users can view chunks of their bots
CREATE POLICY "Users can view own bot chunks" ON public.chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = chunks.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can create chunks for their bots (via ingestion pipeline)
CREATE POLICY "Users can create chunks for own bots" ON public.chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = chunks.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can update chunks of their bots
CREATE POLICY "Users can update own bot chunks" ON public.chunks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = chunks.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can delete chunks of their bots
CREATE POLICY "Users can delete own bot chunks" ON public.chunks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = chunks.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- =====================================================
-- 16. RLS POLICIES FOR QUERIES TABLE
-- =====================================================

-- Users can view queries of their bots (analytics)
CREATE POLICY "Users can view own bot queries" ON public.queries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = queries.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Service role can insert queries (from widget)
-- Note: Widget queries are inserted via service role with token validation
CREATE POLICY "Service role can insert queries" ON public.queries
    FOR INSERT WITH CHECK (true);  -- Token validation happens at API level

-- Users can update queries for their bots (for feedback)
CREATE POLICY "Users can update own bot queries" ON public.queries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = queries.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- =====================================================
-- 17. RLS POLICIES FOR SYSTEM PROMPT UPDATES TABLE
-- =====================================================

-- Users can view prompt updates for their bots
CREATE POLICY "Users can view own bot prompt updates" ON public.system_prompt_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = system_prompt_updates.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can create prompt updates for their bots
CREATE POLICY "Users can create prompt updates for own bots" ON public.system_prompt_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = system_prompt_updates.bot_id
            AND b.created_by = auth.uid()
        )
        AND requested_by = auth.uid()
    );

-- =====================================================
-- 18. RLS POLICIES FOR WIDGET TOKENS TABLE
-- =====================================================

-- Users can view tokens for their bots
CREATE POLICY "Users can view own bot tokens" ON public.widget_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = widget_tokens.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can create tokens for their bots
CREATE POLICY "Users can create tokens for own bots" ON public.widget_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = widget_tokens.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Users can delete tokens for their bots
CREATE POLICY "Users can delete own bot tokens" ON public.widget_tokens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.bots b
            WHERE b.id = widget_tokens.bot_id
            AND b.created_by = auth.uid()
        )
    );

-- Service role can read tokens for validation (no auth.uid() check)
-- This is handled via service role, not RLS policy

-- =====================================================
-- 19. RLS POLICIES FOR RATE LIMITS TABLE
-- =====================================================

-- Rate limits are managed by service role only
-- Users don't need direct access to rate_limits table
-- (Access is handled through API endpoints with proper authorization)

-- =====================================================
-- 20. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.queries TO authenticated;
GRANT SELECT, INSERT ON public.system_prompt_updates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.widget_tokens TO authenticated;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_bot_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_similar_chunks(UUID, vector(1536), FLOAT, INT) TO authenticated;

-- Grant permissions to service role (for widget queries and ingestion)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- 21. CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- View for bot analytics summary
CREATE OR REPLACE VIEW public.bot_analytics_summary AS
SELECT
    b.id as bot_id,
    b.name as bot_name,
    COUNT(DISTINCT s.id) as total_sources,
    COUNT(DISTINCT CASE WHEN s.status = 'indexed' THEN s.id END) as indexed_sources,
    COUNT(DISTINCT c.id) as total_chunks,
    COUNT(DISTINCT q.id) as total_queries,
    COUNT(DISTINCT CASE WHEN q.created_at >= CURRENT_DATE THEN q.id END) as queries_today,
    COUNT(DISTINCT CASE WHEN q.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN q.id END) as queries_this_week,
    AVG(q.confidence) as avg_confidence,
    AVG(q.latency_ms) as avg_latency_ms,
    SUM(q.tokens_used) as total_tokens_used,
    COUNT(DISTINCT q.session_id) as unique_sessions
FROM public.bots b
LEFT JOIN public.sources s ON s.bot_id = b.id
LEFT JOIN public.chunks c ON c.bot_id = b.id
LEFT JOIN public.queries q ON q.bot_id = b.id
GROUP BY b.id, b.name;

-- View for top queries
CREATE OR REPLACE VIEW public.top_queries AS
SELECT
    bot_id,
    query_text,
    COUNT(*) as query_count,
    AVG(confidence) as avg_confidence,
    MAX(created_at) as last_asked_at
FROM public.queries
GROUP BY bot_id, query_text
ORDER BY query_count DESC, last_asked_at DESC;

-- View for unanswered queries (low confidence or no sources)
CREATE OR REPLACE VIEW public.unanswered_queries AS
SELECT
    q.id,
    q.bot_id,
    q.query_text,
    q.confidence,
    q.created_at,
    CASE
        WHEN q.confidence IS NULL OR q.confidence < 0.5 THEN 'low_confidence'
        WHEN jsonb_array_length(q.returned_sources) = 0 THEN 'no_sources'
        ELSE 'unknown'
    END as reason
FROM public.queries q
WHERE (q.confidence IS NULL OR q.confidence < 0.5)
   OR jsonb_array_length(q.returned_sources) = 0
ORDER BY q.created_at DESC;

-- Grant select on views
GRANT SELECT ON public.bot_analytics_summary TO authenticated;
GRANT SELECT ON public.top_queries TO authenticated;
GRANT SELECT ON public.unanswered_queries TO authenticated;

-- =====================================================
-- 22. CREATE TYPE DEFINITIONS FOR TYPESCRIPT
-- =====================================================

-- This section documents the TypeScript types that should be generated
-- You can use supabase-cli to generate types automatically:
-- npx supabase gen types typescript --project-id <project-id> > lib/types/database.ts

/*
TypeScript types to add to your project:

export type LLMProvider = 'openai' | 'gemini';
export type SourceType = 'pdf' | 'docx' | 'html' | 'text';
export type SourceStatus = 'uploaded' | 'parsing' | 'indexed' | 'failed';

export interface Bot {
  id: string;
  org_id?: string;
  name: string;
  description?: string;
  system_prompt: string;
  llm_provider: LLMProvider;
  llm_config: {
    temperature: number;
    max_tokens: number;
    model_name: string;
  };
  retention_days: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  bot_id: string;
  source_type: SourceType;
  original_url?: string;
  canonical_url?: string;
  storage_path: string;
  status: SourceStatus;
  error_message?: string;
  etag?: string;
  last_modified?: string;
  page_checksum?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  source_id: string;
  bot_id: string;
  chunk_index: number;
  excerpt: string;
  heading?: string;
  publish_date?: string;
  char_range?: { start: number; end: number };
  tokens_estimate: number;
  embedding?: number[];
  created_at: string;
}

export interface Query {
  id: string;
  bot_id: string;
  session_id: string;
  query_text: string;
  page_url?: string;
  returned_sources: Array<{
    id: string;
    excerpt: string;
    url?: string;
  }>;
  response_summary: string;
  tokens_used: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  confidence?: number;
  latency_ms?: number;
  user_feedback?: 'thumbs_up' | 'thumbs_down';
  created_at: string;
}

export interface SystemPromptUpdate {
  id: string;
  bot_id: string;
  requested_by: string;
  reason?: string;
  old_prompt: string;
  new_prompt: string;
  auto_applied: boolean;
  created_at: string;
}

export interface WidgetToken {
  id: string;
  bot_id: string;
  token_hash: string;
  token_prefix?: string;
  allowed_domains: string[];
  expires_at?: string;
  name?: string;
  last_used_at?: string;
  created_at: string;
}

export interface RateLimit {
  id: string;
  bot_id: string;
  window_start: string;
  count: number;
}
*/

-- =====================================================
-- SCRIPT COMPLETION
-- =====================================================

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Convot database schema setup completed successfully!';
    RAISE NOTICE 'Features included:';
    RAISE NOTICE '- 7 core tables (bots, sources, chunks, queries, prompt_updates, widget_tokens, rate_limits)';
    RAISE NOTICE '- pgvector extension for embeddings with HNSW index';
    RAISE NOTICE '- Row Level Security (RLS) policies for data isolation';
    RAISE NOTICE '- Comprehensive indexes for performance';
    RAISE NOTICE '- Helper functions for analytics and vector search';
    RAISE NOTICE '- Analytics views for dashboard';
    RAISE NOTICE '- Automatic timestamp triggers';
    RAISE NOTICE '- Data validation constraints';
END $$;

