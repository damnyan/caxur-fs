"use client"

import { useAuthStore } from "@/lib/auth-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useIdleTimeout } from "@/hooks/use-idle-timeout"
import { config } from "@/lib/config"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, refreshToken, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await fetch(`${config.apiUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      } catch (error) {
        console.error("Logout failed", error)
      }
    }
    logout()
  }

  useIdleTimeout(handleLogout, 15 * 60 * 1000)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/verify")
      const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/onboarding")

      if (token && isAuthPage) {
        router.push("/dashboard")
      } else if (!token && isProtectedRoute) {
        router.push("/login")
      }
    }
  }, [token, pathname, router, mounted])

  if (!mounted) return null

  // Optional: Add loading state if checking token
  return <>{children}</>
}
