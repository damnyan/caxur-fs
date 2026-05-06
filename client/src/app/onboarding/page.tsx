import { OnboardingForm } from "@/components/auth/onboarding-form"

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <OnboardingForm />
    </div>
  )
}
