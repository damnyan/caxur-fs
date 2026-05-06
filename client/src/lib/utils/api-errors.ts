import { UseFormSetError, FieldValues, Path } from "react-hook-form"

export interface ApiError {
  detail: string
  source?: {
    pointer?: string
  }
}

export interface ApiResponse {
  errors?: ApiError[]
}

/**
 * Maps JSON:API error pointers to React Hook Form fields.
 * Example pointer: /data/attributes/firstName -> firstName
 */
export function handleApiErrors<TFieldValues extends FieldValues>(
  errorData: ApiResponse,
  setError: UseFormSetError<TFieldValues>
) {
  if (!errorData.errors) return

  errorData.errors.forEach((error) => {
    if (error.source?.pointer) {
      // Extract field name from pointer (e.g., /data/attributes/firstName -> firstName)
      const parts = error.source.pointer.split("/")
      const fieldName = parts[parts.length - 1] as Path<TFieldValues>
      
      setError(fieldName, {
        type: "server",
        message: error.detail,
      })
    }
  })
}
