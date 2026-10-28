import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { queryClient } from './queryClient';
import type { JsonApiErrorResponse, JsonApiResponse } from '../types/jsonapi';

// Determine base URL from environment or fallback to '/api/v1'
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface ApiErrorResponse {
  status: number;
  data: JsonApiErrorResponse | string | null;
  headers: Headers;
}

export class ApiError extends Error {
  status?: number;
  data?: JsonApiErrorResponse | string | null;
  config?: RequestInit;
  response?: ApiErrorResponse;

  constructor(message: string, response?: ApiErrorResponse, config?: RequestInit) {
    super(message);
    this.name = 'ApiError';
    if (response) {
      this.status = response.status;
      this.data = response.data;
      this.response = response;
    }
    this.config = config;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'errors' in data && data.errors?.[0]?.detail) {
      return data.errors[0].detail;
    }
  }
  return fallback;
}

// Token refreshing queue
let isRefreshing = false;
let failedQueue: { resolve: (token: string | null) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function buildUrl(url: string, params?: object): string {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
  if (!params) return fullUrl;

  const urlObj = new URL(fullUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.set(key, String(value));
    }
  });
  return urlObj.toString();
}

async function performFetch(url: string, init: RequestInit, bodyData?: unknown) {
  const headers = new Headers(init.headers);

  // Inject auth token
  const token = useAuthStore.getState().token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set default content type
  if (bodyData !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchInit: RequestInit = {
    ...init,
    headers,
  };

  if (bodyData !== undefined) {
    fetchInit.body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
  }

  return fetch(url, fetchInit);
}

interface RequestOptions extends RequestInit {
  params?: object;
  data?: unknown;
  _retry?: boolean;
}

interface RefreshTokenAttributes {
  accessToken: string;
  refreshToken: string;
}

async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<{ data: T; status: number; headers: Headers }> {
  const { params, data, _retry, ...init } = options;
  const fullUrl = buildUrl(url, params);

  let response: Response;
  try {
    response = await performFetch(fullUrl, init, data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network Error';
    throw new ApiError(message, undefined, options);
  }

  let responseData: unknown = null;
  const contentType = response.headers.get('content-type');
  if (
    contentType &&
    (contentType.includes('application/json') ||
      contentType.includes('application/vnd.api+json'))
  ) {
    try {
      responseData = await response.json();
    } catch {
      // Ignored
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      // Ignored
    }
  }

  if (response.ok) {
    return {
      data: responseData as T,
      status: response.status,
      headers: response.headers,
    };
  }

  const errorPayload =
    responseData && typeof responseData === 'object'
      ? (responseData as JsonApiErrorResponse)
      : typeof responseData === 'string'
        ? responseData
        : null;

  // Handle 403 Forbidden (Auto-logout if the account is revoked)
  if (response.status === 403 && errorPayload && typeof errorPayload === 'object') {
    const isRevoked = errorPayload.errors?.some((err) => err.code === 'account_revoked');
    if (isRevoked) {
      const authStore = useAuthStore.getState();
      queryClient.clear();
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError(
        'Account Revoked',
        { status: response.status, data: errorPayload, headers: response.headers },
        options
      );
    }
  }

  // Handle 401 Unauthorized (Token refresh flow)
  if (response.status === 401 && !_retry) {
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        return request<T>(url, { ...options, headers, _retry: true });
      });
    }

    options._retry = true;
    isRefreshing = true;

    const authStore = useAuthStore.getState();
    const refreshToken = authStore.refreshToken;

    if (!refreshToken) {
      isRefreshing = false;
      queryClient.clear();
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError(
        'Unauthorized',
        { status: response.status, data: errorPayload, headers: response.headers },
        options
      );
    }

    try {
      const refreshResponse = await fetch(buildUrl('/admin/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Refresh failed');
      }

      const refreshData = (await refreshResponse.json()) as JsonApiResponse<RefreshTokenAttributes>;
      const newAccessToken = refreshData.data.attributes.accessToken;
      const newRefreshToken = refreshData.data.attributes.refreshToken;

      authStore.setToken(newAccessToken, newRefreshToken);
      processQueue(null, newAccessToken);

      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      return request<T>(url, { ...options, headers, _retry: true });
    } catch (err: unknown) {
      processQueue(err, null);
      queryClient.clear();
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError(
        'Unauthorized (Refresh Failed)',
        { status: response.status, data: errorPayload, headers: response.headers },
        options
      );
    } finally {
      isRefreshing = false;
    }
  }

  const detailMessage =
    errorPayload && typeof errorPayload === 'object'
      ? errorPayload.errors?.[0]?.detail
      : undefined;

  throw new ApiError(
    detailMessage || response.statusText || 'Request failed',
    { status: response.status, data: errorPayload, headers: response.headers },
    options
  );
}

export const apiClient = {
  get: <T = unknown>(url: string, config?: RequestInit & { params?: object }) =>
    request<T>(url, { method: 'GET', ...config }),

  post: <T = unknown>(url: string, data?: unknown, config?: RequestInit & { params?: object }) =>
    request<T>(url, { method: 'POST', data, ...config }),

  put: <T = unknown>(url: string, data?: unknown, config?: RequestInit & { params?: object }) =>
    request<T>(url, { method: 'PUT', data, ...config }),

  patch: <T = unknown>(url: string, data?: unknown, config?: RequestInit & { params?: object }) =>
    request<T>(url, { method: 'PATCH', data, ...config }),

  delete: <T = unknown>(
    url: string,
    config?: RequestInit & { params?: object; data?: unknown }
  ) => request<T>(url, { method: 'DELETE', ...config }),
};

export function handleApiValidationErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean {
  if (
    error instanceof ApiError &&
    error.status === 422 &&
    error.data &&
    typeof error.data === 'object' &&
    Array.isArray(error.data.errors)
  ) {
    let handled = false;

    error.data.errors.forEach((apiErr) => {
      if (apiErr.source?.pointer) {
        const parts = apiErr.source.pointer.split('/');
        let fieldName = parts[parts.length - 1];

        if (fieldName && fieldName.includes('[')) {
          fieldName = fieldName.split('[')[0];
        }

        if (fieldName) {
          setError(fieldName as Path<T>, { type: 'server', message: apiErr.detail });
          handled = true;
        }
      }
    });
    return handled;
  }
  return false;
}
