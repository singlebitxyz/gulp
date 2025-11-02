// =====================================================
// SOURCE TYPE DEFINITIONS
// =====================================================
// TypeScript types matching the backend Pydantic models
// =====================================================

export type SourceType = "pdf" | "docx" | "html" | "text";

export type SourceStatus = "uploaded" | "parsing" | "indexed" | "failed";

export interface Source {
  id: string;
  bot_id: string;
  source_type: SourceType;
  original_url?: string;
  canonical_url?: string;
  storage_path: string;
  status: SourceStatus;
  error_message?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

export interface SourceCreateInput {
  source_type: SourceType;
  original_url?: string;
}

export interface SourceResponse {
  status: "success" | "error";
  data: Source;
  message?: string;
}

export interface SourceListResponse {
  status: "success" | "error";
  data: Source[];
  message?: string;
}
