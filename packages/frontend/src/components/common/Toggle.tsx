import { clsx } from 'clsx';

export interface ToggleProps {
  /** Whether the toggle is on */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Optional click handler (for cases where you need to intercept clicks) */
  onClick?: (e: React.MouseEvent) => void;
  /** Optional label text */
  label?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Color when active */
  activeColor?: 'brand' | 'success' | 'warning' | 'danger';
  /** Additional className for the container */
  className?: string;
  /** ID for the input (for label association) */
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  onClick,
  label,
  labelPosition = 'right',
  size = 'md',
  disabled = false,
  activeColor = 'brand',
  className,
  id,
}: ToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      thumbTranslate: 'translate-x-[16px]',
      thumbOffset: 'top-0.5 left-0.5',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      thumbTranslate: 'translate-x-[22px]',
      thumbOffset: 'top-0.5 left-0.5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      thumbTranslate: 'translate-x-[28px]',
      thumbOffset: 'top-0.5 left-0.5',
    },
  };

  // Active color configurations
  const activeColorConfig = {
    brand: 'bg-brand-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  };

  const config = sizeConfig[size];

  const trackClasses = clsx(
    config.track,
    'rounded-full transition-colors relative',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    checked ? activeColorConfig[activeColor] : 'bg-slate-300 dark:bg-slate-600'
  );

  const thumbClasses = clsx(
    'absolute bg-white rounded-full shadow transition-transform',
    config.thumb,
    config.thumbOffset,
    checked && config.thumbTranslate
  );

  const labelClasses = clsx(
    'text-sm font-medium',
    disabled
      ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
      : 'text-slate-700 dark:text-slate-300 cursor-pointer'
  );

  const toggleElement = (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={trackClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={thumbClasses} />
    </div>
  );

  if (!label) {
    return (
      <div className={className}>
        {toggleElement}
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      {labelPosition === 'left' && (
        <span className={labelClasses}>{label}</span>
      )}
      {toggleElement}
      {labelPosition === 'right' && (
        <span className={labelClasses}>{label}</span>
      )}
    </label>
  );
}