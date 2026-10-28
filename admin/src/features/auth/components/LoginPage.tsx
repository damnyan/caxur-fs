import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, getApiErrorMessage } from '@/lib/api';
import { fetchMyProfile } from '@/features/profile/api/profile';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHealth } from '@/hooks/useHealth';
import type { JsonApiResponse } from '@/types/jsonapi';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginAttributes {
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  useDocumentTitle('Sign In');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const { data: healthData, isLoading: isHealthLoading, isError: isHealthError } = useHealth();
  const apiStatus: 'loading' | 'online' | 'offline' = isHealthLoading
    ? 'loading'
    : isHealthError || !healthData?.version
    ? 'offline'
    : 'online';
  const apiVersion = isHealthLoading
    ? 'Loading...'
    : apiStatus === 'online' && healthData?.version
    ? `v${healthData.version}`
    : 'Offline';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<JsonApiResponse<LoginAttributes>>('/admin/auth/login', {
        ...data,
        email: data.email.trim().toLowerCase(),
      });

      const attributes = response.data.data.attributes;
      const accessToken = attributes.accessToken;
      const refreshToken = attributes.refreshToken;

      // Temporarily set tokens to use apiClient for fetching profile
      useAuthStore.getState().setToken(accessToken, refreshToken);

      // Fetch actual user profile
      const user = await fetchMyProfile();

      login(user, accessToken, refreshToken);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred during login'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access the admin portal
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground/60 tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Admin v{import.meta.env.VITE_APP_VERSION || '0.0.0'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              apiStatus === 'loading'
                ? 'bg-amber-500 animate-pulse'
                : apiStatus === 'online'
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-red-500 animate-pulse'
            }`}
          />
          <span>API {apiVersion}</span>
        </div>
      </div>
    </div>
  );
}
