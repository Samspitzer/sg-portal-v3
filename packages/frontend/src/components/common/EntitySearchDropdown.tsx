// ============================================================================
// Entity Search Dropdown Component
// Location: src/components/common/EntitySearchDropdown.tsx
// 
// Generic searchable dropdown for selecting entities (companies, contacts, etc.)
// with keyboard navigation and optional filtering.
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import { useDropdownKeyboard } from '@/hooks';

export interface EntitySearchItem {
  id: string;
  name: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

export interface EntitySearchDropdownProps {
  /** Label for the field */
  label: string;
  /** Currently selected value */
  value: EntitySearchItem | null;
  /** Callback when selection changes */
  onChange: (value: EntitySearchItem | null) => void;
  /** List of items to search through */
  items: EntitySearchItem[];
  /** Placeholder text for search input */
  placeholder?: string;
  /** Icon component to display */
  icon?: React.ElementType;
  /** Maximum number of results to show */
  maxResults?: number;
  /** Optional label suffix (e.g., "(filtered by company)") */
  labelSuffix?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function EntitySearchDropdown({
  label,
  value,
  onChange,
  items,
  placeholder = 'Search...',
  icon: Icon,
  maxResults = 10,
  labelSuffix,
  emptyMessage = 'No results found',
  disabled = false,
  className,
}: EntitySearchDropdownProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items.slice(0, maxResults);
    return items
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, maxResults);
  }, [search, items, maxResults]);

  // Keyboard navigation
  const { highlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: filteredItems,
    isOpen,
    onSelect: (item) => {
      if (item) {
        onChange(item);
        setSearch('');
        setIsOpen(false);
        resetHighlight();
      }
    },
    onClose: () => {
      setIsOpen(false);
      resetHighlight();
    },
  });

  // Click outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        resetHighlight();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [resetHighlight]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
    resetHighlight();
  };

  const handleClear = () => {
    onChange(null);
    setSearch('');
  };

  // Custom keyboard handler with ESC to clear
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (search) {
        // First ESC clears search
        setSearch('');
      } else if (isOpen) {
        // Second ESC closes dropdown
        setIsOpen(false);
        resetHighlight();
      } else if (value) {
        // Third ESC clears selection
        onChange(null);
      }
    } else {
      // Let the dropdown keyboard hook handle other keys
      handleKeyDown(e);
    }
  };

  if (disabled) {
    return (
      <div className={clsx("space-y-1.5 opacity-50", className)}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">
            {value?.name || placeholder}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {labelSuffix && <span className="text-xs text-slate-400 ml-1">{labelSuffix}</span>}
      </label>
      
      {value ? (
        // Selected state
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <div className="flex-1 min-w-0">
            <span className="text-sm text-slate-900 dark:text-white truncate block">{value.name}</span>
            {value.subtitle && (
              <span className="text-xs text-slate-400 truncate block">{value.subtitle}</span>
            )}
          </div>
          <button 
            type="button" 
            onClick={handleClear}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Search state
        <div ref={containerRef} className="relative">
          <Input
            value={search}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            leftIcon={<Search className="w-4 h-4" />}
            disableAutoValidation
          />
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <button 
                    key={item.id} 
                    type="button" 
                    onClick={() => { 
                      onChange(item);
                      setSearch(''); 
                      setIsOpen(false);
                      resetHighlight();
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                      index === highlightedIndex 
                        ? 'bg-slate-100 dark:bg-slate-700' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-900 dark:text-white truncate block">
                        {item.name}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-slate-400 truncate block">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : search ? (
                <div className="p-3 text-center text-sm text-slate-500">
                  {emptyMessage}
                </div>
              ) : (
                <div className="p-3 text-center text-sm text-slate-400">
                  Type to search...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EntitySearchDropdown;