import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import ErrorPage from './components/ErrorPage';

import LoginPage from './features/auth/components/LoginPage';
import SetPasswordPage from './features/auth/components/SetPasswordPage';
import DashboardPage from './features/dashboard/components/DashboardPage';
import AdministratorsPage from './features/administrators/components/AdministratorsPage';
import RolesPage from './features/roles/components/RolesPage';
import ProfilePage from './features/profile/components/ProfilePage';

// Create a client
const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'administrators',
        element: <AdministratorsPage />,
      },
      {
        path: 'roles',
        element: <RolesPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'set-password',
        element: <SetPasswordPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
