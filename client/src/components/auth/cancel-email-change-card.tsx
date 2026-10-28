"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { fetchApi } from "@/lib/api-client"
import { config } from "@/lib/config"
import { useAuthStore } from "@/lib/auth-store"
import { logoutAction } from "@/app/actions/auth"

export function CancelEmailChangeCard() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const logout = useAuthStore((state) => state.logout)

  const [requestState, setRequestState] = useState<{
    token: string | null
    status: "loading" | "success" | "error"
    errorMessage: string
  }>({
    token: null,
    status: "loading",
    errorMessage: "",
  })
  const hasRequested = useRef<string | null>(null)

  useEffect(() => {
    if (!token) return

    if (hasRequested.current === token) return
    hasRequested.current = token

    const cancelRequest = async () => {
      try {
        const response = await fetchApi(`${config.apiUrl}/api/v1/auth/email/cancel`, {
          method: "POST",
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(
            data.errors?.[0]?.detail ||
              "Failed to cancel the email change request. The link may have expired or is invalid."
          )
        }

        await logoutAction()
        logout()
        setRequestState({
          token,
          status: "success",
          errorMessage: "",
        })
      } catch (error: unknown) {
        setRequestState({
          token,
          status: "error",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to cancel the email change request.",
        })
      }
    }

    cancelRequest()
  }, [token, logout])

  const status: "loading" | "success" | "error" = !token
    ? "error"
    : requestState.token === token
      ? requestState.status
      : "loading"

  const errorMessage = !token
    ? "No cancellation token provided."
    : requestState.token === token
      ? requestState.errorMessage
      : ""

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Cancel Email Change
        </CardTitle>
        <CardDescription className="text-center">
          {status === "loading"
            ? "Processing your request..."
            : status === "success"
              ? "Request Cancelled"
              : "Cancellation Failed"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md text-sm">
              The email change request has been successfully cancelled. Your account remains secure.
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="text-center space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md text-sm">
              {errorMessage}
            </div>
          </div>
        ) : null}
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
