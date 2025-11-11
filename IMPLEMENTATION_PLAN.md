# 🚀 Gulp Product Implementation Plan

## Overview

This plan breaks down the entire Gulp product into logical feature groups. Each group includes:

-   **Backend APIs** (FastAPI)
-   **Frontend UI** (Next.js Dashboard)
-   **Dependencies** (what needs to be done first)

We'll implement one feature group at a time, building backend APIs first, then the corresponding frontend UI.

---

## 📋 Implementation Status Summary

**Completed Phases**: 10/14

-   ✅ Phase 1: Foundation & Bot Management
-   ✅ Phase 2: Widget Token Management
-   ✅ Phase 3: Source Management
-   ✅ Phase 4: Document Parsing & Text Extraction
-   ✅ Phase 5: Text Chunking & Metadata Extraction (Backend ✅ | Frontend ✅)
-   ✅ Phase 6: Embedding Generation & Vector Storage (Backend ✅)
-   ✅ Phase 7: URL Crawling & Web Source Processing (Backend ✅)
-   ✅ Phase 8: RAG Query Engine (Backend ✅ | Frontend ✅)
-   ✅ Phase 9: Chat Widget (Embeddable) (Backend ✅ | Widget ✅)
-   ✅ Phase 10: Analytics Dashboard (Backend ✅ | Frontend ✅)

**Next Phase**: Phase 11 - System Prompt Training

---

## 📋 Implementation Phases

### **Phase 1: Foundation & Bot Management** 🎯

**Goal**: Users can create, view, edit, and delete bots.

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Pydantic models for Bot (create, update, response)
-   [x] Bot repository/service layer
-   [x] Bot CRUD endpoints:
    -   `POST /api/v1/bots` - Create bot
    -   `GET /api/v1/bots` - List user's bots
    -   `GET /api/v1/bots/:id` - Get bot details
    -   `PATCH /api/v1/bots/:id` - Update bot
    -   `DELETE /api/v1/bots/:id` - Delete bot
-   [x] Validation and error handling
-   [x] RLS (Row-Level Security) implementation with user tokens
-   [x] Secure client configuration (anon key + JWT token for RLS)
-   [ ] Unit tests for bot operations

#### Frontend (Next.js) ✅

-   [x] Bot types/interfaces (TypeScript)
-   [x] React Query hooks for bot APIs
-   [x] Bot list page (`/dashboard/bots`)
-   [x] Create bot form/modal
-   [x] Edit bot form/modal (via settings page)
-   [x] Bot card component
-   [x] Delete bot confirmation dialog
-   [x] Bot settings page (`/dashboard/bots/:id/settings`)
-   [x] Test chat interface (placeholder for Phase 8)
-   [x] Train mode placeholder (for Phase 11)

**Dependencies**: Database schema (✅ Complete)

**Backend Completion Notes** (✅ Done):

-   All CRUD endpoints implemented and tested
-   RLS policies properly enforced using user JWT tokens
-   Secure database client configuration (anon key + user token)
-   Service role access is explicit and logged for security
-   Comprehensive error handling with custom exceptions
-   Postman collection updated for testing

**Acceptance Criteria**:

-   ✅ Backend: Users can create a bot with name, description, system prompt
-   ✅ Backend: Users can select LLM provider (OpenAI/Gemini)
-   ✅ Backend: Users can configure LLM settings (temperature, max tokens)
-   ✅ Backend: RLS policies ensure users only see their own bots
-   ✅ Frontend: Users can view all their bots in a card grid
-   ✅ Frontend: Users can edit and delete their bots via UI
-   ✅ Frontend: Users can create new bots via modal dialog
-   ✅ Frontend: Users can access bot settings page with tabs (Settings, Test, Train)

---

### **Phase 2: Widget Token Management** 🔑

**Goal**: Users can generate and manage widget tokens for embedding bots on websites.

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Pydantic models for WidgetToken
-   [x] Token generation (secure random + hashing)
-   [x] Token validation middleware
-   [x] Widget token endpoints:
    -   `POST /api/v1/bots/:id/widget-tokens` - Generate token
    -   `GET /api/v1/bots/:id/widget-tokens` - List tokens
    -   `DELETE /api/v1/bots/:id/widget-tokens/:token_id` - Revoke token
