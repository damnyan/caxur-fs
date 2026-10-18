export interface UserAttributes {
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  facePhoto?: string;
  facePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResource {
  type: string;
  id: string;
  attributes: UserAttributes;
}

export interface ListUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
}
