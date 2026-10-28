import { apiClient } from '@/lib/api';
import type { JsonApiListResponse } from '@/types/jsonapi';
import type { UserAttributes, ListUsersParams } from '../types';

export const usersApi = {
  getUsers: async (params?: ListUsersParams): Promise<JsonApiListResponse<UserAttributes>> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams['page[number]'] = params.page;
    if (params?.perPage) queryParams['page[size]'] = params.perPage;
    if (params?.search) queryParams['search'] = params.search;

    const response = await apiClient.get<JsonApiListResponse<UserAttributes>>('/admin/users', {
      params: queryParams,
    });
    return response.data;
  },
};
