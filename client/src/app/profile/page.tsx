import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/avatars/01.png" alt="@johndoe" />
              <AvatarFallback className="text-2xl">JD</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">John Doe</CardTitle>
              <CardDescription>john.doe@example.com</CardDescription>
            </div>
            <Button render={<Link href="/profile/update" />} variant="outline" className="ml-auto" nativeButton={false}>
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p>John Doe</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Bio</p>
                <p>Full-stack developer building the future.</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Account Settings</h3>
            <div className="flex flex-col gap-2 md:flex-row">
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
