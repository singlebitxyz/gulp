// =====================================================
// BOT REACT QUERY HOOKS
// =====================================================
// React Query hooks for bot management operations
// =====================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Bot,
  BotCreateInput,
  BotListResponse,
  BotResponse,
  BotUpdateInput,
} from "@/lib/types/bot";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/utils/api-client";
import { queryKeys } from "../client";

// =====================================================
// BOT QUERY KEYS
// =====================================================

export const botQueryKeys = {
  all: queryKeys.bots.all,
  lists: () => [...queryKeys.bots.all, "list"] as const,
  list: () => [...botQueryKeys.lists()] as const,
  details: () => [...queryKeys.bots.all, "detail"] as const,
  detail: (botId: string) => [...botQueryKeys.details(), botId] as const,
} as const;

// =====================================================
// BOT FETCH FUNCTIONS
// =====================================================

/**
 * Fetch all bots for the current user
 */
async function getBots(): Promise<Bot[]> {
  const response = await apiGet<BotListResponse>("/api/v1/bots");
  return response.data;
}

/**
 * Fetch a single bot by ID
 */
async function getBot(botId: string): Promise<Bot> {
  const response = await apiGet<BotResponse>(`/api/v1/bots/${botId}`);
  return response.data;
}

/**
 * Create a new bot
 */
async function createBot(input: BotCreateInput): Promise<Bot> {
  const response = await apiPost<BotResponse>("/api/v1/bots", input);
  return response.data;
}

/**
 * Update a bot
 */
async function updateBot(botId: string, input: BotUpdateInput): Promise<Bot> {
  const response = await apiPatch<BotResponse>(`/api/v1/bots/${botId}`, input);
  return response.data;
}

/**
 * Delete a bot
 */
async function deleteBot(botId: string): Promise<void> {
  await apiDelete(`/api/v1/bots/${botId}`);
}

// =====================================================
// BOT QUERY HOOKS
// =====================================================

/**
 * Hook to get all bots for the current user
 */
export function useBots() {
  return useQuery({
    queryKey: botQueryKeys.list(),
    queryFn: getBots,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a single bot by ID
 */
export function useBot(botId: string) {
  return useQuery({
    queryKey: botQueryKeys.detail(botId),
    queryFn: () => getBot(botId),
    enabled: !!botId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =====================================================
// BOT MUTATION HOOKS
// =====================================================

/**
 * Hook to create a new bot
 */
export function useCreateBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBot,
    onSuccess: (newBot) => {
      // Invalidate and refetch bots list
      queryClient.invalidateQueries({
        queryKey: botQueryKeys.lists(),
      });

      // Add the new bot to the cache
      queryClient.setQueryData(botQueryKeys.detail(newBot.id), newBot);
    },
    onError: (error) => {
      console.error("Error creating bot:", error);
    },
  });
}

/**
 * Hook to update a bot
 */
export function useUpdateBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ botId, input }: { botId: string; input: BotUpdateInput }) =>
      updateBot(botId, input),
    onSuccess: (updatedBot) => {
      // Update the bot in the cache
      queryClient.setQueryData(botQueryKeys.detail(updatedBot.id), updatedBot);

      // Invalidate bots list to refetch
      queryClient.invalidateQueries({
        queryKey: botQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Error updating bot:", error);
    },
  });
}

/**
 * Hook to delete a bot
 */
export function useDeleteBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBot,
    onSuccess: (_, botId) => {
      // Remove the bot from cache
      queryClient.removeQueries({
        queryKey: botQueryKeys.detail(botId),
      });

      // Invalidate bots list to refetch
      queryClient.invalidateQueries({
        queryKey: botQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Error deleting bot:", error);
    },
  });
}
