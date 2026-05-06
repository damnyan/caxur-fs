"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

const verifySchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
})

type VerifyValues = z.infer<typeof verifySchema>

export function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const { setToken, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push("/register")
    }
  }, [email, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      otp: "",
    },
  })

  const onSubmit = async (values: VerifyValues) => {
    if (!email) return

    setIsLoading(true)
    try {
      const response = await fetch(`${config.apiUrl}/api/v1/auth/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: values.otp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.detail || "Verification failed")
      }

      // Store token and user
      const { accessToken, user } = data.data.attributes
      setToken(accessToken)
      if (user) setUser(user)

      toast.success("Account verified successfully!")
      router.push("/onboarding")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold tracking-tight text-center bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Verify Email
        </CardTitle>
        <CardDescription className="text-center text-lg">
          Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-semibold">Verification Code</Label>
            <Input
              id="otp"
              placeholder="123456"
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/30 text-center text-2xl tracking-[0.5em] h-14"
              maxLength={6}
              {...register("otp")}
            />
            {errors.otp && <p className="text-xs font-medium text-destructive">{errors.otp.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button type="submit" className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify Account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