-   [x] Domain validation logic
-   [x] Token expiration handling
-   [x] Secure token storage (SHA-256 hashing, never store plain tokens)
-   [x] RLS policies for token access
-   [x] Service role support for public widget validation

#### Frontend (Next.js) ✅

-   [x] Widget token types/interfaces
-   [x] React Query hooks for widget tokens
-   [x] Token list component
-   [x] Generate token form (with domain whitelist)
-   [x] Copy token to clipboard functionality
-   [x] Token expiration display
-   [x] Revoke token button
-   [x] Widget management tab in bot settings page
-   [x] One-time token display with security warnings
-   [x] Token usage instructions and help text

**Dependencies**: Phase 1 (Bot Management) ✅

**Backend Completion Notes** (✅ Done):

-   All CRUD endpoints implemented and tested
-   Secure token generation using `secrets.token_urlsafe()` (64 bytes)
-   SHA-256 hashing before storage (never plain tokens in database)
-   Token shown only once during creation
-   Domain whitelist validation with flexible format support
-   Expiration date validation and timezone handling
-   RLS policies properly enforced using user JWT tokens
-   Service role used for public widget token validation
-   Authorization checks ensure users can only manage their own bot tokens
-   Postman collection updated for testing

**Frontend Completion Notes** (✅ Done):

-   All UI components implemented and integrated
-   Widget token management tab added to bot settings page
-   Token list with expiration status, domain badges, and last used timestamps
-   Create token dialog with domain whitelist management
-   One-time token display with copy functionality and security warnings
-   Revoke token confirmation dialog
-   Responsive design with loading and error states
-   Toast notifications for all actions
-   Help text and usage instructions included

**Acceptance Criteria**:

-   ✅ Backend: Users can generate widget tokens for their bots
-   ✅ Backend: Tokens can have multiple allowed domains
-   ✅ Backend: Tokens can have optional expiration dates
-   ✅ Backend: Users can view all tokens for a bot
-   ✅ Backend: Users can revoke tokens
-   ✅ Backend: Token hash is stored securely (never plain text)
-   ✅ Backend: Plain token shown only once during creation
-   ✅ Frontend: Users can generate tokens via UI
-   ✅ Frontend: Users can view and manage tokens in bot settings
-   ✅ Frontend: Token copy functionality works
-   ✅ Frontend: Expiration status and last used timestamps displayed
-   ✅ Frontend: Domain whitelist management in create dialog

---

### **Phase 3: Source Management (Files & URLs)** 📄

**Goal**: Users can upload files (PDF, DOCX, TXT) and submit URLs for ingestion.

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Pydantic models for Source (create, response)
-   [x] File upload handler (Supabase Storage)
-   [x] File type validation (PDF, DOCX, TXT)
-   [x] File size validation (max 50MB)
-   [x] URL submission handler
-   [x] URL validation (HTTP/HTTPS)
-   [x] Source repository/service layer
-   [x] Source endpoints:
    -   `POST /api/v1/bots/:id/sources/upload` - Upload file
    -   `POST /api/v1/bots/:id/sources/url` - Submit URL
    -   `GET /api/v1/bots/:id/sources` - List sources
    -   `GET /api/v1/bots/:id/sources/:id` - Get source details
    -   `DELETE /api/v1/bots/:id/sources/:id` - Delete source
-   [x] Source status tracking (uploaded, parsing, indexed, failed)
-   [x] Supabase Storage integration
-   [x] Storage bucket RLS policies
-   [x] Authorization checks (bot ownership verification)

#### Frontend (Next.js) ✅

-   [x] Source types/interfaces (TypeScript)
-   [x] React Query hooks for sources
-   [x] File upload component (drag & drop)
-   [x] File validation and progress tracking
-   [x] URL submission form
-   [x] URL validation in frontend
-   [x] Source list component with status indicators
-   [x] Source status badges (uploaded, parsing, indexed, failed)
-   [x] Source deletion with confirmation
-   [x] Sources management tab in bot settings page
-   [x] File size and type display
-   [x] Error messages for failed uploads

