import { cacheLife, cacheTag } from "next/cache"
import { config } from "@/lib/config"

async function getFooterMetadata(): Promise<{ apiVersion: string; currentYear: number }> {
  "use cache"
  cacheLife("minutes")
  cacheTag("api-health")

  let apiVersion = "unknown"
  try {
    const res = await fetch(`${config.apiUrl}/health`)
    if (res.ok) {
      const data = await res.json()
      apiVersion = data.version || "unknown"
    }
  } catch (err: unknown) {
    const errorObj = err as { cause?: { code?: string }; code?: string; message?: string }
    const code = errorObj?.cause?.code || errorObj?.code
    if (code === "ECONNREFUSED") {
      // Subtle warning to keep terminal output clean during startup compiling phase
      console.warn(`[API Offline] Backend is booting or unreachable at ${config.apiUrl}`)
    } else {
      console.warn(`Failed to query API version in footer: ${errorObj?.message || String(err)}`)
    }
  }

  return {
    apiVersion,
    currentYear: new Date().getFullYear(),
  }
}

export async function Footer() {
  const appName = config.appName
  const { apiVersion, currentYear } = await getFooterMetadata()

  return (
    <footer className="border-t bg-muted/40 py-8 md:py-12">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-2 items-center md:items-start">
          <span className="font-bold">
            {appName}{" "}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              v{process.env.NEXT_PUBLIC_APP_VERSION} (API: v{apiVersion})
            </span>
          </span>
          <p className="text-sm text-muted-foreground">
            Building the future, today.
          </p>
        </div>
        <p className="text-sm text-muted-foreground text-center md:text-right">
          &copy; {currentYear} {appName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
