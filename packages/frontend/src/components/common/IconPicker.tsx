// ============================================================================
// Icon Picker Component
// Location: src/components/common/IconPicker.tsx
// 
// Dropdown picker for selecting icons from a predefined set.
// Used for task types and other configurable entities.
// ============================================================================

import { useState } from 'react';
import { clsx } from 'clsx';
import { TaskTypeIcon } from './TaskTypeIcon';
import { TASK_TYPE_ICONS, type TaskTypeIconName } from '@/contexts/taskTypesStore';

export interface IconPickerProps {
  /** Currently selected icon value */
  value: TaskTypeIconName;
  /** Callback when icon changes */
  onChange: (icon: TaskTypeIconName) => void;
  /** Optional label */
  label?: string;
  /** Number of columns in the grid */
  columns?: number;
  /** Additional class names */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

export function IconPicker({ 
  value, 
  onChange, 
  label,
  columns = 5,
  className,
  disabled = false,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedIcon = TASK_TYPE_ICONS.find(i => i.value === value);

  return (
    <div className={clsx("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'w-full h-10 px-3 flex items-center gap-2 rounded-lg border',
            'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:border-slate-300 dark:hover:border-slate-600 transition-colors'
          )}
        >
          <TaskTypeIcon icon={value} className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {selectedIcon?.label || value}
          </span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown */}
            <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              <div 
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {TASK_TYPE_ICONS.map(icon => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => { 
                      onChange(icon.value); 
                      setIsOpen(false); 
                    }}
                    className={clsx(
                      'p-2 rounded-lg flex flex-col items-center gap-1 transition-colors',
                      value === icon.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                    title={icon.label}
                  >
                    <TaskTypeIcon icon={icon.value} className="w-5 h-5" />
                    <span className="text-[10px] truncate w-full text-center">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default IconPicker;