**Dependencies**: Phase 1 (Bot Management) ✅

**Backend Completion Notes** (✅ Done):

-   All CRUD endpoints implemented and tested
-   File upload to Supabase Storage with proper path structure (`bots/{bot_id}/sources/{source_id}/{filename}`)
-   File validation: type (PDF, DOCX, TXT), size (max 50MB), empty file check
-   URL validation with pydantic HttpUrl and custom validation
-   Source status enum (uploaded, parsing, indexed, failed) defined in database
-   RLS policies for storage bucket created and verified
-   Service role used for storage uploads after ownership verification
-   Authorization checks ensure users can only manage their own bot sources
-   Source repository handles UUID and datetime types correctly
-   Postman collection updated for testing

**Frontend Completion Notes** (✅ Done):

-   All UI components implemented and integrated
-   Sources management tab added to bot settings page
-   Drag & drop file upload with visual feedback
-   File validation and error messages
-   URL submission form with validation
-   Source list with status badges, file size, icons, and error messages
-   Delete source confirmation dialog
-   Responsive design with loading and error states
-   Toast notifications for all actions

**Acceptance Criteria**:

-   ✅ Backend: Users can upload PDF, DOCX, TXT files
-   ✅ Backend: Users can submit single URLs
-   ✅ Backend: Sources show correct status (uploaded → parsing → indexed)
-   ✅ Backend: Users can view all sources for a bot
-   ✅ Backend: Users can delete sources
-   ✅ Backend: File size limits enforced (50MB)
-   ✅ Frontend: Users can upload files via drag & drop
-   ✅ Frontend: Users can submit URLs via form
-   ✅ Frontend: Sources list shows status indicators
-   ✅ Frontend: Source deletion works with confirmation
-   ✅ Frontend: Error handling for invalid files/URLs

---

### **Phase 4: Document Parsing & Text Extraction** 🔍

**Goal**: Extract text from uploaded files (PDF, DOCX, TXT).

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Document parsing service:
    -   PDF parser (pdfplumber)
    -   DOCX parser (python-docx)
    -   TXT parser (with multi-encoding support)
-   [x] Modular parser architecture (BaseParser interface, ParserFactory)
-   [x] Text extraction utilities
-   [x] Error handling for corrupted files
-   [x] Background task integration (FastAPI BackgroundTasks)
-   [x] Update source status during processing (uploaded → parsing → indexed/failed)
-   [x] Comprehensive logging with extracted text previews
-   [x] File download from Supabase Storage
-   [x] Metadata extraction (page count, paragraph count, encoding, etc.)

#### Frontend (Next.js) ✅

-   [x] Real-time status updates (automatic polling every 2 seconds)
-   [x] Parsing progress indicator component
-   [x] Error messages for failed parsing
-   [x] Success notifications when parsing completes
-   [x] Active vs completed sources separation in UI
-   [x] Visual progress bars and status indicators

**Dependencies**: Phase 3 (Source Management) ✅

**Backend Completion Notes** (✅ Done):

-   Modular parser architecture with BaseParser interface
-   Independent parsers for PDF (pdfplumber), DOCX (python-docx), and TEXT
-   ParserFactory for automatic parser selection
-   Background task integration for non-blocking parsing
-   Comprehensive error handling and logging
-   Extracted text preview logging (first 500 chars)
-   Full text logging for small files (≤5000 chars)
-   Metadata extraction and logging
-   Storage file deletion on source deletion

**Frontend Completion Notes** (✅ Done):

-   Automatic polling when sources have "parsing" or "uploaded" status
-   Status change detection with notifications
-   ParsingProgress component with visual indicators
-   Active sources section with progress bars
-   Completed sources section
-   Enhanced error display with detailed messages
-   Real-time status updates without page refresh

**Acceptance Criteria**:

-   ✅ Backend: PDFs are parsed correctly using pdfplumber
-   ✅ Backend: DOCX files are parsed correctly using python-docx
-   ✅ Backend: TXT files are read correctly with multi-encoding support
-   ✅ Backend: Parsing errors are logged and displayed
-   ✅ Backend: Source status updates in real-time (uploaded → parsing → indexed/failed)
-   ✅ Frontend: Real-time status updates via automatic polling
-   ✅ Frontend: Parsing progress indicators displayed
-   ✅ Frontend: Error messages shown for failed parsing
-   ✅ Frontend: Success notifications when parsing completes

