// ============================================================================
// Task Constants
// Location: src/utils/taskConstants.ts
//
// Shared constants and types for task-related pages (TasksPage, ActivitiesPage).
// Import from here instead of redefining in each page.
// ============================================================================

import type { TaskPriority } from '@/contexts/taskStore';

// Time filter type — used by TasksPage and ActivitiesPage
export type TimeFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'next-week';

// Priority display config — color classes for badges
export const TASK_PRIORITY_CONFIG: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high',   label: 'High',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];