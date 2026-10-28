import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UpdateProfileForm } from "@/components/profile/update-profile-form"

export const unstable_instant = { prefetch: "static" }

export default function UpdateProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <UpdateProfileForm />
    </div>
  )
}
