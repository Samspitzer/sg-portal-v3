import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore } from '@/contexts/toastStore';
import type { Toast as ToastType, ToastType as ToastVariant } from '@sg-portal/shared';

const icons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastVariant, string> = {
  success: clsx(
    'bg-success-50 dark:bg-success-900/20',
    'border-success-200 dark:border-success-800',
    'text-success-700 dark:text-success-400'
  ),
  error: clsx(
    'bg-danger-50 dark:bg-danger-900/20',
    'border-danger-200 dark:border-danger-800',
    'text-danger-700 dark:text-danger-400'
  ),
  warning: clsx(
    'bg-warning-50 dark:bg-warning-900/20',
    'border-warning-200 dark:border-warning-800',
    'text-warning-700 dark:text-warning-400'
  ),
  info: clsx(
    'bg-brand-50 dark:bg-brand-900/20',
    'border-brand-200 dark:border-brand-800',
    'text-brand-700 dark:text-brand-400'
  ),
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = icons[toast.type];
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const interval = 50;
    const decrement = (interval / toast.duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={clsx(
        'relative overflow-hidden',
        'w-full max-w-sm',
        'rounded-lg border shadow-lg',
        styles[toast.type]
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          )}
        </div>

        {toast.dismissible && (
          <button
            onClick={() => onDismiss(toast.id)}
            className={clsx(
              'flex-shrink-0 rounded-md p-1',
              'hover:bg-black/5 dark:hover:bg-white/10',
              'transition-colors'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/10">
          <motion.div
            className="h-full bg-current opacity-30"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className={clsx(
        'fixed top-4 right-4 z-100',
        'flex flex-col gap-2',
        'pointer-events-none'
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
