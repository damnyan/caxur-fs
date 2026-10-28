import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, getApiErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/store/authStore';

export default function CancelEmailChangePage() {
  useDocumentTitle('Cancel Email Change');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  const { isPending, isSuccess, isError, error } = useQuery({
    queryKey: ['cancel-email-change', token],
    queryFn: async () => {
      await apiClient.post('/admin/auth/email/cancel', { token });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'cancel-email-change',
      });
      logout();
      return true;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  const status: 'loading' | 'success' | 'error' = !token
    ? 'error'
    : isPending
    ? 'loading'
    : isSuccess
    ? 'success'
    : isError
    ? 'error'
    : 'loading';

  const errorMessage = !token
    ? 'No cancellation token provided.'
    : error
    ? getApiErrorMessage(error, 'Failed to cancel the email change request. The link may have expired or is invalid.')
    : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-center">
              Cancel Email Change
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'loading'
                ? 'Processing your request...'
                : status === 'success'
                ? 'Request Cancelled'
                : 'Cancellation Failed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md text-sm">
                  The email change request has been successfully cancelled. Your account remains secure.
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md text-sm">
                  {errorMessage}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
            <div className="text-center text-sm text-gray-500 mt-2">
              If you believe your account is compromised, please contact support immediately.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
