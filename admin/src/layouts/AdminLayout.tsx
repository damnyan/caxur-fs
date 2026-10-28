import { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Users, UserCheck, Shield, UserCircle, LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useHealth } from '@/hooks/useHealth';
import { fetchMyProfile } from '@/features/profile/api/profile';
import { apiClient } from '@/lib/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'Caxur-FS Admin';

export default function AdminLayout() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { isAuthenticated, user, updateUser, logout, refreshToken } = useAuthStore();
  const [mobileNavState, setMobileNavState] = useState<{ pathname: string; open: boolean }>({
    pathname: '',
    open: false,
  });
  const mobileNavOpen =
    mobileNavState.pathname === location.pathname ? mobileNavState.open : false;
  const setMobileNavOpen = (open: boolean) => {
    setMobileNavState({ pathname: location.pathname, open });
  };

  const { data: healthData } = useHealth();
  const apiVersion = healthData?.version ?? '';

  const { data: profileData } = useQuery({
    queryKey: ['admin', 'my-profile', user?.id],
    queryFn: fetchMyProfile,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (profileData) {
      updateUser(profileData);
    }
  }, [profileData, updateUser]);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await apiClient.post('/admin/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout failed', error);
      }
    }
    queryClient.clear();
    logout();
  };

  useIdleTimeout(handleLogout, 15 * 60 * 1000); // 15 minutes

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Administrators', path: '/administrators', icon: Users, permission: 'administrator_management' },
    { name: 'Users', path: '/users', icon: UserCheck, permission: 'administrator_management' },
    { name: 'Roles', path: '/roles', icon: Shield, permission: 'role_management' },
    { name: 'Profile', path: '/profile', icon: UserCircle },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (!user) return false;
    return user.permissions?.includes('*') || user.permissions?.includes(permission);
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Administrator'
    : '';

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#FBFBFA] dark:bg-[#111111] border-r border-border flex flex-col hidden md:flex">
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link to="/" className="font-serif text-xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav aria-label="Sidebar" className="px-3 space-y-1">
            {navItems.filter((item) => hasPermission(item.permission)).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-mono uppercase tracking-wider rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#F4F3EC] text-[#111111] dark:bg-[#1E1E1E] dark:text-[#F5F5F5]'
                        : 'text-muted-foreground hover:bg-[#F4F3EC]/50 hover:text-foreground dark:hover:bg-[#1E1E1E]/50 dark:hover:text-foreground'
                    }`
                  }
                >
                  <Icon className="mr-3 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-border bg-[#F4F3EC]/20 dark:bg-[#1E1E1E]/20">
          <div className="flex items-center w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {user?.email}
                </p>
                <span className="text-[10px] text-muted-foreground font-mono tracking-tight tabular-nums">
                  UI: v{import.meta.env.VITE_APP_VERSION} {apiVersion && `| API: v${apiVersion}`}
                </span>
              </div>
              {user?.roles && user.roles.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-1 font-mono font-semibold">
                  {user.roles.map((r) => r.name).join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-[#F4F3EC] dark:hover:bg-[#1E1E1E] rounded-md transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background focus:outline-none">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#FBFBFA] dark:bg-[#111111] border-b border-border h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-[#F4F3EC] dark:hover:bg-[#1E1E1E] rounded-md transition-colors"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </button>
                }
              />
              <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between bg-[#FBFBFA] dark:bg-[#111111] border-r border-border">
                <SheetHeader className="h-16 flex flex-row items-center px-6 border-b border-border space-y-0">
                  <SheetTitle className="font-serif text-xl font-bold tracking-tight text-foreground">
                    {APP_NAME}
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4">
                  <nav aria-label="Mobile" className="px-3 space-y-1">
                    {navItems.filter((item) => hasPermission(item.permission)).map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          onClick={() => setMobileNavOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center px-3 py-2 text-sm font-mono uppercase tracking-wider rounded-md transition-colors ${
                              isActive
                                ? 'bg-[#F4F3EC] text-[#111111] dark:bg-[#1E1E1E] dark:text-[#F5F5F5]'
                                : 'text-muted-foreground hover:bg-[#F4F3EC]/50 hover:text-foreground dark:hover:bg-[#1E1E1E]/50 dark:hover:text-foreground'
                            }`
                          }
                        >
                          <Icon className="mr-3 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          {item.name}
                        </NavLink>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-4 border-t border-border bg-[#F4F3EC]/20 dark:bg-[#1E1E1E]/20">
                  <div className="flex items-center w-full">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {displayName}
                      </p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {user?.email}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono tracking-tight tabular-nums">
                          UI: v{import.meta.env.VITE_APP_VERSION} {apiVersion && `| API: v${apiVersion}`}
                        </span>
                      </div>
                      {user?.roles && user.roles.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-1 font-mono font-semibold">
                          {user.roles.map((r) => r.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileNavOpen(false);
                        handleLogout();
                      }}
                      className="ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-[#F4F3EC] dark:hover:bg-[#1E1E1E] rounded-md transition-colors"
                      title="Logout"
                      aria-label="Logout"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="font-serif text-xl font-bold tracking-tight text-foreground">
              {APP_NAME}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-[#F4F3EC] dark:hover:bg-[#1E1E1E] rounded-md transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
