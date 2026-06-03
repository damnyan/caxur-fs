import { useAuthStore } from '../store/authStore';
import { type UseFormSetError } from 'react-hook-form';

// Determine base URL from environment or fallback to '/api/v1'
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

// Custom API Error class to mimic Axios error structure for compatibility
export class ApiError extends Error {
  status?: number;
  data?: any;
  config?: any;
  response?: {
    status: number;
    data: any;
    headers: Headers;
  };

  constructor(message: string, response?: { status: number; data: any; headers: Headers }, config?: any) {
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

// Token refreshing queue
let isRefreshing = false;
let failedQueue: { resolve: (token: string | null) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function buildUrl(url: string, params?: Record<string, any>): string {
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

async function performFetch(url: string, init: RequestInit, bodyData?: any) {
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

async function request<T>(url: string, options: RequestInit & { params?: Record<string, any>; data?: any; _retry?: boolean } = {}): Promise<{ data: T; status: number; headers: Headers }> {
  const { params, data, _retry, ...init } = options;
  const fullUrl = buildUrl(url, params);

  let response: Response;
  try {
    response = await performFetch(fullUrl, init, data);
  } catch (err: any) {
    throw new ApiError(err.message || 'Network Error', undefined, options);
  }

  let responseData: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
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
      data: responseData,
      status: response.status,
      headers: response.headers,
    };
  }

  // Handle 403 Forbidden (Auto-logout if the account is revoked)
  if (response.status === 403) {
    const isRevoked = responseData?.errors?.some(
      (err: any) => err.code === 'account_revoked'
    );
    if (isRevoked) {
      const authStore = useAuthStore.getState();
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Account Revoked', { status: response.status, data: responseData, headers: response.headers }, options);
    }
  }

  // Handle 401 Unauthorized (Token refresh flow)
  if (response.status === 401 && !_retry) {
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then((newToken) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        return request<T>(url, { ...options, headers, _retry: true });
      })
      .catch((err) => {
        throw err;
      });
    }

    options._retry = true;
    isRefreshing = true;

    const authStore = useAuthStore.getState();
    const refreshToken = authStore.refreshToken;

    if (!refreshToken) {
      isRefreshing = false;
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized', { status: response.status, data: responseData, headers: response.headers }, options);
    }

    try {
      // Call token refresh route directly with raw fetch
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

      const refreshData = await refreshResponse.json();
      const newAccessToken = refreshData.data.attributes.accessToken;
      const newRefreshToken = refreshData.data.attributes.refreshToken;

      authStore.setToken(newAccessToken, newRefreshToken);
      processQueue(null, newAccessToken);

      // Retry original request
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      return request<T>(url, { ...options, headers, _retry: true });
    } catch (err) {
      processQueue(err as Error, null);
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized (Refresh Failed)', { status: response.status, data: responseData, headers: response.headers }, options);
    } finally {
      isRefreshing = false;
    }
  }

  throw new ApiError(
    responseData?.errors?.[0]?.detail || response.statusText || 'Request failed',
    { status: response.status, data: responseData, headers: response.headers },
    options
  );
}

export const apiClient = {
  get: <T = any>(url: string, config?: RequestInit & { params?: Record<string, any> }) =>
    request<T>(url, { method: 'GET', ...config }),
    
  post: <T = any>(url: string, data?: any, config?: RequestInit & { params?: Record<string, any> }) =>
    request<T>(url, { method: 'POST', data, ...config }),
    
  put: <T = any>(url: string, data?: any, config?: RequestInit & { params?: Record<string, any> }) =>
    request<T>(url, { method: 'PUT', data, ...config }),
    
  patch: <T = any>(url: string, data?: any, config?: RequestInit & { params?: Record<string, any> }) =>
    request<T>(url, { method: 'PATCH', data, ...config }),
    
  delete: <T = any>(url: string, config?: RequestInit & { params?: Record<string, any>; data?: any }) =>
    request<T>(url, { method: 'DELETE', ...config }),
};

export function handleApiValidationErrors<T extends Record<string, any>>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean {
  if (error instanceof ApiError && error.status === 422 && error.data?.errors) {
    const apiErrors = error.data.errors;
    let handled = false;
    
    apiErrors.forEach((apiErr: any) => {
      if (apiErr.source?.pointer) {
        // pointer could be "/data/attributes/name" or "/permissions"
        const parts = apiErr.source.pointer.split('/');
        let fieldName = parts[parts.length - 1];
        
        // Handle array indices in pointer, e.g. "/permissions[0]" -> "permissions"
        if (fieldName && fieldName.includes('[')) {
          fieldName = fieldName.split('[')[0];
        }

        if (fieldName) {
          setError(fieldName as any, { type: 'server', message: apiErr.detail });
          handled = true;
        }
      }
    });
    return handled;
  }
  return false;
}
