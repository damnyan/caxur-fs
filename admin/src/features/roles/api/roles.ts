import { apiClient } from '@/lib/api';
import type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  JsonApiResponse,
  JsonApiListResponse,
} from '../types';

export const getRoles = async (
  page: number = 1,
  perPage: number = 20
): Promise<JsonApiListResponse<Role>> => {
  const response = await apiClient.get<JsonApiListResponse<Role>>('/admin/roles', {
    params: { page, perPage },
  });
  return response.data;
};

export const getRole = async (id: string): Promise<JsonApiResponse<Role>> => {
  const response = await apiClient.get<JsonApiResponse<Role>>(`/admin/roles/${id}`);
  return response.data;
};

export const createRole = async (data: CreateRoleRequest): Promise<JsonApiResponse<Role>> => {
  const response = await apiClient.post<JsonApiResponse<Role>>('/admin/roles', data);
  return response.data;
};

export const updateRole = async (id: string, data: UpdateRoleRequest): Promise<JsonApiResponse<Role>> => {
  const response = await apiClient.put<JsonApiResponse<Role>>(`/admin/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/roles/${id}`);
};

// Permission methods

// From /api/v1/admin/permissions handler
export const getPermissions = async (
  page: number = 1,
  perPage: number = 100
): Promise<JsonApiListResponse<Permission>> => {
  const response = await apiClient.get<JsonApiListResponse<Permission>>('/admin/permissions', {
    params: { 
      'page[number]': page,
      'page[size]': perPage
    },
  });
  return response.data;
};

// From GET /api/v1/admin/roles/{id}/permissions
// Note: Backend returns `JsonApiResponse<Vec<PermissionDto>>`
// So it returns `{ data: [ { name, description } ] }` but not JsonApiResource wrapped
export const getRolePermissions = async (roleId: string): Promise<{ data: string[] }> => {
  const response = await apiClient.get<{ data: string[] }>(`/admin/roles/${roleId}/permissions`);
  return response.data;
};

export const attachRolePermissions = async (
  roleId: string,
  permissions: Permission[]
): Promise<void> => {
  await apiClient.post(`/admin/roles/${roleId}/permissions`, { 
    permissions: permissions.map(p => p.name) 
  });
};

export const detachRolePermissions = async (
  roleId: string,
  permissions: Permission[]
): Promise<void> => {
  await apiClient.delete(`/admin/roles/${roleId}/permissions`, {
    data: { permissions: permissions.map(p => p.name) },
  });
};
