import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6 bg-background">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Welcome back, {user?.firstName}. Here's an overview of the portal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">128</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC]">
              +4 this month
            </span>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Active Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">5</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FBF3DB] text-[#956400] dark:bg-[#956400]/20 dark:text-[#FBF3DB]">
              No modifications
            </span>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif tracking-tight text-foreground">Operational</div>
            <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] dark:bg-[#346538]/20 dark:text-[#EDF3EC]">
              All systems online
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
