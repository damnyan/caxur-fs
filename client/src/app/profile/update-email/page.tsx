"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function UpdateEmailPage() {
  const router = useRouter()

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock update
    router.push("/profile")
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Change Email</h1>
      </div>

      <form onSubmit={handleUpdate}>
        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Update the email address associated with your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input id="currentEmail" value="john.doe@example.com" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input id="newEmail" type="email" placeholder="new.email@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Confirm Password</Label>
              <PasswordInput id="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button render={<Link href="/profile" />} variant="ghost" nativeButton={false}>
              Cancel
            </Button>
            <Button type="submit">Update Email</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
