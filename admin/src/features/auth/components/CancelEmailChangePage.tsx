import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

export default function CancelEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No cancellation token provided.');
      return;
    }

    if (hasRequested.current) return;
    hasRequested.current = true;

    const cancelRequest = async () => {
      try {
        await apiClient.post('/admin/auth/email/cancel', { token });
        setStatus('success');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error?.response?.data?.errors?.[0]?.detail || 'Failed to cancel the email change request. The link may have expired or is invalid.');
      }
    };

    cancelRequest();
  }, [token]);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Cancel Email Change
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'loading' ? 'Processing your request...' : 
           status === 'success' ? 'Request Cancelled' : 'Cancellation Failed'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md text-sm">
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
  );
}
