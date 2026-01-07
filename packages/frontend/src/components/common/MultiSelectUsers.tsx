// ============================================================================
// Multi-Select Users Component (Checklist Style)
// Location: src/components/common/MultiSelectUsers.tsx
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Users, User, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useUsersStore } from '@/contexts';
import { useDropdownKeyboard } from '@/hooks';

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
  /** Minimum users to show search (default: 5) */
  searchThreshold?: number;
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
  searchThreshold = 5,
}: MultiSelectUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { users } = useUsersStore();
  const availableUsers = activeOnly ? users.filter((u) => u.isActive) : users;
  const selectedUsers = users.filter((u) => value.includes(u.id));

  // Show search if enough users
  const showSearch = availableUsers.length > searchThreshold;

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter((u) => u.name.toLowerCase().includes(query));
  }, [availableUsers, searchQuery]);

  // Keyboard navigation using standard hook
  const dropdownKeyboard = useDropdownKeyboard({
    items: filteredUsers,
    isOpen,
    onSelect: (user) => {
      if (user) {
        toggleUser(user.id);
      }
    },
    onClose: () => {
      setIsOpen(false);
      setSearchQuery('');
      buttonRef.current?.focus();
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight and focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      dropdownKeyboard.setHighlightedIndex(0);
      if (showSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }
  }, [isOpen]);

  // Update highlight when search changes
  useEffect(() => {
    if (isOpen && searchQuery) {
      dropdownKeyboard.setHighlightedIndex(0);
    }
  }, [searchQuery]);

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

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        dropdownKeyboard.handleKeyDown(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    } else if (isOpen) {
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      dropdownKeyboard.handleKeyDown(e);
    } else if (e.key === ' ' && dropdownKeyboard.highlightedIndex >= 0) {
      // Space selects when an item is highlighted via arrow keys
      e.preventDefault();
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-2 text-sm';

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search users..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No matches found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const isSelected = value.includes(user.id);
                const isHighlighted = index === dropdownKeyboard.highlightedIndex;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                      isHighlighted
                        ? 'bg-brand-50 dark:bg-brand-900/30'
                        : isSelected
                        ? 'bg-slate-50 dark:bg-slate-700/50'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={clsx(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
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
        </div>
      )}
    </div>
  );
}

export default MultiSelectUsers;