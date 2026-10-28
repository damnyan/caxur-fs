export interface JsonApiRelationshipItem {
  id: string;
  type: string;
}

export interface JsonApiRelationship {
  data?: JsonApiRelationshipItem[];
}

export interface JsonApiIncludedResource<T = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: T;
}

export interface JsonApiData<T> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, JsonApiRelationship>;
}

export interface JsonApiPaginationMeta {
  page: number;
  perPage: number;
  total: number;
}

export interface JsonApiResponse<T, M = Record<string, unknown>> {
  data: JsonApiData<T>;
  included?: JsonApiIncludedResource[];
  meta?: M;
}

export interface JsonApiListResponse<T> {
  data: JsonApiData<T>[];
  included?: JsonApiIncludedResource[];
  meta?: JsonApiPaginationMeta;
}

export interface JsonApiErrorSource {
  pointer?: string;
  parameter?: string;
}

export interface JsonApiErrorObject {
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: JsonApiErrorSource;
}

export interface JsonApiErrorResponse {
  errors?: JsonApiErrorObject[];
}
