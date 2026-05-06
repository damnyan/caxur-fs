import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { administratorsApi } from './administrators';
import type { CreateAdministratorData, UpdateAdministratorData, AdministratorsParams } from '../types';

export const administratorsKeys = {
  all: ['administrators'] as const,
  lists: () => [...administratorsKeys.all, 'list'] as const,
  list: (params: AdministratorsParams) => [...administratorsKeys.lists(), params] as const,
  details: () => [...administratorsKeys.all, 'detail'] as const,
  detail: (id: string) => [...administratorsKeys.details(), id] as const,
};

export const useAdministrators = (params?: AdministratorsParams) => {
  return useQuery({
    queryKey: administratorsKeys.list(params || {}),
    queryFn: () => administratorsApi.list(params),
  });
};

export const useAdministrator = (id: string) => {
  return useQuery({
    queryKey: administratorsKeys.detail(id),
    queryFn: () => administratorsApi.get(id),
    enabled: !!id,
  });
};

export const useCreateAdministrator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdministratorData) => administratorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
    },
  });
};

export const useUpdateAdministrator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdministratorData }) =>
      administratorsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administratorsKeys.detail(variables.id) });
    },
  });
};

export const useDeleteAdministrator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => administratorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
    },
  });
};

export const useRevokeAdministrator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => administratorsApi.revoke(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administratorsKeys.detail(id) });
    },
  });
};

export const useRestoreAdministrator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => administratorsApi.restore(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: administratorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administratorsKeys.detail(id) });
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: (id: string) => administratorsApi.resendVerification(id),
  });
};
