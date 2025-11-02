# 🚀 Gulp Product Implementation Plan

## Overview

This plan breaks down the entire Gulp product into logical feature groups. Each group includes:

-   **Backend APIs** (FastAPI)
-   **Frontend UI** (Next.js Dashboard)
-   **Dependencies** (what needs to be done first)

We'll implement one feature group at a time, building backend APIs first, then the corresponding frontend UI.

---

## 📋 Implementation Status Summary

**Completed Phases**: 3/14

-   ✅ Phase 1: Foundation & Bot Management
-   ✅ Phase 2: Widget Token Management
-   ✅ Phase 3: Source Management

**Next Phase**: Phase 4 - Document Parsing & Text Extraction

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

#### Backend (FastAPI)

-   [ ] Document parsing service:
    -   PDF parser (PyPDF2 or pdfplumber)
    -   DOCX parser (python-docx)
    -   TXT parser (simple read)
-   [ ] Text extraction utilities
-   [ ] Error handling for corrupted files
-   [ ] Background task integration (FastAPI BackgroundTasks or Celery)
-   [ ] Update source status during processing

#### Frontend (Next.js)

-   [ ] Real-time status updates (polling or WebSocket)
-   [ ] Parsing progress indicator
-   [ ] Error messages for failed parsing
-   [ ] Success notifications

**Dependencies**: Phase 3 (Source Management)

**Acceptance Criteria**:

-   PDFs are parsed correctly
-   DOCX files are parsed correctly
-   TXT files are read correctly
-   Parsing errors are logged and displayed
-   Source status updates in real-time

---

### **Phase 5: Text Chunking & Metadata Extraction** ✂️

**Goal**: Split extracted text into chunks with metadata.

#### Backend (FastAPI)

-   [ ] Chunking strategy service:
    -   Sentence-aware chunking
    -   Overlap between chunks
    -   Token estimation (tiktoken)
-   [ ] Metadata extraction:
    -   Headings/titles
    -   Character ranges
    -   Publish dates (for web sources)
-   [ ] Chunk repository/service layer
-   [ ] Store chunks in database
-   [ ] Update source status after chunking

#### Frontend (Next.js)

-   [ ] Chunk preview in source details
-   [ ] Chunk count display
-   [ ] Progress indicator for chunking

**Dependencies**: Phase 4 (Document Parsing)

**Acceptance Criteria**:

-   Text is split into appropriate chunks (500-1000 tokens)
-   Chunks have overlap for context
-   Headings are extracted when available
-   Chunks are stored with metadata
-   Token counts are accurate

---

### **Phase 6: Embedding Generation & Vector Storage** 🧮

**Goal**: Generate embeddings for chunks and store in vector database.

#### Backend (FastAPI)

-   [ ] Embedding service:
    -   OpenAI embeddings API integration
    -   Gemini embeddings API integration (if available)
    -   Batch processing for efficiency
-   [ ] Vector storage service (Supabase pgvector)
-   [ ] Embedding repository/service layer
-   [ ] Update chunks with embeddings
-   [ ] Handle embedding failures
-   [ ] Update source status after indexing

#### Frontend (Next.js)

-   [ ] Embedding progress indicator
-   [ ] Indexing completion notification
-   [ ] Chunk count with embeddings

**Dependencies**: Phase 5 (Text Chunking)

**Acceptance Criteria**:

-   Embeddings are generated for all chunks
-   Embeddings stored in pgvector correctly
-   Vector index is used for queries
-   Failed embeddings are retried
-   Source status updates to "indexed"

---

### **Phase 7: URL Crawling & Web Source Processing** 🕷️

**Goal**: Crawl URLs, extract content, and process like files.

#### Backend (FastAPI)

-   [ ] URL crawling service:
    -   HTTP client (requests)
    -   robots.txt respect (robotparser)
    -   HTML parsing (BeautifulSoup)
    -   Content extraction (readability)
-   [ ] URL normalization
-   [ ] Deduplication (etag, checksum)
-   [ ] Sitemap parsing (optional)
-   [ ] Depth-limited crawling (optional)
-   [ ] Update source status during crawling

#### Frontend (Next.js)

-   [ ] URL crawling form
-   [ ] Crawling progress indicator
-   [ ] Crawl depth settings
-   [ ] Sitemap URL option
-   [ ] Extracted page count

