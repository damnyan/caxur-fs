import { config } from "@/lib/config"

export async function Footer() {
  const appName = config.appName

  // Query backend API health dynamically on the server side
  let apiVersion = "unknown"
  try {
    const res = await fetch(`${config.apiUrl}/health`, { next: { revalidate: 60 } })
    if (res.ok) {
      const data = await res.json()
      apiVersion = data.version || "unknown"
    }
  } catch (e) {
    console.error("Failed to query API version in footer:", e)
  }

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
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
