import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigationGuardStore, useToast } from '@/contexts';

export function PageNavigationGuard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { 
    isBlocked, 
    pendingPath, 
    onSave, 
    onDiscard, 
    hideModal,
    clearGuard,
  } = useNavigationGuardStore();

  const handleSave = () => {
    if (onSave) {
      onSave();
      toast.success('Changes saved', 'Your changes have been saved');
    }
    clearGuard();
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    }
    toast.info('Changes discarded', 'Your changes were not saved');
    clearGuard();
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  const handleCancel = () => {
    hideModal();
  };

  const content = (
    <AnimatePresence>
      {isBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Unsaved Changes
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDiscard}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20',
                  'transition-colors'
                )}
              >
                Discard
              </button>
              <button
                onClick={handleCancel}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-slate-700 dark:text-slate-300',
                  'bg-slate-100 dark:bg-slate-800',
                  'hover:bg-slate-200 dark:hover:bg-slate-700',
                  'transition-colors'
                )}
              >
                Keep Editing
              </button>
              {onSave && (
                <button
                  onClick={handleSave}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-lg',
                    'text-white bg-brand-500 hover:bg-brand-600',
                    'transition-colors'
                  )}
                >
                  Save Changes
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}