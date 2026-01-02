import { useEffect } from 'react';
import { useAuthStore } from '../../contexts/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, login } = useAuthStore();

  useEffect(() => {
    // Auto-login for development if not already authenticated
    if (!isAuthenticated && !isLoading) {
      login();
    }
  }, [isAuthenticated, isLoading, login]);

  // Show loading spinner while logging in
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}