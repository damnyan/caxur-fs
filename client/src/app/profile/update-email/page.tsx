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

export default function UpdateEmailPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [isInitiating, setIsInitiating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isWaitingForOtp, setIsWaitingForOtp] = useState(false)
  const [error, setError] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [otp, setOtp] = useState("")

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (newEmail === user?.email) {
      setError("New email cannot be the same as your current email.")
      return
    }

    setIsInitiating(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile/email/initiate`, {
        method: "POST",
        body: JSON.stringify({ currentPassword, newEmail })
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsVerifying(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile/email/verify`, {
        method: "POST",
        body: JSON.stringify({ otp })
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
        <form onSubmit={handleInitiate}>
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
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Current Password</Label>
                <PasswordInput 
                  id="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required 
                />
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
        <form onSubmit={handleVerify} autoComplete="off">
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
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  data-1p-ignore="true" 
                  data-lpignore="true"
                  required 
                />
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
