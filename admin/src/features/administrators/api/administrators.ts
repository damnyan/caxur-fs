import { apiClient } from '@/lib/api';
import type {
  Administrator,
  CreateAdministratorData,
  UpdateAdministratorData,
  AttachRolesData,
  AdministratorsParams,
} from '../types';

export const administratorsApi = {
  list: async (params?: AdministratorsParams) => {
    const response = await apiClient.get('/admin/administrators', { 
      params: { ...params, include: 'roles' } 
    });
    // Normalize JSON:API response
    const included = response.data.included || [];
    
    const data = response.data.data.map((item: any) => {
      // Extract roles from included data based on relationships
      let roles: string[] = [];
      if (item.relationships?.roles?.data) {
        const roleIds = item.relationships.roles.data.map((r: any) => r.id);
        roles = included
          .filter((inc: any) => inc.type === 'roles' && roleIds.includes(inc.id))
          .map((inc: any) => inc.attributes?.name)
          .filter(Boolean);
      }
      
      return {
        id: item.id,
        ...item.attributes,
        roles,
      };
    });
    
    return {
      data,
      meta: response.data.meta,
    };
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/admin/administrators/${id}`, {
      params: { include: 'roles' }
    });
    
    const item = response.data.data;
    const included = response.data.included || [];
    
    let roles: string[] = [];
    if (item.relationships?.roles?.data) {
      const roleIds = item.relationships.roles.data.map((r: any) => r.id);
      roles = included
        .filter((inc: any) => inc.type === 'roles' && roleIds.includes(inc.id))
        .map((inc: any) => inc.attributes?.name)
        .filter(Boolean);
    }
      
    return {
      id: item.id,
      ...item.attributes,
      roles,
    } as Administrator;
  },

  create: async (data: CreateAdministratorData) => {
    const response = await apiClient.post('/admin/administrators', data);
    return {
      id: response.data.data.id,
      ...response.data.data.attributes,
    } as Administrator;
  },

  update: async (id: string, data: UpdateAdministratorData) => {
    const response = await apiClient.put(`/admin/administrators/${id}`, data);
    return {
      id: response.data.data.id,
      ...response.data.data.attributes,
    } as Administrator;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/admin/administrators/${id}`);
    return response.data;
  },

  revoke: async (id: string) => {
    const response = await apiClient.post(`/admin/administrators/${id}/revoke`);
    return {
      id: response.data.data.id,
      ...response.data.data.attributes,
    } as Administrator;
  },

  restore: async (id: string) => {
    const response = await apiClient.post(`/admin/administrators/${id}/restore`);
    return {
      id: response.data.data.id,
      ...response.data.data.attributes,
    } as Administrator;
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
