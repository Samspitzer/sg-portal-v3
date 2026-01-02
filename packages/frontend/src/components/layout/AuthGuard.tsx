import { useEffect } from 'react';
import { useAuthStore } from '../../contexts/authStore';
import type { Permission } from '@sg-portal/shared';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const { isAuthenticated, isLoading, login, user } = useAuthStore();

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

  // Check permission if required
  if (requiredPermission && user) {
    const hasPermission = user.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}