"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function ContactForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Message sent successfully! We will get back to you soon.")
  }

  return (
    <form className="space-y-4 text-left" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" placeholder="John" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input id="last-name" placeholder="Doe" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea 
          id="message" 
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="How can we help you?"
          required 
        />
      </div>
      <Button type="submit" className="w-full">Send Message</Button>
    </form>
  )
}
