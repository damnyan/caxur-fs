"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { config } from "@/lib/config"
import { useAuthStore } from "@/lib/auth-store"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { logoutAction } from "@/app/actions/auth"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { token, user, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoggedIn = mounted && !!token
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/verify")
  const appName = config.appName

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await fetch(`${config.apiUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error("Logout failed", error);
      }
    }
    await logoutAction();
    logout()
    router.push("/")
  }

  useEffect(() => {
    if (isLoggedIn && isAuthPage) {
      router.push("/dashboard")
    }
  }, [isLoggedIn, isAuthPage, router])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 mx-auto max-w-7xl px-4 items-center justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold">{appName}</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/"
              className={`flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary ${pathname === "/" ? "text-foreground" : ""}`}
            >
              Home
            </Link>
            {!isLoggedIn && (
              <>
                <Link
                  href="/#about"
                  className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  About Us
                </Link>
                <Link
                  href="/#contact"
                  className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Contact Us
                </Link>
              </>
            )}
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className={`flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary ${pathname === "/dashboard" ? "text-foreground" : ""}`}
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {!isAuthPage && !isLoggedIn && (
            <div className="hidden md:flex gap-2">
              <Button render={<Link href="/login" />} variant="ghost" nativeButton={false}>
                Log in
              </Button>
              <Button render={<Link href="/register" />} nativeButton={false}>
                Sign up
              </Button>
            </div>
          )}

          {isLoggedIn && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="@johndoe" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              } />
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName ? `${user.firstName} ${user.lastName}` : "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || "No email"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/profile/update" />}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
