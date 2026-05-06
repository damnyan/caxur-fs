import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Determine base URL from environment or fallback to '/api/v1'
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add Authorization header if token exists
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors like 401 Unauthorized
let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Note: Assuming JSON:API format, but returning full response for flexibility
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = 'Bearer ' + token;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const authStore = useAuthStore.getState();
      const refreshToken = authStore.refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        authStore.logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${baseURL}/admin/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data.attributes.accessToken;
        const newRefreshToken = data.data.attributes.refreshToken;

        authStore.setToken(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err as AxiosError, null);
        authStore.logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

import { type UseFormSetError } from 'react-hook-form';

export function handleApiValidationErrors<T extends Record<string, any>>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean {
  if (axios.isAxiosError(error) && error.response?.status === 422 && error.response.data?.errors) {
    const apiErrors = error.response.data.errors;
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
