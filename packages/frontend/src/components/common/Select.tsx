import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder,
      leftIcon,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-danger-500 ml-1">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-400 dark:text-slate-500">
                {leftIcon}
              </span>
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            value={value}
            className={clsx(
              'w-full px-3 py-2 pr-10 appearance-none',
              'bg-white dark:bg-slate-800',
              'border text-slate-900 dark:text-slate-100',
              'rounded-lg',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              'disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900',
              // Padding for left icon
              leftIcon && 'pl-10',
              // Error state
              error
                ? 'border-danger-500 focus:ring-danger-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-brand-500',
              // Placeholder color when no value selected
              !value && 'text-slate-400 dark:text-slate-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled={props.required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={`${selectId}-hint`}
            className="mt-1.5 text-sm text-slate-500 dark:text-slate-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';