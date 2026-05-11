"use server"

import { cookies } from "next/headers"
import { config } from "@/lib/config"

export async function loginAction(email: string, password: string) {
  try {
    const response = await fetch(`${config.apiUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.errors?.[0]?.detail || "Login failed" }
    }

    const { accessToken, refreshToken } = data.data.attributes

    const cookieStore = await cookies()
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15 // 15 mins
    })
    
    if (refreshToken) {
      cookieStore.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
    }

    return { success: true, data: data.data.attributes }
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" }
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
    const response = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.errors?.[0]?.detail || "Refresh failed" }
    }

    const { accessToken, refreshToken: newRefreshToken } = data.data.attributes

    const cookieStore = await cookies()
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15 // 15 mins
    })
    
    if (newRefreshToken) {
      cookieStore.set("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
    }

    return { success: true, data: data.data.attributes }
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" }
  }
}
