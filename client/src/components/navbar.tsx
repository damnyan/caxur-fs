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

export function Navbar() {
  const pathname = usePathname()
  
  // A simple mock for authentication state based on the route.
  // If we are in /dashboard or /profile, we assume logged in.
  const isAuthPage = pathname === "/login"
  const isLoggedIn = pathname.startsWith("/dashboard") || pathname.startsWith("/profile")

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 mx-auto max-w-7xl px-4 items-center justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold">Acme Corp</span>
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
              <Button render={<Link href="/login" />} nativeButton={false}>
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
                    <p className="text-sm font-medium leading-none">John Doe</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      john.doe@example.com
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
                <DropdownMenuItem render={<Link href="/" />}>
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
