/**
 * Unified API Client for Frontend-to-Backend HTTP communication
 */

export class ApiError extends Error {
  status: number;
  data: any;
  requestId?: string;

  constructor(message: string, status: number, data?: any, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.requestId = requestId;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const requestId = response.headers.get('x-request-id') || undefined;

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `API 請求失敗 (${response.status})`;
    throw new ApiError(errorMsg, response.status, data, requestId);
  }

  return data as T;
}

