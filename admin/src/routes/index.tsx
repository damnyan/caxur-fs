import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ErrorPage from '@/components/ErrorPage';
import ProtectedRoute from '@/components/ProtectedRoute';

const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));
const SetPasswordPage = lazy(() => import('@/features/auth/components/SetPasswordPage'));
const CancelEmailChangePage = lazy(() => import('@/features/auth/components/CancelEmailChangePage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/components/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'));
const AdministratorsPage = lazy(() => import('@/features/administrators/components/AdministratorsPage'));
const RolesPage = lazy(() => import('@/features/roles/components/RolesPage'));
const UsersPage = lazy(() => import('@/features/users/components/UsersPage'));
const ProfilePage = lazy(() => import('@/features/profile/components/ProfilePage'));

function RouteLoader({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center py-16 text-muted-foreground font-mono text-xs uppercase tracking-widest"
        >
          Loading...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <RouteLoader>
            <DashboardPage />
          </RouteLoader>
        ),
      },
      {
        element: <ProtectedRoute requiredPermission="administrator_management" />,
        children: [
          {
            path: 'administrators',
            element: (
              <RouteLoader>
                <AdministratorsPage />
              </RouteLoader>
            ),
          },
          {
            path: 'users',
            element: (
              <RouteLoader>
                <UsersPage />
              </RouteLoader>
            ),
          },
        ],
      },
      {
        element: <ProtectedRoute requiredPermission="role_management" />,
        children: [
          {
            path: 'roles',
            element: (
              <RouteLoader>
                <RolesPage />
              </RouteLoader>
            ),
          },
        ],
      },
      {
        path: 'profile',
        element: (
          <RouteLoader>
            <ProfilePage />
          </RouteLoader>
        ),
      },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'login',
        element: (
          <RouteLoader>
            <LoginPage />
          </RouteLoader>
        ),
      },
      {
        path: 'set-password',
        element: (
          <RouteLoader>
            <SetPasswordPage />
          </RouteLoader>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <RouteLoader>
            <ForgotPasswordPage />
          </RouteLoader>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <RouteLoader>
            <ResetPasswordPage />
          </RouteLoader>
        ),
      },
      {
        path: 'auth/cancel-email-change',
        element: (
          <RouteLoader>
            <CancelEmailChangePage />
          </RouteLoader>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
