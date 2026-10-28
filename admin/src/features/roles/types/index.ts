import type {
  JsonApiData,
  JsonApiListResponse,
  JsonApiResponse,
} from '@/types/jsonapi';

export type { JsonApiData, JsonApiListResponse, JsonApiResponse };

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  name: string;
  description: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
}
