import { Suspense } from "react"
import { CancelEmailChangeCard } from "@/components/auth/cancel-email-change-card"

export const unstable_instant = {
  prefetch: "static",
  samples: [{ searchParams: { token: "sample-token" } }],
}

export default function CancelEmailChangePage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <Suspense
          fallback={
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <CancelEmailChangeCard />
        </Suspense>
      </div>
    </div>
  )
}
