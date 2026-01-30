// ============================================================================
// ModalPanel Component
// Location: src/components/panels/add-forms/ModalPanel.tsx
// 
// A modal-style panel that can stack on top of other panels.
// Uses createPortal to render at document.body level.
// Supports dynamic z-index for stacking multiple modals.
// ============================================================================

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from '@/components/common';

// ============================================================================
// Types
// ============================================================================

export interface ModalPanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Panel title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Icon to show in header */
  icon?: ReactNode;
  /** Content to render in panel body */
  children: ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Panel width (default: 600px) */
  width?: number;
  /** Maximum height as viewport percentage (default: 90) */
  maxHeightVh?: number;
  /** Stack level for z-index (0 = base, 1 = first overlay, etc.) */
  stackLevel?: number;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Additional class for panel container */
  className?: string;
}

// Base z-index for modal panels (above SlidePanel's z-50)
const BASE_Z_INDEX = 60;

// ============================================================================
// Component
// ============================================================================

export function ModalPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = 600,
  maxHeightVh = 90,
  stackLevel = 0,
  showCloseButton = true,
  className,
}: ModalPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Trigger enter animation after mount
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // Wait for exit animation before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isVisible) return null;

  // Calculate z-index based on stack level
  const backdropZIndex = BASE_Z_INDEX + (stackLevel * 2);
  const panelZIndex = BASE_Z_INDEX + (stackLevel * 2) + 1;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: backdropZIndex }}>
      {/* Backdrop */}
      <div 
        className={clsx(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={panelRef}
          style={{ 
            width: `${width}px`,
            maxWidth: '95vw',
            maxHeight: `${maxHeightVh}vh`,
            zIndex: panelZIndex,
          }}
          className={clsx(
            'relative flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl pointer-events-auto',
            'transition-all duration-200 ease-out',
            isAnimating 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// Standard Footer Component
// ============================================================================

export interface ModalPanelFooterProps {
  onCancel: () => void;
  onSave: () => void;
  cancelText?: string;
  saveText?: string;
  saveDisabled?: boolean;
  saving?: boolean;
  /** Additional content to show on the left side */
  leftContent?: ReactNode;
}

export function ModalPanelFooter({
  onCancel,
  onSave,
  cancelText = 'Cancel',
  saveText = 'Save',
  saveDisabled = false,
  saving = false,
  leftContent,
}: ModalPanelFooterProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {leftContent}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {cancelText}
        </Button>
        <Button onClick={onSave} disabled={saveDisabled || saving}>
          {saving ? 'Saving...' : saveText}
        </Button>
      </div>
    </div>
  );
}

export default ModalPanel;