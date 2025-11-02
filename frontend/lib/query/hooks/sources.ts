// =====================================================
// SOURCE REACT QUERY HOOKS
// =====================================================
// React Query hooks for source management operations
// =====================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type {
  Source,
  SourceCreateInput,
  SourceListResponse,
  SourceResponse,
} from "@/lib/types/source";
import { apiDelete, apiGet, apiPost } from "@/lib/utils/api-client";

// =====================================================
// QUERY FUNCTIONS
// =====================================================

const getSources = async (botId: string): Promise<Source[]> => {
  const response = await apiGet<SourceListResponse>(
    `/api/v1/bots/${botId}/sources`
  );
  return response.data;
};

const getSource = async (botId: string, sourceId: string): Promise<Source> => {
  const response = await apiGet<SourceResponse>(
    `/api/v1/bots/${botId}/sources/${sourceId}`
  );
  return response.data;
};

const uploadFileSource = async (botId: string, file: File): Promise<Source> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/v1/bots/${botId}/sources/upload`, {
    method: "POST",
    body: formData,
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: `HTTP ${response.status} error`,
    }));
    throw new Error(error.detail || error.message || "Failed to upload file");
  }

  const data: SourceResponse = await response.json();
  return data.data;
};

const createUrlSource = async (
  botId: string,
  sourceData: SourceCreateInput
): Promise<Source> => {
  const response = await apiPost<SourceResponse>(
    `/api/v1/bots/${botId}/sources/url`,
    sourceData
  );
  return response.data;
};

const deleteSource = async (botId: string, sourceId: string): Promise<void> => {
  await apiDelete<void>(`/api/v1/bots/${botId}/sources/${sourceId}`);
};

// =====================================================
// REACT QUERY HOOKS
// =====================================================

/**
 * Hook to fetch all sources for a bot
 */
export function useSources(botId: string) {
  return useQuery<Source[], Error>({
    queryKey: ["sources", botId],
    queryFn: () => getSources(botId),
    enabled: !!botId, // Only run query if botId is available
  });
}

/**
 * Hook to fetch a single source by ID
 */
export function useSource(botId: string, sourceId: string) {
  return useQuery<Source, Error>({
    queryKey: ["sources", botId, sourceId],
    queryFn: () => getSource(botId, sourceId),
    enabled: !!botId && !!sourceId,
  });
}

/**
 * Hook to upload a file source
 */
export function useUploadFileSource(botId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  return useMutation<Source, Error, File>({
    mutationFn: (file) => uploadFileSource(botId, file),
    onSuccess: (newSource) => {
      queryClient.invalidateQueries({ queryKey: ["sources", botId] }); // Invalidate source list to refetch
      queryClient.setQueryData(["sources", botId, newSource.id], newSource); // Add new source to cache
      success(
        "File Uploaded",
        `"${newSource.storage_path.split("/").pop()}" uploaded successfully!`
      );
    },
    onError: (err) => {
      error("Upload Failed", err.message || "Failed to upload file.");
    },
  });
}

/**
 * Hook to create a URL source
 */
export function useCreateUrlSource(botId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  return useMutation<Source, Error, SourceCreateInput>({
    mutationFn: (sourceData) => createUrlSource(botId, sourceData),
    onSuccess: (newSource) => {
      queryClient.invalidateQueries({ queryKey: ["sources", botId] }); // Invalidate source list to refetch
      queryClient.setQueryData(["sources", botId, newSource.id], newSource); // Add new source to cache
      success(
        "URL Added",
        `URL "${newSource.original_url}" added successfully!`
      );
    },
    onError: (err) => {
      error("Failed to Add URL", err.message || "Failed to add URL source.");
    },
  });
}

/**
 * Hook to delete a source
 */
export function useDeleteSource(botId: string) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  return useMutation<void, Error, string>({
    mutationFn: (sourceId) => deleteSource(botId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", botId] }); // Invalidate source list to refetch
      success("Source Deleted", "Source deleted successfully!");
    },
    onError: (err) => {
      error("Deletion Failed", err.message || "Failed to delete source.");
    },
  });
}
