import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-brand-600 text-white',
    'hover:bg-brand-700 active:bg-brand-800',
    'focus-visible:ring-brand-500',
    'shadow-sm hover:shadow'
  ),
  secondary: clsx(
    'bg-slate-100 text-slate-700',
    'hover:bg-slate-200 active:bg-slate-300',
    'dark:bg-slate-800 dark:text-slate-200',
    'dark:hover:bg-slate-700 dark:active:bg-slate-600',
    'focus-visible:ring-slate-500'
  ),
  ghost: clsx(
    'bg-transparent text-slate-600',
    'hover:bg-slate-100 active:bg-slate-200',
    'dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700',
    'focus-visible:ring-slate-500'
  ),
  danger: clsx(
    'bg-danger-600 text-white',
    'hover:bg-danger-700 active:bg-danger-800',
    'focus-visible:ring-danger-500',
    'shadow-sm hover:shadow'
  ),
  accent: clsx(
    'bg-accent-600 text-white',
    'hover:bg-accent-700 active:bg-accent-800',
    'focus-visible:ring-accent-500',
    'shadow-sm hover:shadow'
  ),
  outline: clsx(
    'bg-transparent text-slate-700 border border-slate-300',
    'hover:bg-slate-50 active:bg-slate-100',
    'dark:text-slate-300 dark:border-slate-600',
    'dark:hover:bg-slate-800 dark:active:bg-slate-700',
    'focus-visible:ring-slate-500'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center',
          'rounded-lg font-medium',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-slate-900',
          'disabled:opacity-50 disabled:pointer-events-none',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {size !== 'icon' && <span>Loading...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
