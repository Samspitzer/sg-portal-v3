// ============================================================================
// Multi-Select Users Component (Checklist Style)
// Location: src/components/common/MultiSelectUsers.tsx
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X, Users, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useUsersStore } from '@/contexts';

interface MultiSelectUsersProps {
  /** Currently selected user IDs */
  value: string[];
  /** Change handler */
  onChange: (userIds: string[]) => void;
  /** Label for the field */
  label?: string;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** Show only active users */
  activeOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Optional className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function MultiSelectUsers({
  value = [],
  onChange,
  label,
  placeholder = 'Select sales reps...',
  activeOnly = true,
  disabled = false,
  className = '',
  size = 'md',
}: MultiSelectUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { users } = useUsersStore();
  const availableUsers = activeOnly ? users.filter((u) => u.isActive) : users;
  const selectedUsers = users.filter((u) => value.includes(u.id));

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Handle clicking outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-2 text-sm';

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center justify-between gap-2 rounded-lg border transition-colors',
          'bg-white dark:bg-slate-800 text-left',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
          sizeClasses
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {selectedUsers.length === 0 ? (
            <span className="text-slate-400 truncate">{placeholder}</span>
          ) : selectedUsers.length === 1 ? (
            <span className="text-slate-900 dark:text-white truncate">
              {selectedUsers[0]?.name}
            </span>
          ) : (
            <span className="text-slate-900 dark:text-white truncate">
              {selectedUsers.length} sales reps selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedUsers.length > 0 && !disabled && (
            <button
              type="button"
              onClick={clearAll}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Selected Users Pills (when multiple) */}
      {selectedUsers.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-xs"
            >
              {user.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className="hover:text-brand-900 dark:hover:text-brand-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Portal */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              onMouseDown={() => setIsOpen(false)}
            />
            {/* Dropdown */}
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: Math.max(dropdownPosition.width, 200),
              }}
              className="z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {availableUsers.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No users available
                </div>
              ) : (
                availableUsers.map((user) => {
                  const isSelected = value.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                        'hover:bg-slate-100 dark:hover:bg-slate-700',
                        isSelected && 'bg-brand-50 dark:bg-brand-900/20'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={clsx(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>

                      {/* User info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span
                          className={clsx(
                            'truncate',
                            isSelected
                              ? 'text-brand-700 dark:text-brand-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {user.name}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export default MultiSelectUsers;