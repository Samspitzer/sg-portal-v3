import { forwardRef, type InputHTMLAttributes, useCallback } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  icon?: React.ReactNode;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      showClearButton = true,
      icon,
      placeholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onChange('');
          onClear?.();
        }
      },
      [onChange, onClear]
    );

    const handleClear = useCallback(() => {
      onChange('');
      onClear?.();
    }, [onChange, onClear]);

    return (
      <div className={clsx('relative', className)}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon || <Search className="w-5 h-5" />}
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={clsx(
            'w-full pl-10 py-2.5',
            showClearButton ? 'pr-8' : 'pr-4',
            'border border-slate-300 dark:border-slate-700 rounded-lg',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500'
          )}
          {...props}
        />
        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';