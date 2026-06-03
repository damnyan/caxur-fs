"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrength } from "@/components/ui/password-strength"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { config } from "@/lib/config"
import { useState } from "react"
import { toast } from "sonner"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { handleApiErrors } from "@/lib/utils/api-errors"
import { fetchApi } from "@/lib/api-client"

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one digit")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.password !== data.currentPassword, {
  message: "New password cannot be the same as the current password",
  path: ["password"],
})

type PasswordValues = z.infer<typeof passwordSchema>

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  })

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" })
  const passwordRegister = register("password")

  const onSubmit = async (values: PasswordValues) => {
    if (!token) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile`, {
        method: "PATCH",
        body: JSON.stringify({ 
          currentPassword: values.currentPassword,
          password: values.password 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 422) {
          handleApiErrors(data, setError)
          toast.error("Please correct the errors in the form")
        } else {
          throw new Error(data.errors?.[0]?.detail || "Update failed")
        }
        return
      }

      toast.success("Password updated successfully!")
      router.push("/profile")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Change Password</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>Verify your current password and choose a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput id="currentPassword" {...register("currentPassword")} />
              {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput 
                id="password" 
                {...passwordRegister} 
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={(e) => {
                  passwordRegister.onBlur(e)
                  setIsPasswordFocused(false)
                }}
              />
              <PasswordStrength value={passwordValue} isFocused={isPasswordFocused} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput id="confirmPassword" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button render={<Link href="/profile" />} variant="ghost" nativeButton={false} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
