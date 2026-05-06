"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function UpdateProfilePage() {
  const router = useRouter()

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock update: redirect back to profile
    router.push("/profile")
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <form onSubmit={handleUpdate}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" defaultValue="John" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" defaultValue="Doe" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea 
                id="bio"
                defaultValue="Full-stack developer building the future."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button render={<Link href="/profile" />} variant="ghost" nativeButton={false}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
