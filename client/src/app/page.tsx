"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Welcome to Acme Corp
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Building the future of digital experiences. Secure, fast, and beautiful.
              </p>
            </div>
            <div className="space-x-4">
              <Button render={<Link href="/login" />} size="lg" nativeButton={false}>
                Get Started
              </Button>
              <Button render={<Link href="#about" />} variant="outline" size="lg" nativeButton={false}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">About Us</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                We are a team of passionate individuals dedicated to creating the best tools for our users. 
                Our mission is to simplify the complex and make technology accessible to everyone.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-lg bg-card text-card-foreground shadow-sm">
                <h3 className="text-xl font-bold">Innovation</h3>
                <p className="text-muted-foreground text-center">Pushing the boundaries of what is possible every single day.</p>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-lg bg-card text-card-foreground shadow-sm">
                <h3 className="text-xl font-bold">Quality</h3>
                <p className="text-muted-foreground text-center">Delivering robust, reliable, and premium experiences.</p>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-lg bg-card text-card-foreground shadow-sm">
                <h3 className="text-xl font-bold">Security</h3>
                <p className="text-muted-foreground text-center">Keeping your data safe with industry-leading practices.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50 border-t">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Contact Us</h2>
              <p className="text-muted-foreground md:text-xl">
                Have questions? We'd love to hear from you.
              </p>
            </div>
            <form className="space-y-4 text-left" onSubmit={(e) => e.preventDefault()}>
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
          </div>
        </div>
      </section>
    </div>
  )
}
