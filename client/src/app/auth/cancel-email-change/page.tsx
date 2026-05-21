"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { fetchApi } from "@/lib/api-client"
import { config } from "@/lib/config"

function CancelEmailChangeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const hasRequested = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("No cancellation token provided.")
      return
    }

    if (hasRequested.current) return
    hasRequested.current = true

    const cancelRequest = async () => {
      try {
        const response = await fetchApi(`${config.apiUrl}/api/v1/auth/email/cancel`, {
          method: "POST",
          body: JSON.stringify({ token })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.errors?.[0]?.detail || "Failed to cancel the email change request. The link may have expired or is invalid.")
        }

        setStatus("success")
      } catch (error: any) {
        setStatus("error")
        setErrorMessage(error.message)
      }
    }

    cancelRequest()
  }, [token])

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Cancel Email Change
        </CardTitle>
        <CardDescription className="text-center">
          {status === "loading" ? "Processing your request..." : 
           status === "success" ? "Request Cancelled" : "Cancellation Failed"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "loading" && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md text-sm">
              The email change request has been successfully cancelled. Your account remains secure.
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md text-sm">
              {errorMessage}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button render={<Link href="/login" />} className="w-full" nativeButton={false}>
          Return to Login
        </Button>
        <div className="text-center text-sm text-gray-500 mt-2">
          If you believe your account is compromised, please contact support immediately.
        </div>
      </CardFooter>
    </Card>
  )
}

export default function CancelEmailChangePage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <Suspense fallback={<div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <CancelEmailChangeContent />
        </Suspense>
      </div>
    </div>
  )
}
