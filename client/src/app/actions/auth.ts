"use server"

import { cookies } from "next/headers"
import { z } from "zod"
import { config } from "@/lib/config"

const authTokensSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().min(1).optional(),
})

const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const verifyInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  otp: z.string().trim().min(1, "Verification code is required"),
})

const refreshInputSchema = z.string().min(1, "Refresh token is required")

export async function setAuthCookies(tokens: { accessToken: string; refreshToken?: string }) {
  const parsed = authTokensSchema.safeParse(tokens)
  if (!parsed.success) {
    throw new Error("Invalid authentication tokens")
  }

  const { accessToken, refreshToken } = parsed.data
  const cookieStore = await cookies()
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 mins
  })

  if (refreshToken) {
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }
}

export async function loginAction(email: string, password: string) {
  try {
    const parsedInput = loginInputSchema.safeParse({ email, password })
    if (!parsedInput.success) {
      return { error: parsedInput.error.issues[0]?.message || "Invalid login input" }
    }

    const response = await fetch(`${config.apiUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.errors?.[0]?.detail || "Login failed" }
    }

    await setAuthCookies(data.data.attributes)

    return { success: true, data: data.data.attributes }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function verifyAction(email: string, otp: string) {
  try {
    const parsedInput = verifyInputSchema.safeParse({ email, otp })
    if (!parsedInput.success) {
      return { error: parsedInput.error.issues[0]?.message || "Invalid verification input" }
    }

    const response = await fetch(`${config.apiUrl}/api/v1/auth/register/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.errors?.[0]?.detail || "Verification failed" }
    }

    await setAuthCookies(data.data.attributes)

    return { success: true, data: data.data.attributes }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete("accessToken")
  cookieStore.delete("refreshToken")
  return { success: true }
}

export async function refreshAction(refreshToken: string) {
  try {
    const parsedToken = refreshInputSchema.safeParse(refreshToken)
    if (!parsedToken.success) {
      return { error: parsedToken.error.issues[0]?.message || "Refresh token is required" }
    }

    const response = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: parsedToken.data }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.errors?.[0]?.detail || "Refresh failed" }
    }

    await setAuthCookies(data.data.attributes)

    return { success: true, data: data.data.attributes }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function syncSessionAction(fallbackRefreshToken?: string | null) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("accessToken")?.value
  if (accessToken) {
    return { valid: true as const }
  }

  const refreshToken = cookieStore.get("refreshToken")?.value || fallbackRefreshToken
  if (refreshToken) {
    const refreshed = await refreshAction(refreshToken)
    if (refreshed.success && refreshed.data) {
      return {
        valid: true as const,
        data: refreshed.data as { accessToken: string; refreshToken: string },
      }
    }
  }

  cookieStore.delete("accessToken")
  cookieStore.delete("refreshToken")
  return { valid: false as const }
}

