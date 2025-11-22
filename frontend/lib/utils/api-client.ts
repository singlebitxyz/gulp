// =====================================================
// API CLIENT UTILITIES
// =====================================================
// Centralized API client for backend FastAPI communication
// =====================================================

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Get the base API URL
 * Uses NEXT_PUBLIC_API_BASE_URL if set, otherwise uses relative path (for rewrites)
 */
function getApiBaseUrl(): string {
  // If NEXT_PUBLIC_API_BASE_URL is set, use it directly (for external API)
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // Otherwise use relative path (will use Next.js rewrite)
  return "";
}

/**
 * Make an API request to the backend
 * Automatically includes cookies for authentication
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("/") 
    ? `${baseUrl}${endpoint}` 
    : `${baseUrl}/${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies for authentication
  });

  // Parse response
  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new APIError(
      text || "Unknown error occurred",
      response.status,
      "UNKNOWN_ERROR"
    );
  }

  // Check if response indicates an error
  if (!response.ok) {
    const errorMessage =
      data.message || data.detail || `HTTP ${response.status} error`;
    throw new APIError(
      errorMessage,
      response.status,
      data.code || `HTTP_${response.status}`,
      data
    );
  }

  // If the API response has a status field, check it
  if (data.status === "error") {
    throw new APIError(
      data.message || "API returned an error",
      response.status,
      data.code || "API_ERROR",
      data
    );
  }

  return data;
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "GET",
  });
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "DELETE",
  });
}
