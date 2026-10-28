import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const unstable_instant = { prefetch: "static" }

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <ForgotPasswordForm />
    </div>
  )
}
