// ============================================================================
// Multi-Select Users Component (Checklist Style with Keyboard Navigation)
// Location: src/components/common/MultiSelectUsers.tsx
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Users, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useUsersStore } from '@/contexts';
import { useDropdownKeyboard } from '@/hooks';

interface MultiSelectUsersProps {
  value: string[];
  onChange: (userIds: string[]) => void;
  label?: string;
  placeholder?: string;
  activeOnly?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function MultiSelectUsers({
  value = [],
  onChange,
  label,
  placeholder = 'Select sales reps...',
  activeOnly = false,
  disabled = false,
  className = '',
  size = 'md',
}: MultiSelectUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { users } = useUsersStore();
  const availableUsers = activeOnly ? users.filter((u) => u.isActive) : users;
  const selectedUsers = users.filter((u) => value.includes(u.id));

  // Filter users based on search
  const filteredUsers = searchQuery.trim()
    ? availableUsers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableUsers;

  // Show search if more than 5 users
  const showSearch = availableUsers.length > 5;

  // Keyboard navigation using the standard hook
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
      triggerRef.current?.focus();
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
    if (isOpen) {
      dropdownKeyboard.setHighlightedIndex(0);
    }
  }, [isOpen, showSearch]);

  // Reset highlight when search changes
  useEffect(() => {
    if (isOpen && searchQuery) {
      dropdownKeyboard.setHighlightedIndex(0);
    }
  }, [searchQuery, isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownKeyboard.highlightedIndex >= 0) {
      const item = itemRefs.current[dropdownKeyboard.highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [isOpen, dropdownKeyboard.highlightedIndex]);

  const toggleUser = (userId: string) => {
    const newValue = value.includes(userId)
      ? value.filter((id) => id !== userId)
      : [...value, userId];
    onChange(newValue);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        dropdownKeyboard.handleKeyDown(e);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        // Space selects the highlighted item when dropdown is open
        const highlightedUser = filteredUsers[dropdownKeyboard.highlightedIndex];
        if (highlightedUser) {
          toggleUser(highlightedUser.id);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    } else if (e.key === 'Tab') {
      // Close dropdown on Tab, let default behavior move focus
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
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      // Close dropdown on Tab, let default behavior move focus
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === ' ') {
      // Space selects the highlighted item
      const highlightedUser = filteredUsers[dropdownKeyboard.highlightedIndex];
      if (highlightedUser) {
        e.preventDefault();
        toggleUser(highlightedUser.id);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger - focusable div */}
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={clsx(
          'w-full flex items-center justify-between gap-2 rounded-lg border transition-colors',
          'bg-white dark:bg-slate-800',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700'
            : 'cursor-pointer border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
          size === 'sm' ? 'px-2 py-1' : 'px-3 py-2',
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
              {selectedUsers.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedUsers.length > 0 && !disabled && (
            <span
              onClick={clearAll}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Selected Users Pills */}
      {selectedUsers.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-xs"
            >
              {user.name}
              {!disabled && (
                <span
                  onClick={() => toggleUser(user.id)}
                  className="hover:text-brand-900 dark:hover:text-brand-100 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-[99999] mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
          role="listbox"
        >
          {/* Search */}
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
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* User List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                {searchQuery ? 'No matches found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const isSelected = value.includes(user.id);
                const isHighlighted = index === dropdownKeyboard.highlightedIndex;
                return (
                  <div
                    key={user.id}
                    ref={(el) => { itemRefs.current[index] = el; }}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleUser(user.id);
                    }}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors',
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
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    {/* Name */}
                    <span
                      className={clsx(
                        'text-sm',
                        isSelected
                          ? 'text-brand-700 dark:text-brand-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {user.name}
                    </span>
                  </div>
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