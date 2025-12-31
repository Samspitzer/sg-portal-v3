import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useUnsavedChangesStore, useToast } from '@/contexts';

export function UnsavedChangesModal() {
  const navigate = useNavigate();
  const toast = useToast();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const lastButtonRef = useRef<HTMLButtonElement>(null);

  const {
    showModal,
    pendingNavigation,
    onSave,
    onDiscard,
    reset,
    hideUnsavedModal,
  } = useUnsavedChangesStore();

  // Focus trap
  useEffect(() => {
    if (showModal) {
      firstButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          hideUnsavedModal();
          return;
        }

        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstButtonRef.current) {
              e.preventDefault();
              lastButtonRef.current?.focus();
            }
          } else {
            if (document.activeElement === lastButtonRef.current) {
              e.preventDefault();
              firstButtonRef.current?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [showModal, hideUnsavedModal]);

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    toast.success('Settings saved', 'Your preferences have been updated');
    const destination = pendingNavigation || '/';
    reset();
    navigate(destination);
  };

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    }
    toast.info('Changes discarded', 'Your changes were not saved');
    const destination = pendingNavigation || '/';
    reset();
    navigate(destination);
  };

  const handleCancel = () => {
    hideUnsavedModal();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/50 z-[100]"
            aria-hidden="true"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 
                  id="unsaved-changes-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white mb-2"
                >
                  Unsaved Changes
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You have unsaved changes. Would you like to save them before leaving?
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <button
                  ref={firstButtonRef}
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Discard
                </button>
                <button
                  ref={lastButtonRef}
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-primary-600 hover:bg-slate-700 dark:hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}