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

import { fetchApi } from "@/lib/api-client"

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  facePhoto: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

export default function UpdateProfilePage() {
  const router = useRouter()
  const { token, user, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.facePhotoUrl || null)
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      middleName: user?.middleName || "",
      lastName: user?.lastName || "",
      suffix: user?.suffix || "",
      facePhoto: user?.facePhoto || "",
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
        facePhoto: user.facePhoto || "",
      })
      setPreviewUrl(user.facePhotoUrl || null)
    }
  }, [user, reset])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 5MB
    const maxLimit = 5 * 1024 * 1024
    if (file.size > maxLimit) {
      toast.error("File size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setIsUploading(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.errors?.[0]?.detail || "Upload failed")
      }

      const uploaded = data.data.attributes
      setValue("facePhoto", uploaded.facePhoto)
      setPreviewUrl(uploaded.facePhotoUrl)
      toast.success("Photo uploaded successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo")
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (values: ProfileValues) => {
    if (!token) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetchApi(`${config.apiUrl}/api/v1/profile`, {
        method: "PATCH",
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
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4 mb-6 sm:flex-row">
              <div className="relative h-20 w-20 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Face Photo Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs text-muted-foreground">No Photo</div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center text-[10px] font-semibold">
                    Uploading...
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="face-photo-input" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 shadow-sm">
                    {previewUrl ? "Change Photo" : "Upload Face Photo"}
                  </div>
                </Label>
                <input
                  id="face-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, WEBP. Max size: 5MB.</p>
              </div>
            </div>

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
