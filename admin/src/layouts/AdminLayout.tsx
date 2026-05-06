import { useEffect } from 'react';
import { Outlet, Navigate, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Users, Shield, UserCircle, LogOut } from 'lucide-react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { apiClient } from '@/lib/api';

export default function AdminLayout() {
  const { isAuthenticated, user, updateUser, logout, refreshToken } = useAuthStore();

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
    <div className="h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Admin Portal
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
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || (user as any).name || 'Administrator') : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
              {user?.roles && user.roles.length > 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate uppercase tracking-wider mt-0.5 font-semibold">
                  {user.roles.map((r) => r.name).join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-4">
          <span className="text-xl font-bold">Admin Portal</span>
          <button onClick={handleLogout} className="p-2 text-gray-500">
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
