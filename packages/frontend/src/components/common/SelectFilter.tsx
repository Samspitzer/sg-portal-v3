import { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';
import { useDropdownKeyboard } from '@/hooks';

export interface SelectFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SelectFilterProps {
  /** Label shown when nothing is selected */
  label: string;
  /** Currently selected value (empty string = all) */
  value: string;
  /** Options to display */
  options: SelectFilterOption[];
  /** Change handler */
  onChange: (value: string) => void;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Show "All" option */
  showAllOption?: boolean;
  /** Placeholder for "All" option */
  allLabel?: string;
  /** Additional className */
  className?: string;
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
  icon,
  showAllOption = true,
  allLabel = 'All',
  className,
}: SelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Build full options list including "All" option
  const allOptions = useMemo(() => {
    if (showAllOption) {
      return [{ value: '', label: allLabel }, ...options];
    }
    return options;
  }, [options, showAllOption, allLabel]);

  // Keyboard navigation using existing hook
  const dropdownKeyboard = useDropdownKeyboard({
    items: allOptions,
    isOpen,
    onSelect: (option) => {
      if (option) {
        onChange(option.value);
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    },
    onClose: () => {
      setIsOpen(false);
      buttonRef.current?.focus();
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Find current selection index
      const currentIndex = allOptions.findIndex(opt => opt.value === value);
      dropdownKeyboard.setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || label;
  const hasSelection = value !== '';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
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
      setIsOpen(false);
    } else if (isOpen) {
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          hasSelection
            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        )}
      >
        {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
        <span className={clsx(!hasSelection && 'text-slate-500 dark:text-slate-400')}>
          {hasSelection ? displayLabel : label}
        </span>
        {hasSelection ? (
          <X
            className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[180px] max-h-60 overflow-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          {allOptions.map((option, index) => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={clsx(
                'w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between',
                index === dropdownKeyboard.highlightedIndex
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                  : option.value === value
                  ? 'bg-slate-100 dark:bg-slate-700 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-slate-400">{option.count}</span>
              )}
            </button>
          ))}
          {allOptions.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}