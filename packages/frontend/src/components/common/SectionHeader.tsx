// ============================================================================
// Section Header Component
// Location: src/components/common/SectionHeader.tsx
// 
// Non-collapsible section header that matches CollapsibleSection styling.
// Use for static sections that don't need expand/collapse.
// ============================================================================

import { clsx } from 'clsx';

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional icon (ReactNode, e.g., <Building2 className="w-4 h-4" />) */
  icon?: React.ReactNode;
  /** Optional action button or element on the right side */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Variant: 'default' matches CollapsibleSection, 'card' has gradient icon */
  variant?: 'default' | 'card';
  /** Description text (only for 'card' variant) */
  description?: string;
  /** Gradient classes for icon background (only for 'card' variant) */
  iconGradient?: string;
}

export function SectionHeader({
  title,
  icon,
  action,
  className,
  variant = 'default',
  description,
  iconGradient = 'from-slate-600 to-slate-700',
}: SectionHeaderProps) {
  if (variant === 'card') {
    return (
      <div className={clsx(
        "flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700",
        className
      )}>
        {icon && (
          <div className={clsx(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md',
            iconGradient
          )}>
            <span className="text-white">{icon}</span>
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {action}
      </div>
    );
  }

  // Default variant - matches CollapsibleSection header
  return (
    <div className={clsx(
      "flex items-center justify-between px-4 py-3",
      "bg-slate-50 dark:bg-slate-800/50",
      "border-b border-slate-200 dark:border-slate-700",
      className
    )}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-slate-500 dark:text-slate-400">
            {icon}
          </span>
        )}
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

export default SectionHeader;