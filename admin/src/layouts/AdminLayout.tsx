import { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Users, Shield, UserCircle, LogOut } from 'lucide-react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { apiClient } from '@/lib/api';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'Caxur-FS Admin';

export default function AdminLayout() {
  const { isAuthenticated, user, updateUser, logout, refreshToken } = useAuthStore();
  const [apiVersion, setApiVersion] = useState<string>('');

  useEffect(() => {
    const healthUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '/health');
    fetch(healthUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data?.version) {
          setApiVersion(data.version);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch API version:', err);
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/admin/my/profile')
        .then((response) => {
          const profileAttrs = response.data.data.attributes;
          const profileId = response.data.data.id;
          const permissions = response.data.meta?.permissions || [];
          
          let roles: any[] = [];
          if (response.data.included) {
            roles = response.data.included
              .filter((inc: any) => inc.type === 'roles')
              .map((role: any) => ({
                id: role.id,
                name: role.attributes.name,
              }));
          }

          updateUser({
            id: profileId,
            email: profileAttrs.email,
            firstName: profileAttrs.firstName,
            middleName: profileAttrs.middleName,
            lastName: profileAttrs.lastName,
            suffix: profileAttrs.suffix,
            contactNumber: profileAttrs.contactNumber,
            roles,
            permissions,
          });
        })
        .catch((error) => {
          console.error('Failed to fetch profile', error);
          // Don't logout here to avoid infinite loops if it's a temporary error,
          // but if it's 401/403, the interceptor will handle the logout anyway.
        });
    }
  }, [isAuthenticated, updateUser]);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await apiClient.post('/admin/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout failed', error);
      }
    }
    logout();
  };

  useIdleTimeout(handleLogout, 15 * 60 * 1000); // 15 minutes

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Administrators', path: '/administrators', icon: Users, permission: 'administrator_management' },
    { name: 'Roles', path: '/roles', icon: Shield, permission: 'role_management' },
    { name: 'Profile', path: '/profile', icon: UserCircle },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (!user) return false;
    return user.permissions?.includes('*') || user.permissions?.includes(permission);
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FBFBFA] dark:bg-[#111111] border-r border-border flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="font-serif text-xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navItems.filter(item => hasPermission(item.permission)).map((item) => {
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
                {user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || (user as any).name || 'Administrator') : ''}
              </p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {user?.email}
                </p>
                <span className="text-[10px] text-muted-foreground font-mono tracking-tight">
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
              onClick={handleLogout}
              className="ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-[#F4F3EC] dark:hover:bg-[#1E1E1E] rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#FBFBFA] dark:bg-[#111111] border-b border-border h-16 flex items-center justify-between px-4">
          <span className="font-serif text-xl font-bold">{APP_NAME}</span>
          <button onClick={handleLogout} className="p-2 text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
