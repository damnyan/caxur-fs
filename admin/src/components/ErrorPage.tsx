import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again later.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page Not Found';
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (error.status === 401) {
      title = 'Unauthorized';
      message = "You don't have permission to access this page.";
    } else if (error.status === 503) {
      title = 'Service Unavailable';
      message = "Looks like our API is down. Please try again later.";
    } else {
      title = `${error.status} Error`;
      message = error.statusText || error.data?.message || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white dark:bg-gray-950 p-8 rounded-xl shadow-lg max-w-md w-full flex flex-col items-center border border-gray-200 dark:border-gray-800">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-6">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
