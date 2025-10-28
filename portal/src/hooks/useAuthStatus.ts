import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuthStatus(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Check if we have session info in localStorage
        const sessionInfo = localStorage.getItem('frappe_session');
        if (sessionInfo) {
          const session = JSON.parse(sessionInfo);
          if (session.user === 'Guest' && session.csrf_token) {
            setStatus({
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return;
          }
        }
        
        // If no session, try to authenticate
        const { bootstrapFrappeUiAuth } = await import('@/lib/frappe-auth');
        const authSuccess = await bootstrapFrappeUiAuth();
        
        if (authSuccess) {
          setStatus({
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          toast.success('Authentication successful');
        } else {
          setStatus({
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication failed'
          });
          toast.warning('Authentication failed - some features may not work');
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        setStatus({
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        toast.error('Authentication error - please refresh the page');
      }
    };

    checkAuthStatus();
  }, []);

  return status;
}


