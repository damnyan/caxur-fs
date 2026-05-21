"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { fetchApi } from "@/lib/api-client"
import { config } from "@/lib/config"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const initiateSchema = z.object({
  newEmail: z.string().min(1, "New email is required").email("Invalid email format"),
  currentPassword: z.string().min(1, "Current password is required"),
})

type InitiateValues = z.infer<typeof initiateSchema>

const verifySchema = z.object({
  otp: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Verification code must be numeric"),
})

type VerifyValues = z.infer<typeof verifySchema>

export default function UpdateEmailPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [isInitiating, setIsInitiating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isWaitingForOtp, setIsWaitingForOtp] = useState(false)
  const [error, setError] = useState("")

  const initiateForm = useForm<InitiateValues>({
    resolver: zodResolver(initiateSchema),
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    },
  })

  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      otp: "",
    },
  })

  const handleInitiate = async (values: InitiateValues) => {
    setError("")
    
    if (values.newEmail === user?.email) {
      setError("New email cannot be the same as your current email.")
      return
    }

    setIsInitiating(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile/email/initiate`, {
        method: "POST",
        body: JSON.stringify({ 
          currentPassword: values.currentPassword, 
          newEmail: values.newEmail 
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.detail || "Failed to initiate email change")
      }

      setIsWaitingForOtp(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsInitiating(false)
    }
  }

  const handleVerify = async (values: VerifyValues) => {
    setError("")
    setIsVerifying(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile/email/verify`, {
        method: "POST",
        body: JSON.stringify({ otp: values.otp })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.errors?.[0]?.detail || "Failed to verify email change")
      }

      // Fetch updated user data
      const profileRes = await fetchApi(`${config.apiUrl}/api/v1/my/profile`)
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUser(profileData.data.attributes)
      }
      
      router.push("/profile")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Change Email</h1>
      </div>

      {!isWaitingForOtp ? (
        <form onSubmit={initiateForm.handleSubmit(handleInitiate)}>
          <Card>
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Update the email address associated with your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="currentEmail">Current Email</Label>
                <Input id="currentEmail" value={user?.email || ""} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input 
                  id="newEmail" 
                  type="email" 
                  placeholder="new.email@example.com" 
                  className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
                  {...initiateForm.register("newEmail")}
                />
                {initiateForm.formState.errors.newEmail && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {initiateForm.formState.errors.newEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Current Password</Label>
                <PasswordInput 
                  id="password" 
                  className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
                  {...initiateForm.register("currentPassword")}
                />
                {initiateForm.formState.errors.currentPassword && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {initiateForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t px-6 py-4 bg-gray-50/50">
              <Button render={<Link href="/profile" />} variant="ghost" nativeButton={false} disabled={isInitiating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInitiating}>
                {isInitiating ? "Sending Code..." : "Send Verification Code"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <form onSubmit={verifyForm.handleSubmit(handleVerify)} autoComplete="off">
          {/* Hidden field to trap aggressive browser autofill */}
          <input type="email" name="email" className="hidden" aria-hidden="true" tabIndex={-1} autoComplete="username" />
          <Card>
            <CardHeader>
              <CardTitle>Verify New Email</CardTitle>
              <CardDescription>We've sent a 6-digit verification code to your new email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input 
                  id="otp" 
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="123456" 
                  maxLength={6} 
                  autoComplete="one-time-code"
                  data-1p-ignore="true" 
                  data-lpignore="true"
                  className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
                  {...verifyForm.register("otp")}
                />
                {verifyForm.formState.errors.otp && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {verifyForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t px-6 py-4 bg-gray-50/50">
              <Button type="button" variant="ghost" onClick={() => setIsWaitingForOtp(false)} disabled={isVerifying}>
                Cancel
              </Button>
              <Button type="submit" disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify & Update"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}
