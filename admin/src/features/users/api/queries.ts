import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usersApi } from './users';
import type { ListUsersParams } from '../types';

export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (params: ListUsersParams) => [...usersKeys.lists(), params] as const,
};

export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => usersApi.getUsers(params),
    placeholderData: keepPreviousData,
  });
}
