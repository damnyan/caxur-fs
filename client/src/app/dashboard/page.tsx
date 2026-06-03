import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8 bg-background">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">$45,231.89</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC]">
              +20.1% vs last month
            </span>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">+2,350</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC]">
              +180.1% vs last month
            </span>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">+573</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#1F6C9F]/20 dark:text-[#E1F3FE]">
              +201 this hour
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border border-border shadow-none rounded-lg bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl tracking-tight text-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px] flex items-center justify-center border-t border-border bg-muted/10">
            {/* Placeholder for a chart */}
            <p className="text-muted-foreground text-sm font-mono tracking-wide">CHART_PREVIEW</p>
          </CardContent>
        </Card>
        <Card className="col-span-3 border border-border shadow-none rounded-lg bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl tracking-tight text-foreground">Quick Links</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage your account settings.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button render={<Link href="/profile" />} variant="outline" className="justify-start shadow-none rounded-md" nativeButton={false}>
              View Profile
            </Button>
            <Button render={<Link href="/profile/update" />} variant="outline" className="justify-start shadow-none rounded-md" nativeButton={false}>
              Update Profile Info
            </Button>
            <Button render={<Link href="/profile/update-email" />} variant="outline" className="justify-start shadow-none rounded-md" nativeButton={false}>
              Change Email
            </Button>
            <Button render={<Link href="/profile/update-password" />} variant="outline" className="justify-start shadow-none rounded-md" nativeButton={false}>
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
