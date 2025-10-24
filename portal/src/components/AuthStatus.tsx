import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStatus } from '@/hooks/useAuthStatus';

export function AuthStatus() {
  const { isAuthenticated, isLoading, error } = useAuthStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600">
        <AlertCircle className="h-4 w-4" />
        <span>Limited functionality</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4" />
      <span>Offline</span>
    </div>
  );
}
