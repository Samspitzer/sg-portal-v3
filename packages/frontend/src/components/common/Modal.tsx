import { useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  hasUnsavedChanges?: boolean;
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

// Get all focusable elements within a container
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1'
  );
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
  hasUnsavedChanges = false,
  onSaveChanges,
  onDiscardChanges,
}: ModalProps) {
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle save and close
  const handleSaveAndClose = useCallback(() => {
    setShowUnsavedWarning(false);
    onSaveChanges?.();
  }, [onSaveChanges]);

  // Handle discard and close
  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedWarning(false);
    onDiscardChanges?.();
    onClose();
  }, [onDiscardChanges, onClose]);

  // Handle cancel (go back to form)
  const handleCancelClose = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

 // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !showUnsavedWarning) {
        e.preventDefault();
        handleClose();
      }

      // Focus trap - Tab key handling
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Safety check - should always have elements at this point but TypeScript needs this
        if (!firstElement || !lastElement) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          // Shift + Tab: go to previous element
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: go to next element
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [closeOnEscape, handleClose, showUnsavedWarning]
  );

  // Set up event listeners and focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Add keydown listener
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus the first focusable element in the modal
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = getFocusableElements(modalRef.current);
          const firstElement = focusableElements[0];
          if (firstElement) {
            firstElement.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current && !isOpen) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  // Reset unsaved warning when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowUnsavedWarning(false);
    }
  }, [isOpen]);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? handleClose : undefined}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={clsx(
              'relative w-full',
              sizeStyles[size],
              'bg-white dark:bg-slate-900',
              'rounded-xl shadow-2xl',
              'border border-slate-200 dark:border-slate-700',
              'max-h-[calc(100vh-2rem)] overflow-hidden',
              'flex flex-col',
              'outline-none'
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
                <div>
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                    >
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    onClick={handleClose}
                    className={clsx(
                      'flex-shrink-0 rounded-lg p-2',
                      'text-slate-400 hover:text-slate-600',
                      'dark:hover:text-slate-300',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'transition-colors'
                    )}
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div
                className={clsx(
                  'flex items-center justify-end gap-3',
                  'px-6 py-4',
                  'border-t border-slate-200 dark:border-slate-700',
                  'bg-slate-50 dark:bg-slate-800/50'
                )}
              >
                {footer}
              </div>
            )}
          </motion.div>

          {/* Unsaved Changes Warning Dialog */}
          <AnimatePresence>
            {showUnsavedWarning && (
              <UnsavedChangesWarning
                onSave={onSaveChanges ? handleSaveAndClose : undefined}
                onDiscard={handleDiscardAndClose}
                onCancel={handleCancelClose}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

// Unsaved Changes Warning Dialog
interface UnsavedChangesWarningProps {
  onSave?: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

function UnsavedChangesWarning({ onSave, onDiscard, onCancel }: UnsavedChangesWarningProps) {
  const warningRef = useRef<HTMLDivElement>(null);

  // Handle ESC to cancel and focus trap for warning dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onCancel();
      }

      // Focus trap for warning dialog
      if (e.key === 'Tab' && warningRef.current) {
        const focusableElements = getFocusableElements(warningRef.current);
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Safety check
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
    
    // Focus the first button in the warning dialog
    setTimeout(() => {
      if (warningRef.current) {
        const focusableElements = getFocusableElements(warningRef.current);
        const firstElement = focusableElements[0];
        if (firstElement) {
          firstElement.focus();
        }
      }
    }, 50);

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  return (
    <>
      {/* Overlay for warning dialog */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 z-10"
        onClick={onCancel}
      />

      {/* Warning Dialog */}
      <motion.div
        ref={warningRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute z-20 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <h3 
          id="unsaved-changes-title"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          Unsaved Changes
        </h3>
        <p 
          id="unsaved-changes-description"
          className="mt-2 text-sm text-slate-500 dark:text-slate-400"
        >
          You have unsaved changes. What would you like to do?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onDiscard}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20',
              'transition-colors'
            )}
          >
            Discard
          </button>
          <button
            onClick={onCancel}
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
              onClick={onSave}
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
    </>
  );
}

// Convenience component for confirmation dialogs
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  const buttonStyles = {
    danger: 'bg-danger-600 hover:bg-danger-700 text-white',
    warning: 'bg-warning-600 hover:bg-warning-700 text-white',
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium',
              'bg-slate-100 text-slate-700',
              'hover:bg-slate-200',
              'dark:bg-slate-700 dark:text-slate-200',
              'dark:hover:bg-slate-600',
              'transition-colors',
              'disabled:opacity-50'
            )}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium',
              'transition-colors',
              'disabled:opacity-50',
              buttonStyles[variant]
            )}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </>
      }
    >
      <p className="text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}