**Dependencies**: Phase 3 (Source Management), Phase 6 (Embedding)

**Acceptance Criteria**:

-   URLs are crawled and parsed
-   robots.txt is respected
-   Main content is extracted (not boilerplate)
-   Duplicate pages are detected
-   Multiple pages can be crawled (sitemap)

---

### **Phase 8: RAG Query Engine** 🤖

**Goal**: Answer user queries using RAG (vector search + LLM).

#### Backend (FastAPI)

-   [ ] Query embedding service
-   [ ] Vector similarity search service (pgvector)
-   [ ] LLM adapters:
    -   OpenAI adapter (GPT-4, GPT-4o)
    -   Gemini adapter (Gemini-1.5)
-   [ ] Prompt composition service:
    -   System prompt + history + retrieved chunks
    -   Token counting
    -   Context window management
-   [ ] Query repository/service layer
-   [ ] Query endpoint:
    -   `POST /api/v1/bots/:id/query` - Main query endpoint
-   [ ] Response formatting with citations
-   [ ] Confidence scoring
-   [ ] Query logging to database

#### Frontend (Next.js)

-   [ ] Query types/interfaces
-   [ ] React Query hooks for queries
-   [ ] Query testing interface (sandbox)
-   [ ] Response display with citations
-   [ ] Confidence indicator

**Dependencies**: Phase 6 (Embeddings), Phase 1 (Bots)

**Acceptance Criteria**:

-   Queries return relevant answers
-   Citations are included in responses
-   Confidence scores are calculated
-   Queries are logged for analytics
-   Both OpenAI and Gemini work

---

### **Phase 9: Chat Widget (Embeddable)** 💬

**Goal**: Embeddable JavaScript widget for client websites.

#### Backend (FastAPI)

-   [ ] Widget token validation middleware
-   [ ] Query endpoint for widgets (public, token-based)
-   [ ] CORS configuration for widget domains
-   [ ] Session management (session_id from widget)

#### Frontend (Widget JavaScript)

-   [ ] Widget script (`widget.js`):
    -   Auto-initialization
    -   Chat UI components
    -   localStorage session management
    -   HTTP POST to query endpoint
    -   Message history (last 5)
-   [ ] Widget UI:
    -   Floating chat button
    -   Chat window (expandable)
    -   Message list
    -   Input field
    -   Citations display
    -   Thumbs up/down feedback
    -   Loading states
-   [ ] Theme customization:
    -   Light/dark theme
    -   Custom colors
    -   Position (bottom-right, etc.)
-   [ ] Widget hosting/CDN setup

**Dependencies**: Phase 8 (RAG Query Engine), Phase 2 (Widget Tokens)

**Acceptance Criteria**:

-   Widget can be embedded with one script tag
-   Widget maintains session across page reloads
-   Widget sends queries and displays responses
-   Citations are clickable
-   Feedback (thumbs up/down) works
-   Theme matches client website

---

### **Phase 10: Analytics Dashboard** 📊

**Goal**: View analytics on bot queries, usage, and performance.

#### Backend (FastAPI)

-   [ ] Analytics service:
    -   Query aggregation
    -   Top queries calculation
    -   Unanswered queries detection
    -   Token usage aggregation
    -   Confidence statistics
-   [ ] Analytics endpoints:
    -   `GET /api/v1/bots/:id/analytics/summary` - Overall stats
    -   `GET /api/v1/bots/:id/analytics/queries` - Top queries
    -   `GET /api/v1/bots/:id/analytics/unanswered` - Unanswered queries
    -   `GET /api/v1/bots/:id/analytics/usage` - Token usage over time

#### Frontend (Next.js)

-   [ ] Analytics types/interfaces
-   [ ] React Query hooks for analytics
-   [ ] Analytics dashboard page (`/dashboard/bots/:id/analytics`)
-   [ ] Charts and visualizations:
    -   Query volume over time
    -   Top queries table
    -   Confidence distribution
    -   Token usage chart
-   [ ] Unanswered queries list
-   [ ] Export to CSV functionality
-   [ ] Date range filters

**Dependencies**: Phase 8 (RAG Query Engine)

**Acceptance Criteria**:

-   Users can view query statistics
-   Top queries are displayed
-   Unanswered queries are identified
-   Token usage is tracked
-   Data can be exported to CSV
-   Charts are interactive

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
