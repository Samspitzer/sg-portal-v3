import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: string;
  rightAddon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-danger-500 ml-1">*</span>
            )}
          </label>
        )}

        <div className="relative flex">
          {/* Left addon */}
          {leftAddon && (
            <span
              className={clsx(
                'inline-flex items-center px-3',
                'rounded-l-lg border border-r-0',
                'bg-slate-50 text-slate-500 text-sm',
                'border-slate-300 dark:border-slate-600',
                'dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {leftAddon}
            </span>
          )}

          {/* Input wrapper */}
          <div className="relative flex-1">
            {/* Left icon */}
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 dark:text-slate-500">
                  {leftIcon}
                </span>
              </div>
            )}

            <input
              ref={ref}
              id={inputId}
              className={clsx(
                'w-full px-3 py-2',
                'bg-white dark:bg-slate-800',
                'border text-slate-900 dark:text-slate-100',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:border-transparent',
                'disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900',
                // Border radius
                !leftAddon && !rightAddon && 'rounded-lg',
                leftAddon && !rightAddon && 'rounded-r-lg',
                !leftAddon && rightAddon && 'rounded-l-lg',
                leftAddon && rightAddon && 'rounded-none',
                // Padding for icons
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                // Error state
                error
                  ? 'border-danger-500 focus:ring-danger-500'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-brand-500',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={
                error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
              }
              {...props}
            />

            {/* Right icon */}
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-slate-400 dark:text-slate-500">
                  {rightIcon}
                </span>
              </div>
            )}
          </div>

          {/* Right addon */}
          {rightAddon && (
            <span
              className={clsx(
                'inline-flex items-center px-3',
                'rounded-r-lg border border-l-0',
                'bg-slate-50 text-slate-500 text-sm',
                'border-slate-300 dark:border-slate-600',
                'dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {rightAddon}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-sm text-slate-500 dark:text-slate-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
