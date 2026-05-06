"use client"

import { useAuthStore } from "@/lib/auth-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

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
