// ============================================================================
// Collapsible Section Component
// Location: src/components/common/CollapsibleSection.tsx
// 
// Expandable/collapsible section with header styling matching SectionHeader.
// ============================================================================

import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Optional icon - can be a Lucide component (e.g., Building2) or ReactNode for backward compatibility */
  icon?: React.ElementType | React.ReactNode;
  /** Optional badge to display (e.g., count) */
  badge?: string | number;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Optional action button or element on the right side (before chevron) */
  action?: React.ReactNode;
  /** Content to display when expanded */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
}

// Helper to check if icon is a component type vs ReactNode
function isComponentType(icon: React.ElementType | React.ReactNode): icon is React.ElementType {
  // Check if it's a function (functional component) or has $$typeof (already rendered element)
  if (typeof icon === 'function') return true;
  // Check if it's a forwardRef or memo component (object with $$typeof)
  if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) {
    // If it has 'type' property, it's already a rendered element, not a component
    if ('type' in icon) return false;
    return true;
  }
  return false;
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  action,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Render the icon - handles both component type and ReactNode
  const renderIcon = () => {
    if (!icon) return null;
    if (isComponentType(icon)) {
      const IconComponent = icon;
      return <IconComponent className="w-4 h-4 text-slate-500" />;
    }
    return icon; // Already a ReactNode
  };

  return (
    <div className={clsx("bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800", className)}>
      {/* Header - clickable to toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 cursor-pointer rounded-t-xl",
          "bg-slate-50 dark:bg-slate-800/50",
          isOpen && "border-b border-slate-200 dark:border-slate-700",
          "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
        )}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-slate-500 dark:text-slate-400">
              {renderIcon()}
            </span>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <div onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
          <ChevronDown
            className={clsx(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Content - shown when open */}
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;