// ============================================================================
// Header Dropdown Component with Keyboard Navigation
// Location: src/components/common/HeaderDropdown.tsx
//
// Shared dropdown for header menus (theme, notifications, user menu)
// Uses useDropdownKeyboard for consistent keyboard navigation
// ============================================================================

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useDropdownKeyboard } from '@/hooks';

export interface HeaderDropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
}

export interface HeaderDropdownProps {
  /** Trigger button content */
  trigger: ReactNode;
  /** Trigger button className */
  triggerClassName?: string;
  /** Dropdown items */
  items: HeaderDropdownItem[];
  /** Header content (optional, shown at top of dropdown) */
  header?: ReactNode;
  /** Footer content (optional, shown at bottom of dropdown) */
  footer?: ReactNode;
  /** Empty state content (when no items) */
  emptyState?: ReactNode;
  /** Dropdown width */
  width?: 'sm' | 'md' | 'lg';
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  /** Additional dropdown className */
  className?: string;
  /** Controlled open state (optional) */
  isOpen?: boolean;
  /** Controlled open state setter (optional) */
  onOpenChange?: (isOpen: boolean) => void;
}

const widthClasses = {
  sm: 'w-36',
  md: 'w-56',
  lg: 'w-80',
};

export function HeaderDropdown({
  trigger,
  triggerClassName,
  items,
  header,
  footer,
  emptyState,
  width = 'md',
  align = 'right',
  className,
  isOpen: controlledIsOpen,
  onOpenChange,
}: HeaderDropdownProps) {
  // Internal state for uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled or uncontrolled state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Filter out divider-only items for keyboard navigation
  const navigableItems = items.filter(item => item.onClick);

  // Keyboard navigation
  const { highlightedIndex, setHighlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: navigableItems,
    isOpen,
    onSelect: (item) => {
      if (item) {
        item.onClick();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    },
    onClose: () => {
      setIsOpen(false);
      triggerRef.current?.focus();
    },
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Reset highlight when opening
  useEffect(() => {
    if (isOpen) {
      resetHighlight();
    }
  }, [isOpen, resetHighlight]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        handleKeyDown(e);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(navigableItems.length - 1);
      } else {
        handleKeyDown(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (isOpen) {
      handleKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={triggerClassName}
      >
        {trigger}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            role="menu"
            className={clsx(
              'absolute top-full mt-2',
              align === 'right' ? 'right-0' : 'left-0',
              widthClasses[width],
              'bg-white dark:bg-slate-800',
              'rounded-lg shadow-lg',
              'border border-slate-200 dark:border-slate-700',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            {header && (
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                {header}
              </div>
            )}

            {/* Items */}
            {navigableItems.length === 0 && emptyState ? (
              <div className="py-4">{emptyState}</div>
            ) : (
              <div className="py-1">
                {items.map((item) => {
                  // Find the index in navigableItems for highlighting
                  const navIndex = navigableItems.findIndex(ni => ni.id === item.id);
                  const isHighlighted = navIndex === highlightedIndex;

                  return (
                    <div key={item.id}>
                      {item.dividerBefore && (
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                      )}
                      <button
                        role="menuitem"
                        tabIndex={isHighlighted ? 0 : -1}
                        onClick={() => {
                          item.onClick();
                          setIsOpen(false);
                        }}
                        onKeyDown={handleKeyDown}
                        onMouseEnter={() => setHighlightedIndex(navIndex)}
                        className={clsx(
                          'w-full flex items-center gap-2',
                          'px-4 py-2 text-sm',
                          'transition-colors',
                          'focus:outline-none',
                          isHighlighted
                            ? 'bg-slate-100 dark:bg-slate-700'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700',
                          item.className || 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                      {item.dividerAfter && (
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {footer && (
              <div className="border-t border-slate-200 dark:border-slate-700">
                {footer}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeaderDropdown;