export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  name: string;
  description: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
}

// JSON API Response formats matching the backend
export interface JsonApiData<T> {
  id: string;
  type: string;
  attributes: T;
}

export interface JsonApiResponse<T> {
  data: JsonApiData<T>;
}

export interface JsonApiListResponse<T> {
  data: JsonApiData<T>[];
  meta?: {
    page: number;
    perPage: number;
    total: number;
  };
}
