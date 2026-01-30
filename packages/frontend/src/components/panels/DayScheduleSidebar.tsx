// ============================================================================
// DayScheduleSidebar Component
// Location: src/components/panels/DayScheduleSidebar.tsx
//
// Mini calendar with day schedule view for task panels.
// Shows tasks for the selected date and allows date selection.
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { parseLocalDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

export interface ScheduleTask {
  id: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  status: string;
}

export interface DayScheduleSidebarProps {
  /** Currently selected date (YYYY-MM-DD format) */
  date: string;
  /** List of tasks to display */
  tasks: ScheduleTask[];
  /** Callback when date is selected */
  onDateChange?: (date: string) => void;
  /** Optional className for container */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DayScheduleSidebar({ 
  date,
  tasks,
  onDateChange,
  className,
}: DayScheduleSidebarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (date) return parseLocalDate(date);
    return new Date();
  });

  // Update current month when date changes
  useEffect(() => {
    if (date) {
      setCurrentMonth(parseLocalDate(date));
    }
  }, [date]);

  // Filter tasks for the selected date
  const dayTasks = useMemo(() => {
    if (!date) return [];
    return tasks
      .filter(t => t.dueDate === date && t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.dueTime && !b.dueTime) return 0;
        if (!a.dueTime) return 1;
        if (!b.dueTime) return -1;
        return a.dueTime.localeCompare(b.dueTime);
      });
  }, [date, tasks]);

  // Get tasks for the current month view
  const tasksByDate = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach(t => {
      if (t.dueDate && t.status !== 'completed' && t.status !== 'cancelled') {
        map.set(t.dueDate, (map.get(t.dueDate) || 0) + 1);
      }
    });
    return map;
  }, [tasks]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayStr = formatDateStr(today);

  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className={clsx(
      'w-full h-full bg-slate-50 dark:bg-slate-800/50 flex flex-col',
      className
    )}>
      {/* Mini Calendar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={goToPrevMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={goToNextMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map(({ date: d, isCurrentMonth }, i) => {
            const dateStr = formatDateStr(d);
            const isSelected = dateStr === date;
            const isToday = dateStr === todayStr;
            const taskCount = tasksByDate.get(dateStr) || 0;

            return (
              <button
                key={i}
                onClick={() => onDateChange?.(dateStr)}
                className={clsx(
                  'relative h-8 text-xs rounded transition-colors',
                  isCurrentMonth 
                    ? 'text-slate-700 dark:text-slate-300' 
                    : 'text-slate-400 dark:text-slate-600',
                  isSelected 
                    ? 'bg-blue-600 text-white font-medium' 
                    : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/30 font-medium'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {d.getDate()}
                {taskCount > 0 && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule for Selected Date */}
      {date ? (
        <>
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {parseLocalDate(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dayTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No tasks scheduled</p>
            ) : (
              dayTasks.map(task => (
                <div 
                  key={task.id}
                  className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {task.title}
                  </p>
                  {task.dueTime && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {task.dueTime}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a due date to see your schedule</p>
        </div>
      )}
    </div>
  );
}

export default DayScheduleSidebar;