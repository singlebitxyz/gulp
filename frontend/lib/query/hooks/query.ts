import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/utils/api-client";

type QueryRequest = {
  query_text: string;
  top_k?: number;
  min_score?: number;
  session_id?: string;
  page_url?: string;
  include_metadata?: boolean;
};

type QueryResponse = {
  status: string;
  data: {
    answer: string;
    citations: {
      chunk_id: string;
      heading?: string;
      score?: number;
      source?: {
        source_id: string;
        source_type: string;
        original_url?: string;
        canonical_url?: string;
        storage_path?: string;
        filename?: string;
      };
    }[];
    confidence?: number;
    context_preview?: string;
    session_id?: string;
    page_url?: string;
  };
};

export function useQueryBot(botId: string | undefined) {
  return useMutation({
    mutationFn: async (body: QueryRequest) => {
      if (!botId) throw new Error("Missing botId");
      const res = await apiPost<QueryResponse>(
        `/api/v1/bots/${botId}/query`,
        body
      );
      return res.data;
    },
  });
}
