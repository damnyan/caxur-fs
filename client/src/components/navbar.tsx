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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { config } from "@/lib/config"
import { useAuthStore } from "@/lib/auth-store"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { logoutAction } from "@/app/actions/auth"
import { Menu, LogOut } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { token, user, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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

        <div className="flex items-center gap-2 sm:gap-4">
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
                    <AvatarImage src="/avatars/01.png" alt={user?.firstName || "User"} />
                    <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              } />
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName ? `${user.firstName} ${user.lastName}` : "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground font-mono">
                      {user?.email || "No email"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  Dashboard
                </DropdownMenuItem>
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

          {/* Mobile Burger Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Toggle Menu"
              />
            }>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col justify-between">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="font-bold text-lg">
                  {appName}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center py-2 text-sm font-medium rounded-md px-3 transition-colors ${
                    pathname === "/"
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  Home
                </Link>

                {!isLoggedIn ? (
                  <>
                    <Link
                      href="/#about"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center py-2 text-sm font-medium rounded-md px-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      About Us
                    </Link>
                    <Link
                      href="/#contact"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center py-2 text-sm font-medium rounded-md px-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      Contact Us
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center py-2 text-sm font-medium rounded-md px-3 transition-colors ${
                        pathname === "/dashboard"
                          ? "bg-accent text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center py-2 text-sm font-medium rounded-md px-3 transition-colors ${
                        pathname === "/profile"
                          ? "bg-accent text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/profile/update"
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center py-2 text-sm font-medium rounded-md px-3 transition-colors ${
                        pathname === "/profile/update"
                          ? "bg-accent text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      Edit Profile
                    </Link>
                  </>
                )}
              </div>

              <div className="p-4 border-t mt-auto space-y-4 bg-muted/20">
                {!isLoggedIn && !isAuthPage && (
                  <div className="flex flex-col gap-2">
                    <Button
                      render={<Link href="/login" onClick={() => setMobileOpen(false)} />}
                      variant="outline"
                      className="w-full justify-center"
                      nativeButton={false}
                    >
                      Log in
                    </Button>
                    <Button
                      render={<Link href="/register" onClick={() => setMobileOpen(false)} />}
                      className="w-full justify-center"
                      nativeButton={false}
                    >
                      Sign up
                    </Button>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/avatars/01.png" alt={user?.firstName || "User"} />
                        <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {user?.firstName ? `${user.firstName} ${user.lastName}` : "User"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate font-mono">
                          {user?.email || "No email"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-center text-destructive hover:text-destructive"
                      onClick={() => {
                        setMobileOpen(false)
                        handleLogout()
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
