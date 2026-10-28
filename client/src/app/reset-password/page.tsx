import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Card, CardContent } from "@/components/ui/card"

export const unstable_instant = {
  prefetch: "static",
  samples: [{ searchParams: { token: "sample-token" } }],
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">Loading...</CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
