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
  /** Optional icon - can be a Lucide component (e.g., Building2) or ReactNode for backward compatibility */
  icon?: React.ElementType | React.ReactNode;
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
  /** Children content (only for 'card' variant) */
  children?: React.ReactNode;
}

// Helper to check if icon is a component type vs ReactNode
function isComponentType(icon: React.ElementType | React.ReactNode): icon is React.ElementType {
  // Check if it's a function (functional component)
  if (typeof icon === 'function') return true;
  // Check if it's a forwardRef or memo component (object with $$typeof but no 'type' property)
  if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) {
    // If it has 'type' property, it's already a rendered element, not a component
    if ('type' in icon) return false;
    return true;
  }
  return false;
}

export function SectionHeader({
  title,
  icon,
  action,
  className,
  variant = 'default',
  description,
  iconGradient = 'from-slate-600 to-slate-700',
  children,
}: SectionHeaderProps) {
  // Render the icon - handles both component type and ReactNode
  const renderIcon = (sizeClass: string = 'w-4 h-4') => {
    if (!icon) return null;
    if (isComponentType(icon)) {
      const IconComponent = icon;
      return <IconComponent className={sizeClass} />;
    }
    return icon; // Already a ReactNode
  };

  if (variant === 'card') {
    return (
      <div className={clsx(
        "bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700",
        className
      )}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
          {icon && (
            <div className={clsx(
              'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md',
              iconGradient
            )}>
              <span className="text-white">{renderIcon('w-5 h-5')}</span>
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
        {children && (
          <div className="p-2">
            {children}
          </div>
        )}
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
            {renderIcon('w-4 h-4 text-slate-500')}
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