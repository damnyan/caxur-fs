"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useAuthStore } from "@/lib/auth-store"
import { config } from "@/lib/config"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function ProfilePage() {
  const { token, user, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(!user)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return
      
      try {
        const response = await fetch(`${config.apiUrl}/api/v1/my/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.errors?.[0]?.detail || "Failed to fetch profile")
        }

        setUser(data.data.attributes)
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (!user && token) {
      fetchProfile()
    }
  }, [token, user, setUser])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground italic">Loading profile...</p>
      </div>
    )
  }

  const fullName = user?.firstName ? `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}${user.suffix ? ' ' + user.suffix : ''}` : "Not set"

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarImage src="/avatars/01.png" alt={fullName} />
              <AvatarFallback className="text-2xl">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">{fullName}</CardTitle>
              <CardDescription className="text-base">{user?.email}</CardDescription>
            </div>
            <Button render={<Link href="/profile/update" />} variant="outline" className="md:ml-auto" nativeButton={false}>
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">First Name</p>
                <p className="font-medium">{user?.firstName || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Middle Name</p>
                <p className="font-medium">{user?.middleName || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                <p className="font-medium">{user?.lastName || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Suffix</p>
                <p className="font-medium">{user?.suffix || "—"}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Account Security</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button render={<Link href="/profile/update-email" />} variant="secondary" nativeButton={false}>
                Update Email
              </Button>
              <Button render={<Link href="/profile/update-password" />} variant="secondary" nativeButton={false}>
                Update Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
