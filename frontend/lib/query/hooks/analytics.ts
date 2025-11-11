// =====================================================
// ANALYTICS REACT QUERY HOOKS
// =====================================================
// React Query hooks for analytics dashboard operations
// =====================================================
import { useQuery } from "@tanstack/react-query";
import type {
  AnalyticsSummary,
  TopQuery,
  UnansweredQuery,
  UsageStats,
  AnalyticsOverviewData,
} from "@/lib/types/analytics";
import { apiGet } from "@/lib/utils/api-client";
import { queryKeys } from "../client";

// =====================================================
// ANALYTICS QUERY KEYS
// =====================================================

export const analyticsQueryKeys = {
  all: queryKeys.analytics.all,
  summary: (botId: string, days?: number) => queryKeys.analytics.summary(botId, days),
  queries: (botId: string, limit?: number, days?: number) =>
    queryKeys.analytics.queries(botId, limit, days),
  unanswered: (botId: string, limit?: number, days?: number) =>
    queryKeys.analytics.unanswered(botId, limit, days),
  usage: (botId: string, days?: number) => queryKeys.analytics.usage(botId, days),
  overview: (botId: string, days?: number, topLimit?: number, unansweredLimit?: number) =>
    queryKeys.analytics.overview(botId, days, topLimit, unansweredLimit),
} as const;

// =====================================================
// ANALYTICS FETCH FUNCTIONS
// =====================================================

/**
 * Fetch analytics summary for a bot
 */
async function getAnalyticsSummary(
  botId: string,
  days: number = 30
): Promise<AnalyticsSummary> {
  const response = await apiGet<{ status: string; data: AnalyticsSummary; message: string }>(
    `/api/v1/bots/${botId}/analytics/summary?days=${days}`
  );
  return response.data;
}

/**
 * Fetch top queries for a bot
 */
async function getTopQueries(
  botId: string,
  limit: number = 10,
  days: number = 30
): Promise<TopQuery[]> {
  const response = await apiGet<{ status: string; data: TopQuery[]; message: string }>(
    `/api/v1/bots/${botId}/analytics/queries?limit=${limit}&days=${days}`
  );
  return response.data;
}

/**
 * Fetch unanswered queries for a bot
 */
async function getUnansweredQueries(
  botId: string,
  limit: number = 20,
  days: number = 30
): Promise<UnansweredQuery[]> {
  const response = await apiGet<{ status: string; data: UnansweredQuery[]; message: string }>(
    `/api/v1/bots/${botId}/analytics/unanswered?limit=${limit}&days=${days}`
  );
  return response.data;
}

/**
 * Fetch usage statistics over time for a bot
 */
async function getUsageOverTime(
  botId: string,
  days: number = 30
): Promise<UsageStats[]> {
  const response = await apiGet<{ status: string; data: UsageStats[]; message: string }>(
    `/api/v1/bots/${botId}/analytics/usage?days=${days}`
  );
  return response.data;
}

/**
 * Fetch combined analytics overview
 */
async function getAnalyticsOverview(
  botId: string,
  days: number = 30,
  topLimit: number = 10,
  unansweredLimit: number = 20
): Promise<AnalyticsOverviewData> {
  const response = await apiGet<{ status: string; data: AnalyticsOverviewData; message: string }>(
    `/api/v1/bots/${botId}/analytics/overview?days=${days}&top_limit=${topLimit}&unanswered_limit=${unansweredLimit}`
  );
  return response.data;
}

// =====================================================
// ANALYTICS QUERY HOOKS
// =====================================================

/**
 * Hook to get analytics summary for a bot
 */
export function useAnalyticsSummary(botId: string, days: number = 30) {
  return useQuery({
    queryKey: analyticsQueryKeys.summary(botId, days),
    queryFn: () => getAnalyticsSummary(botId, days),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics can be a bit stale
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get top queries for a bot
 */
export function useTopQueries(botId: string, limit: number = 10, days: number = 30) {
  return useQuery({
    queryKey: analyticsQueryKeys.queries(botId, limit, days),
    queryFn: () => getTopQueries(botId, limit, days),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get unanswered queries for a bot
 */
export function useUnansweredQueries(botId: string, limit: number = 20, days: number = 30) {
  return useQuery({
    queryKey: analyticsQueryKeys.unanswered(botId, limit, days),
    queryFn: () => getUnansweredQueries(botId, limit, days),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get usage statistics over time for a bot
 */
export function useUsageOverTime(botId: string, days: number = 30) {
  return useQuery({
    queryKey: analyticsQueryKeys.usage(botId, days),
    queryFn: () => getUsageOverTime(botId, days),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get analytics overview (single request)
 */
export function useAnalyticsOverview(botId: string, days: number = 30, topLimit: number = 10, unansweredLimit: number = 20) {
  return useQuery({
    queryKey: analyticsQueryKeys.overview(botId, days, topLimit, unansweredLimit),
    queryFn: () => getAnalyticsOverview(botId, days, topLimit, unansweredLimit),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
