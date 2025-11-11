// =====================================================
// ANALYTICS TYPE DEFINITIONS
// =====================================================
// TypeScript types for analytics dashboard
// =====================================================

// Summary Statistics
export interface AnalyticsSummary {
  total_queries: number;
  unique_sessions: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_confidence: number | null;
  avg_latency_ms: number | null;
  period_days: number;
}

// Top Queries
export interface TopQuery {
  query_text: string;
  frequency: number;
  avg_confidence: number | null;
  total_tokens: number;
  first_seen: string;
  last_seen: string;
}

// Unanswered Queries
export interface UnansweredQuery {
  query_text: string;
  confidence: number | null;
  sources_count: number;
  response_summary: string;
  created_at: string;
}

// Usage Over Time
export interface UsageStats {
  date: string;
  query_count: number;
  total_tokens: number;
  avg_confidence: number | null;
}

// Combined Overview
export interface AnalyticsOverviewData {
  summary: AnalyticsSummary;
  top_queries: TopQuery[];
  unanswered: UnansweredQuery[];
  usage: UsageStats[];
}

// API Response Types
export interface AnalyticsSummaryResponse {
  status: "success" | "error";
  data: AnalyticsSummary;
  message: string;
}

export interface TopQueriesResponse {
  status: "success" | "error";
  data: TopQuery[];
  message: string;
}

export interface UnansweredQueriesResponse {
  status: "success" | "error";
  data: UnansweredQuery[];
  message: string;
}

export interface UsageStatsResponse {
  status: "success" | "error";
  data: UsageStats[];
  message: string;
}

export interface AnalyticsOverviewResponse {
  status: "success" | "error";
  data: AnalyticsOverviewData;
  message: string;
}

// Query Parameters
export interface AnalyticsQueryParams {
  days?: number;
  limit?: number;
}
