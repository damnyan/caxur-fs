import { useAuthStore } from "./auth-store";
import { config } from "./config";

let isRefreshing = false;
let failedQueue: { resolve: (value: string | null) => void; reject: (reason?: any) => void; }[] = [];

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

/**
 * A fetch wrapper that automatically handles:
 * - Injecting the Authorization token.
 * - Refreshing the token on 401 Unauthorized.
 * - Auto-logout on 403 Forbidden with account_revoked error.
 */
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const authStore = useAuthStore.getState();
  const token = authStore.token;

  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(input, { ...init, headers });

  // Handle 403 Account Revoked
  if (response.status === 403) {
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      const isRevoked = data?.errors?.some((err: any) => err.code === 'account_revoked');
      if (isRevoked) {
        authStore.logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return response;
      }
    } catch (e) {
      // Ignore json parse error
    }
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then((newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(input, { ...init, headers });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
    }

    const refreshToken = authStore.refreshToken;
    if (!refreshToken) {
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return response;
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(input, { ...init, headers });

    } catch (error: any) {
      processQueue(error, null);
      authStore.logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}
