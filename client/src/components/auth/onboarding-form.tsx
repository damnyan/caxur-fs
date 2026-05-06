"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { config } from "@/lib/config"
import { useAuthStore } from "@/lib/auth-store"
import { handleApiErrors } from "@/lib/utils/api-errors"

const onboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
  const router = useRouter()
  const { token, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
    },
  })

  const onSubmit = async (values: OnboardingValues) => {
    if (!token) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/api/v1/profile/onboarding`, {
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
          throw new Error(data.errors?.[0]?.detail || "Onboarding failed")
        }
        return
      }

      // Update user in store (data.data.attributes contains user profile)
      setUser(data.data.attributes)

      toast.success("Profile completed successfully!")
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg border-primary/20 shadow-2xl bg-card/50 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold tracking-tight text-center bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Complete Your Profile
        </CardTitle>
        <CardDescription className="text-center text-lg">
          Please provide your personal information to get started
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              {...register("firstName")}
            />
            {errors.firstName && <p className="text-xs font-medium text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName" className="text-sm font-semibold">Middle Name (optional)</Label>
            <Input
              id="middleName"
              placeholder="Quincy"
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              {...register("middleName")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              {...register("lastName")}
            />
            {errors.lastName && <p className="text-xs font-medium text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="suffix" className="text-sm font-semibold">Suffix (optional)</Label>
            <Input
              id="suffix"
              placeholder="Jr., III"
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              {...register("suffix")}
            />
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button type="submit" className="w-full h-12 text-lg font-semibold transition-all hover:scale-[1.01]" disabled={isLoading}>
            {isLoading ? "Saving..." : "Complete Setup"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
