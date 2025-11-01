// =====================================================
// BOT TYPE DEFINITIONS
// =====================================================
// TypeScript types matching the backend Pydantic models
// =====================================================

export type LLMProvider = "openai" | "gemini";

export interface LLMConfig {
  temperature?: number;
  max_tokens?: number;
  model_name?: string;
}

export interface Bot {
  id: string;
  org_id?: string | null;
  name: string;
  description?: string | null;
  system_prompt: string;
  llm_provider: LLMProvider;
  llm_config: LLMConfig;
  retention_days: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BotCreateInput {
  name: string;
  description?: string;
  system_prompt?: string;
  llm_provider: LLMProvider;
  llm_config?: LLMConfig;
  retention_days?: number;
}

export interface BotUpdateInput {
  name?: string;
  description?: string;
  system_prompt?: string;
  llm_provider?: LLMProvider;
  llm_config?: Partial<LLMConfig>;
  retention_days?: number;
}

// API Response Types
export interface BotResponse {
  status: "success" | "error";
  data: Bot;
  message: string;
}

export interface BotListResponse {
  status: "success" | "error";
  data: Bot[];
  message: string;
}