---

### **Phase 5: Text Chunking & Metadata Extraction** ✂️ ✅ COMPLETE

**Goal**: Split extracted text into chunks with metadata.

#### Backend (FastAPI) ✅

-   [x] Chunking strategy service:
    -   Sentence-aware chunking
    -   Overlap between chunks (100 tokens default)
    -   Token estimation (tiktoken)
-   [x] Metadata extraction:
    -   Headings/titles (markdown-style, ALL CAPS patterns)
    -   Character ranges (with overlap tracking)
    -   Publish dates (for web sources, ready for Phase 7)
-   [x] Chunk repository/service layer
-   [x] Store chunks in database
-   [x] Update source status after chunking
-   [x] Chunk API endpoints (list by source, list by bot, get by ID)
-   [x] Integration with parsing workflow (automatic chunking after parsing)

#### Frontend (Next.js) ✅

-   [x] Chunk preview dialog (dev-only via `NEXT_PUBLIC_ENABLE_CHUNK_PREVIEW=1`)
-   [x] Lazy-loading chunks on preview open (no background fetch)
-   [x] Keep customer UI minimal (status only; no chunk count badge)
-   [x] Progress indicator already covered in Phase 4 (parsing status UI)

**Dependencies**: Phase 4 (Document Parsing)

**Acceptance Criteria**:

-   ✅ Text is split into appropriate chunks (target: 800 tokens, min: 100, max: 1200)
-   ✅ Chunks have overlap for context (100 tokens default, reflected in char_range)
-   ✅ Headings are extracted when available
-   ✅ Chunks are stored with metadata
-   ✅ Token counts are accurate (using tiktoken)

**Implementation Details**:

-   Created `ChunkingService` with sentence-aware chunking and overlap
-   Implemented `Tokenizer` service using tiktoken for accurate token counting
-   Created chunk models, repository, service layer, and API endpoints
-   Integrated chunking into parsing workflow (automatic after text extraction)
-   Character range tracking includes overlap regions
-   Frontend: Added `useChunksBySource` hook with enabled flag for lazy queries
-   Frontend: Dev-only preview gated by `NODE_ENV !== 'production'` and `NEXT_PUBLIC_ENABLE_CHUNK_PREVIEW=1`

---

### **Phase 6: Embedding Generation & Vector Storage** 🧮 ✅ Backend COMPLETE

**Goal**: Generate embeddings for chunks and store in vector database.

#### Backend (FastAPI) ✅

-   [x] Embedding providers (modular):
    -   OpenAI provider (v1 SDK)
    -   Gemini provider (`google-generativeai`), auto `models/` prefix
    -   Dimension conformity to `EMBEDDING_DIMENSION` (default 1536)
-   [x] EmbeddingService orchestrator with provider fallback (preferred-first)
-   [x] Batch processing with configurable `EMBEDDING_BATCH_SIZE` (default 64)
-   [x] Chunk repository method to persist embeddings
-   [x] Integrated into parsing workflow post-chunking
-   [x] Robust logging (INFO summary; DEBUG per-batch)
-   [x] Env-configurable models and preference

#### Frontend (Next.js)

-   [ ] Embedding progress indicator (optional; parsing already covers progress)
-   [ ] Indexing completion notification (optional)

**Dependencies**: Phase 5 (Text Chunking)

**Acceptance Criteria**:

-   ✅ Embeddings are generated for all chunks with provider fallback
-   ✅ Embeddings stored in pgvector correctly
-   ✅ Failed batches fall back to alternate provider
-   ✅ Source status updates to "indexed" only after embeddings succeed

---

### **Phase 7: URL Crawling & Web Source Processing** 🕷️ ✅ **COMPLETE** (Backend: Basic crawling ✅)

**Goal**: Crawl URLs, extract content, and process like files.

#### Backend (FastAPI) ✅

