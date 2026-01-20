// ===========================================================================
// DatePicker Component - Enhanced with Text Input + Calendar Picker
// Location: packages/frontend/src/components/common/DatePicker.tsx
// ===========================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string; // ISO date string: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to parse YYYY-MM-DD without timezone issues
function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

// Format date for display
function formatDisplayDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

// Validate and parse user input (MM/DD/YYYY or YYYY-MM-DD)
function validateDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Try MM/DD/YYYY format
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = parseInt(year!, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = parseInt(year!, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  return null; // Invalid
}

export function DatePicker({ label, value, onChange, placeholder = 'Select date', className, error }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [textValue, setTextValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  // Sync text value with prop value
  useEffect(() => {
    if (value) {
      setTextValue(formatDisplayDate(value));
      const date = parseLocalDate(value);
      if (date) setViewDate(date);
    } else {
      setTextValue('');
    }
    setInputError(false);
  }, [value]);

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month - 1 < 0 ? 11 : month - 1;
      const y = month - 1 < 0 ? year - 1 : year;
      const date = new Date(y, m, d);
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date, dateStr, isCurrentMonth: false, isToday: false, isSelected: value === dateStr });
    }

    // Current month days
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr, isSelected: value === dateStr });
    }

    return days;
  }, [viewDate, value]);

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
  };

  const navigateMonth = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const selectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleTextBlur = () => {
    if (!textValue.trim()) {
      onChange('');
      setInputError(false);
      return;
    }
    const result = validateDateInput(textValue);
    if (result === null) {
      setInputError(true);
    } else {
      setInputError(false);
      onChange(result);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextBlur();
    }
  };

  // Check dropdown position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 320;
      setDropdownPosition(spaceBelow < dropdownHeight ? 'top' : 'bottom');
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasError = error || inputError;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={textValue}
            onChange={e => { setTextValue(e.target.value); setInputError(false); }}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={clsx(
              'w-full h-9 pl-3 pr-16 text-sm text-left rounded-lg border transition-colors',
              'bg-white dark:bg-slate-800',
              'flex items-center justify-between gap-2',
              hasError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <button type="button" onClick={clear} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          </div>
        </div>
        {hasError && <p className="text-xs text-red-500 mt-1">{error || 'Invalid date format (use MM/DD/YYYY)'}</p>}

        {/* Dropdown */}
        {isOpen && (
          <div
            className={clsx(
              'absolute left-0 right-0 z-50 mt-1 p-3',
              'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
              'border border-slate-200 dark:border-slate-700',
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => navigateMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button type="button" onClick={() => navigateMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-1">
              {DAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(day.dateStr)}
                  className={clsx(
                    'w-7 h-7 text-xs rounded-full transition-colors',
                    day.isSelected
                      ? 'bg-blue-600 text-white'
                      : day.isToday
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : day.isCurrentMonth
                          ? 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                          : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>

            {/* Today button */}
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={goToToday} className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}