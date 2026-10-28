import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UpdateEmailForm } from "@/components/profile/update-email-form"

export const unstable_instant = { prefetch: "static" }

export default function UpdateEmailPage() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Change Email</h1>
      </div>

      <UpdateEmailForm />
    </div>
  )
}
