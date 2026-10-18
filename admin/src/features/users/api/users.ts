import { apiClient } from '@/lib/api';
import type { UserResource, ListUsersParams } from '../types';

export const usersApi = {
  getUsers: async (params?: ListUsersParams) => {
    const queryParams: Record<string, any> = {};
    if (params?.page) queryParams['page[number]'] = params.page;
    if (params?.perPage) queryParams['page[size]'] = params.perPage;
    if (params?.search) queryParams['search'] = params.search;

    const response = await apiClient.get<{
      data: UserResource[];
      meta?: {
        page?: number;
        perPage?: number;
        total?: number;
      };
    }>('/admin/users', { params: queryParams });
    return response.data;
  },
};
