// ============================================================================
// SlidePanel Component
// Location: src/components/layout/SlidePanel.tsx
// 
// Reusable slide-over panel from the right side of the screen.
// Supports multiple sizes and optional resize functionality.
// ============================================================================

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type SlidePanelSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface SlidePanelProps {
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
  /** Panel size preset */
  size?: SlidePanelSize;
  /** Allow resizing by dragging left edge */
  resizable?: boolean;
  /** Initial width when resizable (px) */
  initialWidth?: number;
  /** Minimum width when resizable (px) */
  minWidth?: number;
  /** Maximum width when resizable (px) */
  maxWidth?: number;
  /** Content to render in panel body */
  children: ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Additional class for panel container */
  className?: string;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Header right content (additional buttons) */
  headerRight?: ReactNode;
  /** Whether content area should scroll (default: true) */
  scrollable?: boolean;
  /** Optional sidebar content (renders on right side of panel) */
  sidebar?: ReactNode;
  /** Sidebar width in pixels (default: 280) */
  sidebarWidth?: number;
}

// ============================================================================
// Size presets (Tailwind max-w classes)
// ============================================================================

const sizeClasses: Record<SlidePanelSize, string> = {
  sm: 'max-w-sm',      // 384px
  md: 'max-w-md',      // 448px
  lg: 'max-w-lg',      // 512px
  xl: 'max-w-xl',      // 576px
  '2xl': 'max-w-2xl',  // 672px
  full: 'max-w-full',  // 100%
};

// ============================================================================
// Component
// ============================================================================

export function SlidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  resizable = false,
  initialWidth = 600,
  minWidth = 400,
  maxWidth = 1200,
  children,
  footer,
  className,
  showCloseButton = true,
  headerRight,
  scrollable = true,
  sidebar,
  sidebarWidth = 280,
}: SlidePanelProps) {
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset width when panel opens
  useEffect(() => {
    if (isOpen && resizable) {
      setPanelWidth(initialWidth);
    }
  }, [isOpen, resizable, initialWidth]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const panelContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'fixed top-0 right-0 h-full',
          'bg-white dark:bg-slate-800',
          'border-l border-slate-200 dark:border-slate-700',
          'shadow-xl z-50',
          'flex', // Changed from flex-col to flex for sidebar layout
          'animate-slide-in-right',
          !resizable && 'w-full',
          !resizable && sizeClasses[size],
          className
        )}
        style={resizable ? { width: panelWidth, maxWidth: '100vw' } : undefined}
      >
        {/* Resize Handle (when resizable) */}
        {resizable && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className={clsx(
              'absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize',
              'hover:bg-brand-400 active:bg-brand-500 transition-colors',
              isResizing ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
            )}
            title="Drag to resize panel"
          />
        )}

        {/* Main Content Area */}
        <div className={clsx('flex-1 flex flex-col min-w-0', resizable && 'ml-1.5')}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerRight}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className={clsx(
            'flex-1 p-4',
            scrollable ? 'overflow-y-auto' : 'overflow-hidden'
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {footer}
            </div>
          )}
        </div>

        {/* Sidebar (optional) */}
        {sidebar && (
          <div 
            className="flex-shrink-0 border-l border-slate-200 dark:border-slate-700"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(panelContent, document.body);
}

export default SlidePanel;