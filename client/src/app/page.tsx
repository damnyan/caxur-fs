import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ContactForm } from "@/components/home/contact-form"

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Caxur-FS"

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/20">
        {/* Soft Ambient Radial Light */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(circle_at_top_right,_var(--color-primary)_0%,_transparent_60%)]" />
        
        <div className="container mx-auto px-4 md:px-8 max-w-5xl relative z-10">
          <div className="flex flex-col items-start space-y-8 max-w-3xl">
            <div className="space-y-4">
              {/* Optional Subtle Monospace Eyebrow */}
              <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {appName} Platform
              </span>
              <h1 className="font-serif text-5xl md:text-7xl tracking-tight leading-[1.05] text-foreground">
                Building the future of digital experiences.
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl pt-2">
                A premium, modular platform crafted for speed, absolute security, and editorial clarity.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button render={<Link href="/login" />} size="lg" nativeButton={false} className="rounded-md shadow-none px-6">
                Get Started
              </Button>
              <Button render={<Link href="#about" />} variant="outline" size="lg" nativeButton={false} className="rounded-md shadow-none px-6">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Us & Bento Features Section */}
      <section id="about" className="w-full py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="flex flex-col items-start space-y-6 mb-16 max-w-2xl">
            <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              About the Platform
            </span>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-foreground">
              A commitment to architectural elegance and utility.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We are a team of passionate developers dedicated to creating tools that simplify the complex. 
              Our mission is to build software that is as reliable as it is pleasant to use.
            </p>
          </div>

          {/* Bento Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 - spans 2 cols */}
            <div className="md:col-span-2 flex flex-col justify-between border border-border p-8 rounded-lg bg-card text-card-foreground shadow-none min-h-[220px]">
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#1F6C9F]/20 dark:text-[#E1F3FE]">
                  Innovation
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Forward-thinking Core</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Utilizing modern Rust Axum backend with Next.js architecture to push the limits of performance and developer experience.
                </p>
              </div>
            </div>

            {/* Box 2 - spans 1 col */}
            <div className="flex flex-col justify-between border border-border p-8 rounded-lg bg-card text-card-foreground shadow-none min-h-[220px]">
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FBF3DB] text-[#956400] dark:bg-[#956400]/20 dark:text-[#FBF3DB]">
                  Quality
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Robust Design</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Delivering clean, error-free interfaces that adhere to the highest standard of UI guidelines.
                </p>
              </div>
            </div>

            {/* Box 3 - spans 1 col */}
            <div className="flex flex-col justify-between border border-border p-8 rounded-lg bg-card text-card-foreground shadow-none min-h-[220px]">
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC]">
                  Security
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Data Protection</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Enforcing strict token-based authorization and rigorous validation contracts across all endpoints.
                </p>
              </div>
            </div>

            {/* Box 4 - spans 2 cols */}
            <div className="md:col-span-2 flex flex-col justify-between border border-border p-8 rounded-lg bg-card text-card-foreground shadow-none min-h-[220px]">
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FDEBEC] text-[#9F2F2D] dark:bg-[#9F2F2D]/20 dark:text-[#FDEBEC]">
                  Compliance
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">JSON:API Standards</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Exposing structured, fully compliant API responses that integrate seamlessly with TypeScript clients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="w-full py-20 md:py-32 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Connect
              </span>
              <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-foreground">
                Start a conversation.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Have questions about integration, security compliance, or system capabilities? Reach out and we will respond within one business day.
              </p>
            </div>
            <div className="border border-border p-8 rounded-lg bg-card shadow-none">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
