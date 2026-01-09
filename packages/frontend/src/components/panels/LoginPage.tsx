import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Loader2, Shield } from 'lucide-react';
import { useAuthStore, useToast } from '@/contexts';
import { Button } from '@/components/common';
import { useDocumentTitle } from '@/hooks';

export function LoginPage() {
  useDocumentTitle('Sign In');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
      toast.success('Welcome back!', 'You have been signed in successfully');
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Sign in failed', 'Please try again or contact support');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">S&G</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              S&G Portal
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Enterprise Management System
            </p>
          </div>

          {/* Dev Mode Notice */}
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
              🔧 Development Mode - No password required
            </p>
          </div>

          {/* Login Button - Using common Button component */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleLogin}
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            className="shadow-lg"
          >
            {isLoading ? 'Signing in...' : 'Sign in as Admin'}
          </Button>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Shield className="w-4 h-4" />
            <span>SSO will be enabled for production</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} S&G Builders Supply Inc.
        </p>
      </motion.div>
    </div>
  );
}