export function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-8 md:py-12">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-2 items-center md:items-start">
          <span className="font-bold">Acme Corp</span>
          <p className="text-sm text-muted-foreground">
            Building the future, today.
          </p>
        </div>
        <p className="text-sm text-muted-foreground text-center md:text-right">
          &copy; {new Date().getFullYear()} Acme Corp. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