-   [x] URL crawling (single-page):
    -   HTTP client (requests) + JS-render fallback (Playwright)
    -   robots.txt respect (robotparser)
    -   HTML parsing (BeautifulSoup)
    -   Content extraction (readability-lxml)
    -   Minimum content threshold + fail if too small
    -   Title extraction; chunk heading fallback (title → URL-derived)
-   [x] URL normalization and canonical URL handling
-   [x] Dedup metadata (etag, last-modified, checksum)
-   [x] Integrated with chunking + embeddings pipeline
-   [ ] Sitemap parsing (planned - Phase 7B)
-   [ ] Depth-limited internal crawl with page budget (planned - Phase 7B)

#### Frontend (Next.js)

-   [ ] Crawling progress indicator (optional)
-   [ ] Crawl depth/page budget settings (planned)
-   [ ] Sitemap URL option (planned)

**Dependencies**: Phase 3 (Source Management), Phase 6 (Embedding)

**Acceptance Criteria (Phase 7A - basic)**:

-   ✅ URLs are crawled and parsed (single page)
-   ✅ robots.txt is respected
-   ✅ Main content is extracted (SSR/JS supported via Playwright)
-   ✅ Chunk headings populated via title/URL fallback
-   ✅ Integrated with parsing, chunking, and embedding pipeline
-   ⏳ Multiple pages via sitemap/internal crawl (Phase 7B - optional enhancement)

---

### **Phase 8: RAG Query Engine** 🤖 ✅ **COMPLETE**

**Goal**: Answer user queries using RAG (vector search + LLM).

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Query embedding service
-   [x] Vector similarity search service (pgvector RPC)
-   [x] LLM adapters:
    -   OpenAI adapter (v1 SDK)
    -   Gemini adapter (Generative AI, usage tracking)
-   [x] Prompt composition service:
    -   System prompt + history + retrieved chunks
    -   Token counting
    -   Context window management
-   [x] Query repository/service layer (logs with token usage, latency, sources, confidence)
-   [x] Query endpoint:
    -   `POST /api/v1/bots/:id/query` - Main query endpoint
    -   `include_metadata` flag for performance optimization (testing vs production)
-   [x] Response formatting with citations
-   [x] Confidence scoring (average similarity scores)
-   [x] Source metadata enrichment (source_id, source_type, URLs, filenames)
-   [x] Query logging to database

#### Frontend (Next.js) ✅

-   [x] Query types/interfaces
-   [x] React Query hooks for queries
-   [x] Query testing interface (sandbox in bot settings)
-   [x] Response display with Markdown rendering
-   [x] Citations display with collapsible source info
-   [x] Confidence indicator (color-coded badges)
-   [x] Collapsible sources section (default closed)
-   [x] Source metadata display (file names, URLs, types, headings)

**Dependencies**: Phase 6 (Embeddings), Phase 1 (Bots)

**Backend Completion Notes** (✅ Done):

-   RAG pipeline: query embedding → vector search → context retrieval → LLM generation
-   Confidence calculation: average similarity scores from retrieved chunks (0-1 scale)
-   Source metadata fetching: batch lookup of source info (type, URLs, filenames) for citations
-   Performance optimization: `include_metadata` flag separates testing (full metadata) from production (lightweight)
-   Query logging: All queries logged with token usage, latency, confidence, and returned sources
-   Both OpenAI and Gemini providers supported with fallback mechanism

**Frontend Completion Notes** (✅ Done):

-   Test chat interface in bot settings with real-time query testing
-   Markdown rendering for LLM responses with proper styling
-   Citations section with collapsible header (default closed) showing count and confidence
-   Individual citation items expandable with source details (URLs, filenames, types, headings)
-   Confidence displayed as color-coded badge (green ≥70%, yellow ≥50%, gray <50%)
-   Clean, minimal UI for production use; full metadata only in test interface

**Acceptance Criteria**:

-   ✅ Queries return relevant answers
-   ✅ Citations are included in responses with source metadata
-   ✅ Confidence scores are calculated and displayed
-   ✅ Queries are logged for analytics (with token usage, latency, confidence)
-   ✅ Both OpenAI and Gemini work
-   ✅ Production queries are lightweight (no metadata overhead)
-   ✅ Test interface shows full metadata for debugging

