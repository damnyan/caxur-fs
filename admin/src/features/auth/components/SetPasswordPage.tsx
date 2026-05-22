import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  useDocumentTitle('Set Password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing verification token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post('/admin/administrators/verify', {
        token,
        password: data.password,
      });
      
      toast.success('Password set successfully. You can now login.');
      navigate('/login');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid or expired token.');
      } else if (err.response?.status === 404) {
        setError('Administrator not found.');
      } else {
        setError('An error occurred while setting the password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-red-500">Error</CardTitle>
          <CardDescription className="text-center">
            Verification token is missing from the URL. Please check your email link.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/login')} className="w-full">
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Set Password</CardTitle>
        <CardDescription className="text-center">
          Create a new password to activate your administrator account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <PasswordInput
              id="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Setting Password...' : 'Set Password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
