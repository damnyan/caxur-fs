import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { fetchServerApi } from "@/lib/api-server"

export const unstable_instant = {
  prefetch: "static",
  samples: [{ cookies: [{ name: "accessToken", value: null }] }],
}

function ProfileCardSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading profile details">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-48 rounded bg-muted animate-pulse mx-auto md:mx-0" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse mx-auto md:mx-0" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-5 w-36 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function ProfileDetails() {
  const response = await fetchServerApi("/api/v1/my/profile")

  if (!response.ok) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground italic">Failed to load profile. Please try logging in again.</p>
      </div>
    )
  }

  const data = await response.json()
  const user = data.data.attributes

  const fullName = user?.firstName
    ? `${user.firstName} ${user.middleName ? user.middleName + " " : ""}${user.lastName}${user.suffix ? " " + user.suffix : ""}`
    : "Not set"

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <Avatar className="h-24 w-24 border-2 border-primary/10">
            {user?.facePhotoUrl ? (
              <AvatarImage src={user.facePhotoUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {user?.firstName?.[0] || ""}
              {user?.lastName?.[0] || ""}
            </AvatarFallback>
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
  )
}

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>
      <Suspense fallback={<ProfileCardSkeleton />}>
        <ProfileDetails />
      </Suspense>
    </div>
  )
}
