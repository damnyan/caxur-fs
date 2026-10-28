import { apiClient } from '@/lib/api';
import type { User } from '@/store/authStore';
import type { JsonApiResponse } from '@/types/jsonapi';

export interface ProfileAttributes {
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  contactNumber: string | null;
}

export interface ProfileMeta {
  permissions?: string[];
}

export async function fetchMyProfile(): Promise<User> {
  const response = await apiClient.get<JsonApiResponse<ProfileAttributes, ProfileMeta>>(
    '/admin/my/profile'
  );
  const profileAttrs = response.data.data.attributes;
  const profileId = response.data.data.id;
  const permissions = response.data.meta?.permissions || [];

  const roles = (response.data.included || [])
    .filter((inc) => inc.type === 'roles')
    .map((role) => ({
      id: role.id,
      name: String(role.attributes.name ?? ''),
    }))
    .filter((role) => Boolean(role.name));

  return {
    id: profileId,
    email: profileAttrs.email,
    firstName: profileAttrs.firstName,
    middleName: profileAttrs.middleName ?? null,
    lastName: profileAttrs.lastName,
    suffix: profileAttrs.suffix ?? null,
    contactNumber: profileAttrs.contactNumber ?? null,
    roles,
    permissions,
  };
}