---

### **Phase 9: Chat Widget (Embeddable)** 💬 ✅ **COMPLETE**

**Goal**: Embeddable JavaScript widget for client websites.

**Status**: ✅ **COMPLETE** (Backend ✅ | Widget ✅)

#### Backend (FastAPI) ✅

-   [x] Widget token validation middleware (`widget_token_guard`)
-   [x] Query endpoint for widgets (public, token-based) - `POST /api/v1/widget/query`
-   [x] CORS configuration for widget endpoint (`WidgetQueryCORSMiddleware` - allows all origins)
-   [x] Session management (session_id from widget)
-   [x] Chat history support (last 5 messages from client localStorage)
-   [x] Chat history integration in RAG context (optional - falls back to DB if not provided)

#### Frontend (Widget JavaScript) ✅

-   [x] Widget script (`widget.js`):
    -   Auto-initialization
    -   Chat UI components with modern design
    -   localStorage session management
    -   HTTP POST to query endpoint
    -   Message history (last 5) sent with requests
-   [x] Widget UI:
    -   Floating chat button (bottom-right)
    -   Chat window (expandable/collapsible)
    -   Message list with smooth animations
    -   Input field with send button
    -   Loading states with animated dots
    -   Empty state handling
-   [x] Theme customization:
    -   Light/dark theme (auto-detects system preference)
    -   CSS variables matching frontend design system
    -   OKLCH color support
    -   Position (bottom-right, fixed)
-   [x] Additional features:
    -   Markdown rendering (bold, italic, code, links, lists)
    -   Chat history persistence (localStorage)
    -   Session ID management
    -   Responsive design
    -   Smooth animations and transitions
    -   Custom scrollbar styling

**Dependencies**: Phase 8 (RAG Query Engine) ✅, Phase 2 (Widget Tokens) ✅

**Backend Completion Notes** (✅ Done):

-   Widget token validation middleware validates tokens and extracts bot_id
-   Public widget query endpoint at `/api/v1/widget/query` (no user authentication required)
-   CORS middleware allows all origins for widget endpoint (enables embedding on any domain)
-   Session management via session_id parameter
-   Chat history support: accepts last 5 messages from client, includes in LLM context
-   Fallback to database chat history if client history not provided
-   Widget queries use lightweight responses (no metadata for performance)
-   Service role access for widget queries (bypasses RLS)

**Widget Completion Notes** (✅ Done):

-   Standalone embeddable widget script (`widget.js`)
-   Modern UI with gradient background, smooth animations
-   Dark mode auto-detection (system preference, localStorage, document class)
-   Chat history persistence in localStorage per session
-   Session ID generation and management
-   Markdown rendering for assistant messages
-   Message pairing and history management
-   Responsive design with mobile support
-   Theme integration with frontend design system (OKLCH colors)

**Acceptance Criteria**:

-   ✅ Widget can be embedded with one script tag
-   ✅ Widget maintains session across page reloads
-   ✅ Widget sends queries and displays responses
-   ✅ Chat history (last 5 messages) included in context
-   ✅ Markdown rendering works in messages
-   ✅ Theme matches client website (auto dark mode detection)
-   ✅ CORS configured for all origins
-   ✅ Session management working
-   ⏳ Citations display (can be added in future)
-   ⏳ Feedback (thumbs up/down) (can be added in future)

---

### **Phase 10: Analytics Dashboard** 📊 ✅ **COMPLETE**

**Goal**: View analytics on bot queries, usage, and performance.

**Status**: ✅ **COMPLETE** (Backend ✅ | Frontend ✅)

#### Backend (FastAPI) ✅

-   [x] Analytics service (`AnalyticsService`):
    -   Query aggregation from queries table
    -   Top queries calculation with frequency analysis
    -   Unanswered queries detection (low confidence + no sources)
    -   Token usage aggregation (prompt + completion tokens)
    -   Confidence statistics and latency tracking
