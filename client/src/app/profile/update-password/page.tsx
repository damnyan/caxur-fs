import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UpdatePasswordForm } from "@/components/profile/update-password-form"

export const unstable_instant = { prefetch: "static" }

export default function UpdatePasswordPage() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Change Password</h1>
      </div>

      <UpdatePasswordForm />
    </div>
  )
}
