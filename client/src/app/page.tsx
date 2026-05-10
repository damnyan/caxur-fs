import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ContactForm } from "@/components/home/contact-form"

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Caxur-FS"

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Welcome to {appName}
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
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  )
}