-   [x] Analytics endpoints:
    -   `GET /api/v1/bots/:id/analytics/summary` - Overall stats (total queries, sessions, tokens, avg confidence/latency)
    -   `GET /api/v1/bots/:id/analytics/queries` - Top queries by frequency
    -   `GET /api/v1/bots/:id/analytics/unanswered` - Unanswered queries (low confidence or no sources)
    -   `GET /api/v1/bots/:id/analytics/usage` - Token usage and query volume over time
-   [x] Service role access for analytics queries (bypasses RLS)
-   [x] Authorization checks ensure users can only view their bot analytics

#### Frontend (Next.js) ✅

-   [x] Analytics types/interfaces (`analytics.ts`)
-   [x] React Query hooks for analytics (`useAnalyticsSummary`, `useTopQueries`, `useUnansweredQueries`, `useUsageOverTime`)
-   [x] Analytics dashboard page (added Analytics tab to bot settings)
-   [x] Charts and visualizations:
    -   Query volume over time (BarChart)
    -   Confidence distribution over time (LineChart)
    -   Summary cards (queries, tokens, confidence, latency)
-   [x] Top queries list with frequency and confidence
-   [x] Unanswered queries list with confidence and sources count
-   [x] Export to CSV functionality for all data sections
-   [x] Date range filters (7, 30, 90 days, 1 year)
-   [x] Responsive design with loading states and error handling

**Dependencies**: Phase 8 (RAG Query Engine) ✅

**Backend Completion Notes** (✅ Done):

-   Created `AnalyticsService` with comprehensive analytics aggregation
-   Implemented 4 analytics endpoints with proper error handling
-   Added service role client usage for admin-level analytics access
-   Authorization checks ensure users can only access their own bot data
-   Efficient SQL queries with date filtering and aggregation

**Frontend Completion Notes** (✅ Done):

-   Created comprehensive analytics dashboard with modern UI
-   Implemented charts using Recharts with responsive design
-   Added CSV export functionality with proper data formatting
-   Date range selector with 4 preset options
-   Real-time data fetching with React Query caching
-   Toast notifications for export actions
-   Loading skeletons and error states

**Acceptance Criteria**:

-   ✅ Users can view query statistics with summary cards
-   ✅ Top queries are displayed with frequency and confidence
-   ✅ Unanswered queries are identified and listed
-   ✅ Token usage is tracked and visualized over time
-   ✅ Data can be exported to CSV with proper formatting
-   ✅ Charts are interactive with tooltips and responsive design
-   ✅ Date range filters work (7, 30, 90 days, 1 year)
-   ✅ Real-time updates with loading states

---

### **Phase 11: System Prompt Training** 🎓

**Goal**: Edit system prompts, test changes, and maintain history.

#### Backend (FastAPI)

-   [ ] Prompt update service
-   [ ] Prompt history tracking
-   [ ] Prompt endpoints:
    -   `POST /api/v1/bots/:id/prompt-updates` - Create prompt update
    -   `GET /api/v1/bots/:id/prompt-updates` - List prompt history
    -   `PATCH /api/v1/bots/:id/prompt` - Apply prompt update
-   [ ] Sandbox query endpoint (test prompt without saving)

#### Frontend (Next.js)

-   [ ] Prompt editor component
-   [ ] Prompt history timeline
-   [ ] Test prompt interface (sandbox chat)
-   [ ] Apply/revert prompt updates
-   [ ] Prompt suggestions from analytics

**Dependencies**: Phase 1 (Bot Management), Phase 8 (RAG Query Engine)

**Acceptance Criteria**:

-   Users can edit system prompts
-   Prompt changes are saved to history
-   Users can test prompts in sandbox
-   Users can apply or revert prompt updates
-   Prompt history is visible

---

### **Phase 12: Rate Limiting** ⏱️

**Goal**: Enforce rate limits per bot to prevent abuse.

#### Backend (FastAPI)

-   [ ] Rate limiting service:
    -   Per-bot counters
    -   Time window tracking (minute-based)
    -   Cleanup of old records
-   [ ] Rate limiting middleware
-   [ ] Rate limit configuration (configurable per bot)
-   [ ] Rate limit headers in responses

#### Frontend (Next.js)

-   [ ] Rate limit display in bot settings
-   [ ] Rate limit configuration UI
-   [ ] Rate limit exceeded warnings

