import { useQuery } from '@tanstack/react-query';

interface HealthResponse {
  status?: string;
  version?: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const healthUrl = apiBase.replace(/\/api\/v1\/?$/, '/health');
  const response = await fetch(healthUrl);
  if (!response.ok) {
    throw new Error('API health check failed');
  }
  return (await response.json()) as HealthResponse;
}

export function useHealth() {
  return useQuery({
    queryKey: ['system', 'health'] as const,
    queryFn: fetchHealth,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
