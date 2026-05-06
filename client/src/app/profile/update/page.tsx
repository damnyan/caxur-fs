"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { config } from "@/lib/config"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { handleApiErrors } from "@/lib/utils/api-errors"

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

export default function UpdateProfilePage() {
  const router = useRouter()
  const { token, user, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      middleName: user?.middleName || "",
      lastName: user?.lastName || "",
      suffix: user?.suffix || "",
    },
  })

  // Sync form with user state when it loads
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        suffix: user.suffix || "",
      })
    }
  }, [user, reset])

  const onSubmit = async (values: ProfileValues) => {
    if (!token) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/api/v1/profile`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
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

      setUser(data.data.attributes)
      toast.success("Profile updated successfully!")
      router.push("/profile")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button render={<Link href="/profile" />} variant="ghost" size="sm" nativeButton={false}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle name (optional)</Label>
                <Input id="middleName" {...register("middleName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix (optional)</Label>
                <Input id="suffix" {...register("suffix")} placeholder="Jr., III" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button render={<Link href="/profile" />} variant="ghost" nativeButton={false} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
