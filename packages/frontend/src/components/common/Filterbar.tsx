// ============================================================================
// Filter Bar Component
// Location: src/components/common/Filterbar.tsx
// 
// Reusable filter bar with consistent styling across list pages.
// Matches the Tasks page design with bordered container and flexible slots.
// ============================================================================

import { clsx } from 'clsx';

export interface FilterBarProps {
  /** Primary row content (search, dropdowns, etc.) */
  children: React.ReactNode;
  /** Secondary row content (alphabet filter, quick filters, etc.) */
  secondaryRow?: React.ReactNode;
  /** Right side content (counts, actions, etc.) */
  rightContent?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function FilterBar({ 
  children, 
  secondaryRow,
  rightContent,
  className 
}: FilterBarProps) {
  return (
    <div 
      className={clsx(
        "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700",
        "shadow-sm mb-4 flex-shrink-0",
        className
      )}
    >
      {/* Primary Row */}
      <div className="px-3 py-2 flex items-center gap-3">
        {/* Left content - filters, search, etc */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {children}
        </div>
        
        {/* Right content - counts, etc */}
        {rightContent && (
          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>

      {/* Secondary Row (with divider) */}
      {secondaryRow && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-700" />
          <div className="px-3 py-2">
            {secondaryRow}
          </div>
        </>
      )}
    </div>
  );
}

// Vertical divider for separating filter groups
export function FilterDivider() {
  return <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />;
}

// Result count display
export function FilterCount({ 
  count, 
  singular = 'item', 
  plural 
}: { 
  count: number; 
  singular?: string; 
  plural?: string;
}) {
  const pluralWord = plural || `${singular}s`;
  return (
    <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
      {count} {count === 1 ? singular : pluralWord}
    </span>
  );
}

// Toggle button group (like List/Calendar toggle)
export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterToggleProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterToggle<T extends string>({ 
  options, 
  value, 
  onChange 
}: FilterToggleProps<T>) {
  return (
    <div className="flex border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden h-[34px]">
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "flex items-center gap-1.5 px-3 text-sm font-medium transition-all",
            index < options.length - 1 && "border-r border-slate-200 dark:border-slate-600",
            value === option.value
              ? "bg-blue-600 text-white"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Quick filter buttons (like All, Overdue, Today, etc.)
export interface QuickFilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  isWarning?: boolean;
}

export interface QuickFiltersProps<T extends string> {
  options: QuickFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function QuickFilters<T extends string>({ 
  options, 
  value, 
  onChange 
}: QuickFiltersProps<T>) {
  return (
    <div className="flex items-center gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            value === option.value
              ? option.isWarning
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : option.isWarning && option.count && option.count > 0
                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          )}
        >
          {option.count !== undefined && option.count > 0
            ? `${option.label} (${option.count})`
            : option.label}
        </button>
      ))}
    </div>
  );
}

// Alphabet filter (for Companies and Contacts pages)
// NOTE: Use the existing AlphabetFilter component from '@/components/common/AlphabetFilter'
// This is just re-exported for convenience

export default FilterBar;