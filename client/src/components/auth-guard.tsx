"use client"

import { useAuthStore } from "@/lib/auth-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"
import { useIdleTimeout } from "@/hooks/use-idle-timeout"
import { config } from "@/lib/config"
import { logoutAction, syncSessionAction } from "@/app/actions/auth"

const emptySubscribe = () => () => {}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, refreshToken, user, setToken, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const handleLogout = async () => {
    if (!useAuthStore.getState().token) return
    const currentRefreshToken = useAuthStore.getState().refreshToken
    if (currentRefreshToken) {
      try {
        await fetch(`${config.apiUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        })
      } catch (error) {
        console.error("Logout failed", error)
      }
    }
    await logoutAction()
    logout()
    window.location.href = "/login"
  }

  useIdleTimeout(handleLogout, 15 * 60 * 1000)

  useEffect(() => {
    if (!mounted) return

    let active = true
    const isAuthPage =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/register/verify") ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password"
    const isProtectedRoute =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/onboarding")

    if (token && isAuthPage) {
      void syncSessionAction(refreshToken).then((res) => {
        if (!active) return
        if (!res.valid) {
          logout()
          return
        }
        if (res.data) {
          setToken(res.data.accessToken, res.data.refreshToken)
        }
        const target =
          pathname.startsWith("/register/verify") || (user && !user.firstName)
            ? "/onboarding"
            : "/dashboard"
        router.push(target)
      })
    } else if (!token && isProtectedRoute) {
      void logoutAction()
      router.push("/login")
    }

    return () => {
      active = false
    }
  }, [token, refreshToken, user, setToken, logout, pathname, router, mounted])

  return <>{children}</>
}
