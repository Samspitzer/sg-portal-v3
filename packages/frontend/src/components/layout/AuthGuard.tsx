import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/contexts';
import type { Permission } from '@sg-portal/shared';

interface AuthGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
}

export function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className={clsx(
              'w-16 h-16 rounded-2xl',
              'bg-gradient-to-br from-brand-500 to-accent-500',
              'flex items-center justify-center',
              'text-white font-bold text-2xl'
            )}
          >
            S&G
          </div>
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading...
          </p>
        </motion.div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permissions
  if (requiredPermission && user) {
    const hasPermission =
      user.role === 'admin' ||
      user.role === 'developer' ||
      user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Access Denied
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
