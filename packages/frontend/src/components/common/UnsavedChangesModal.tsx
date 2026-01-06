// ============================================================================
// Unsaved Changes Modal Component
// Location: src/components/common/UnsavedChangesModal.tsx
// 
// A reusable modal dialog for confirming unsaved changes.
// Can be used standalone without wrapping in Modal component.
// ============================================================================

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { FileText } from 'lucide-react';
import { createPortal } from 'react-dom';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

// Get all focusable elements within a container
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1'
  );
};

export function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. What would you like to do?',
}: UnsavedChangesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the "Keep Editing" button by default
    setTimeout(() => {
      keepEditingRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            aria-describedby="unsaved-changes-description"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3
                id="unsaved-changes-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                {title}
              </h3>
            </div>
            <p
              id="unsaved-changes-description"
              className="text-sm text-slate-500 dark:text-slate-400 mb-6"
            >
              {message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                ref={discardRef}
                onClick={onDiscard}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20',
                  'focus:outline-none focus:ring-2 focus:ring-danger-500',
                  'transition-colors'
                )}
              >
                Discard
              </button>
              <button
                ref={keepEditingRef}
                onClick={onCancel}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-slate-700 dark:text-slate-300',
                  'bg-slate-100 dark:bg-slate-800',
                  'hover:bg-slate-200 dark:hover:bg-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-slate-500',
                  'transition-colors'
                )}
              >
                Keep Editing
              </button>
              <button
                ref={saveRef}
                onClick={onSave}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'text-white bg-brand-500 hover:bg-brand-600',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500',
                  'transition-colors'
                )}
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

export default UnsavedChangesModal;