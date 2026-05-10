import { cookies } from "next/headers"
import { config } from "./config"

export async function fetchServerApi(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("accessToken")?.value

  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  
  const url = endpoint.startsWith("http") ? endpoint : `${config.apiUrl}${endpoint}`

  return fetch(url, {
    ...options,
    headers,
  })
}
