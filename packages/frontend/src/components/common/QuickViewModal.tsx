// ============================================================================
// QuickViewModal Component
// Location: src/components/common/QuickViewModal.tsx
//
// A generic quick view modal for previewing any entity (tasks, contacts, 
// companies, leads, deals, etc.) without opening a full edit panel.
// ============================================================================

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from './Button';

// ============================================================================
// Types
// ============================================================================

export interface QuickViewField {
  /** Label shown above the value */
  label: string;
  /** The value/content to display */
  value: ReactNode;
  /** Icon to show next to value */
  icon?: ReactNode;
  /** If true, clicking navigates somewhere */
  onClick?: () => void;
  /** Span full width (both columns) */
  fullWidth?: boolean;
  /** Hide this field if value is empty */
  hideIfEmpty?: boolean;
}

export interface QuickViewBadge {
  /** Badge text */
  label: string;
  /** Badge color classes */
  className?: string;
}

export interface QuickViewAction {
  /** Button label */
  label: string;
  /** Icon to show */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Disabled state */
  disabled?: boolean;
}

export interface QuickViewModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Main title */
  title: string;
  /** Subtitle (e.g., date, status) */
  subtitle?: ReactNode;
  /** Icon shown in header */
  icon?: ReactNode;
  /** Icon background color class */
  iconBgClass?: string;
  /** Status/priority badges shown below header */
  badges?: QuickViewBadge[];
  /** Fields to display in grid layout */
  fields?: QuickViewField[];
  /** Notes/description section */
  notes?: string;
  /** Notes label (default: "Notes") */
  notesLabel?: string;
  /** Footer metadata (e.g., "Created on...") */
  footerMeta?: ReactNode;
  /** Left side footer actions (e.g., delete) */
  leftActions?: QuickViewAction[];
  /** Right side footer actions (e.g., edit) */
  rightActions?: QuickViewAction[];
  /** Primary action button (rightmost) */
  primaryAction?: QuickViewAction;
  /** Custom content to render (replaces fields/notes) */
  children?: ReactNode;
  /** Modal max width class (default: max-w-lg) */
  maxWidth?: string;
}

// ============================================================================
// Component
// ============================================================================

export function QuickViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgClass = 'bg-blue-100 dark:bg-blue-900/30',
  badges,
  fields,
  notes,
  notesLabel = 'Notes',
  footerMeta,
  leftActions,
  rightActions,
  primaryAction,
  children,
  maxWidth = 'max-w-lg',
}: QuickViewModalProps) {
  // Handle escape key and body scroll
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter out empty fields if hideIfEmpty is set
  const visibleFields = fields?.filter(f => !f.hideIfEmpty || f.value);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/50" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className={clsx(
        'relative w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden',
        'animate-[fade-in_0.15s_ease-out]',
        maxWidth
      )}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          {icon && (
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
              iconBgClass
            )}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Badges */}
          {badges && badges.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {badges.map((badge, i) => (
                <span 
                  key={i}
                  className={clsx(
                    'px-2.5 py-1 text-xs font-medium rounded-full',
                    badge.className || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Custom children or default field layout */}
          {children ? (
            children
          ) : (
            <>
              {/* Fields Grid */}
              {visibleFields && visibleFields.length > 0 && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {visibleFields.map((field, i) => (
                    <div key={i} className={field.fullWidth ? 'col-span-2' : ''}>
                      <span className="text-slate-400 text-xs uppercase tracking-wide">
                        {field.label}
                      </span>
                      {field.onClick ? (
                        <button
                          onClick={field.onClick}
                          className="flex items-center gap-2 mt-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                        >
                          {field.icon && (
                            <span className="text-slate-400 group-hover:text-blue-500">
                              {field.icon}
                            </span>
                          )}
                          <span className="underline-offset-2 group-hover:underline">
                            {field.value}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 mt-1 text-slate-700 dark:text-slate-300">
                          {field.icon && (
                            <span className="text-slate-400">{field.icon}</span>
                          )}
                          <span>{field.value}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wide">
                    {notesLabel}
                  </span>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer Meta */}
          {footerMeta && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-400">
                {footerMeta}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        {(leftActions?.length || rightActions?.length || primaryAction) && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              {leftActions?.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                    action.variant === 'danger'
                      ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={action.label}
                >
                  {action.icon}
                  {!action.icon && action.label}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {rightActions?.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant === 'primary' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              {primaryAction && (
                <Button
                  size="sm"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default QuickViewModal;