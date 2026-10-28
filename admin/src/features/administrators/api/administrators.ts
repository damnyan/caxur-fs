import { apiClient } from '@/lib/api';
import type { JsonApiData, JsonApiListResponse, JsonApiResponse } from '@/types/jsonapi';
import type {
  Administrator,
  CreateAdministratorData,
  UpdateAdministratorData,
  AttachRolesData,
  AdministratorsParams,
} from '../types';

type AdministratorAttributes = Omit<Administrator, 'id' | 'roles'>;

function extractRoleNames(
  item: JsonApiData<AdministratorAttributes>,
  included: JsonApiData<Record<string, unknown>>[] = []
): string[] {
  const relData = item.relationships?.roles?.data;
  if (!Array.isArray(relData)) {
    return [];
  }
  const roleIds = new Set(relData.map((r) => r.id));
  return included
    .filter((inc) => inc.type === 'roles' && roleIds.has(inc.id))
    .map((inc) => (typeof inc.attributes?.name === 'string' ? inc.attributes.name : undefined))
    .filter((name): name is string => Boolean(name));
}

export const administratorsApi = {
  list: async (params?: AdministratorsParams) => {
    const response = await apiClient.get<JsonApiListResponse<AdministratorAttributes>>('/admin/administrators', {
      params: { ...params, include: 'roles' },
    });
    const included = response.data.included ?? [];

    const data: Administrator[] = response.data.data.map((item) => ({
      ...item.attributes,
      id: item.id,
      roles: extractRoleNames(item, included),
    }));

    return {
      data,
      meta: response.data.meta,
    };
  },

  get: async (id: string): Promise<Administrator> => {
    const response = await apiClient.get<JsonApiResponse<AdministratorAttributes>>(`/admin/administrators/${id}`, {
      params: { include: 'roles' },
    });

    const item = response.data.data;
    const included = response.data.included ?? [];

    return {
      ...item.attributes,
      id: item.id,
      roles: extractRoleNames(item, included),
    };
  },

  create: async (data: CreateAdministratorData): Promise<Administrator> => {
    const response = await apiClient.post<JsonApiResponse<AdministratorAttributes>>('/admin/administrators', data);
    return {
      ...response.data.data.attributes,
      id: response.data.data.id,
    };
  },

  update: async (id: string, data: UpdateAdministratorData): Promise<Administrator> => {
    const response = await apiClient.put<JsonApiResponse<AdministratorAttributes>>(`/admin/administrators/${id}`, data);
    return {
      ...response.data.data.attributes,
      id: response.data.data.id,
    };
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/admin/administrators/${id}`);
    return response.data;
  },

  revoke: async (id: string): Promise<Administrator> => {
    const response = await apiClient.post<JsonApiResponse<AdministratorAttributes>>(`/admin/administrators/${id}/revoke`);
    return {
      ...response.data.data.attributes,
      id: response.data.data.id,
    };
  },

  restore: async (id: string): Promise<Administrator> => {
    const response = await apiClient.post<JsonApiResponse<AdministratorAttributes>>(`/admin/administrators/${id}/restore`);
    return {
      ...response.data.data.attributes,
      id: response.data.data.id,
    };
  },

  resendVerification: async (id: string) => {
    const response = await apiClient.post(`/admin/administrators/${id}/resend-verification`);
    return response.data;
  },

  attachRoles: async (id: string, data: AttachRolesData) => {
    const response = await apiClient.post(`/admin/administrators/${id}/roles`, data);
    return response.data;
  },

  detachRoles: async (id: string, data: AttachRolesData) => {
    const response = await apiClient.delete(`/admin/administrators/${id}/roles`, { data });
    return response.data;
  },
};
