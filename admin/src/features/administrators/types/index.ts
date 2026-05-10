export interface Administrator {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  email: string;
  roles?: string[];
  emailVerifiedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdministratorData {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  email: string;
}

export interface UpdateAdministratorData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactNumber?: string;
  email?: string;
}

export interface AttachRolesData {
  roleIds: string[];
}

export interface AdministratorsParams {
  'page[number]'?: number;
  'page[size]'?: number;
  search?: string;
  roleId?: string;
  filter?: string;
  sort?: string;
}