**Dependencies**: Phase 1 (Bot Management)

**Acceptance Criteria**:

-   Rate limits are enforced per bot
-   Old rate limit records are cleaned up
-   Users can configure rate limits
-   Rate limit status is visible

---

### **Phase 13: Ingestion Status & Monitoring** 📈

**Goal**: Real-time ingestion progress and error handling.

#### Backend (FastAPI)

-   [ ] Ingestion job tracking
-   [ ] Job status endpoints:
    -   `GET /api/v1/bots/:id/ingest/:job_id` - Check job status
-   [ ] Error recovery and retry logic
-   [ ] Ingestion queue management

#### Frontend (Next.js)

-   [ ] Ingestion progress bar
-   [ ] Real-time status updates (polling)
-   [ ] Error display and retry buttons
-   [ ] Ingestion history

**Dependencies**: Phase 3-7 (Ingestion Pipeline)

**Acceptance Criteria**:

-   Users can see ingestion progress
-   Errors are displayed clearly
-   Users can retry failed ingestions
-   Status updates in real-time

---

### **Phase 14: Advanced Features (Optional)** ⭐

**Goal**: Additional features for v1.5+.

#### Multi-Organization Support

-   [ ] Organization model
-   [ ] Team members and roles
-   [ ] Bot sharing within org

#### Bulk Operations

-   [ ] Bulk file upload
-   [ ] Bulk URL submission
-   [ ] Bulk source deletion

#### Enhanced Analytics

-   [ ] Query heatmap by page URL
-   [ ] Keyword extraction
-   [ ] Query trends over time

#### Performance Optimizations

-   [ ] Query caching
-   [ ] Embedding batch optimization
-   [ ] Database query optimization

---

### **Operational Hardening (Post-MVP)** 🛡️

**Goal**: Ensure the platform remains responsive and resilient under concurrent load and external provider variance.

#### Backend (FastAPI)

-   [ ] Server-sent events (SSE) streaming for chat answers in the query endpoint
-   [ ] Global timeouts and exponential backoff with jitter for Supabase/HTTP/LLM calls
-   [ ] Short-TTL caching for hot reads (user bots, bot metadata, sources)
-   [ ] Circuit breakers for external providers to fail fast under outages
-   [ ] Evaluate/introduce async clients where feasible to reduce thread usage
-   [ ] Rate limits and quotas per user/org for queries and APIs

#### Deployment/Operations

-   [ ] Multi-worker deployment guidance (uvicorn/gunicorn workers per CPU)
-   [ ] Threadpool and DB/HTTP connection pool tuning for expected concurrency
-   [ ] Monitoring dashboards and alerts (latency, error rate, provider failures)

**Acceptance Criteria**:

-   Streaming responses reduce perceived latency for long answers
-   No single slow external call blocks other requests (under typical load)
-   Hot read endpoints serve quickly due to caching (30–120s TTL)
-   Rate limits protect against noisy neighbors
-   Dashboards show key SLOs and trigger alerts on regressions

---

## 🔄 Implementation Workflow

For each phase:

1. **Backend First**

    - Create Pydantic models
    - Implement repository/service layer
    - Create API endpoints
    - Add validation and error handling
    - Write unit tests

2. **Frontend Second**

    - Create TypeScript types/interfaces
    - Set up React Query hooks
    - Build UI components
    - Connect to backend APIs
    - Add loading/error states

3. **Integration**
    - Test end-to-end flow
    - Handle edge cases
    - Polish UX
    - Document API endpoints

---

## 📝 Notes

-   **Database Schema**: Already complete (✅)
-   **Authentication**: Already set up (Supabase Auth) (✅)
-   **State Management**: Already set up (Zustand, React Query) (✅)
-   **UI Components**: Already available (✅)

Each phase builds on previous phases. Start with Phase 1 (Bot Management) as it's foundational.

---

## 🎯 Quick Start

When ready to implement:

1. Tell me which phase to start (recommend Phase 1)
2. I'll implement backend APIs first
3. Then frontend UI
4. We'll test and iterate
5. Move to next phase

Let's begin! 🚀
