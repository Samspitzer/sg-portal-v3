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

// Validate and parse user input - supports multiple formats:
// - MMDDYY or MMDDYYYY (no separators): 010125, 01012025
// - MM/DD/YY or MM/DD/YYYY: 1/1/25, 01/01/2025
// - YYYY-MM-DD (ISO): 2025-01-01
function validateDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Helper to expand 2-digit year to 4-digit
  const expandYear = (yy: number): number => {
    // Assume 00-50 = 2000-2050, 51-99 = 1951-1999
    if (yy <= 50) return 2000 + yy;
    if (yy < 100) return 1900 + yy;
    return yy;
  };

  // Helper to validate date components
  const isValidDate = (m: number, d: number, y: number): boolean => {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
    // Check days in month
    const daysInMonth = new Date(y, m, 0).getDate();
    return d <= daysInMonth;
  };

  // Helper to format output
  const formatOutput = (m: number, d: number, y: number): string => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Try MMDDYYYY format (8 digits, no separators): 01012025
  const mmddyyyyMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = parseInt(year!, 10);
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
  }

  // Try MMDDYY format (6 digits, no separators): 010125
  const mmddyyMatch = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (mmddyyMatch) {
    const [, month, day, year] = mmddyyMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = expandYear(parseInt(year!, 10));
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
  }

  // Try MDYY format (4 digits, single digit month/day): 1125 → 01/01/25
  const mdyyMatch = trimmed.match(/^(\d)(\d)(\d{2})$/);
  if (mdyyMatch) {
    const [, month, day, year] = mdyyMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = expandYear(parseInt(year!, 10));
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
  }

  // Try MM/DD/YYYY format with separators: 1/1/2025, 01/01/2025
  const mdyFullMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (mdyFullMatch) {
    const [, month, day, year] = mdyFullMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = parseInt(year!, 10);
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
  }

  // Try MM/DD/YY format with separators: 1/1/25, 01/01/25
  const mdyShortMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (mdyShortMatch) {
    const [, month, day, year] = mdyShortMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = expandYear(parseInt(year!, 10));
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
  }
  
  // Try YYYY-MM-DD format (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const m = parseInt(month!, 10), d = parseInt(day!, 10), y = parseInt(year!, 10);
    if (isValidDate(m, d, y)) return formatOutput(m, d, y);
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
  
  // Throttle for keyboard repeat
  const lastKeyTimeRef = useRef(0);
  const keyRepeatDelay = 150; // ms between repeats when holding key

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

  // Add/subtract days from a date string
  const addDays = (dateStr: string, days: number): string => {
    let date = parseLocalDate(dateStr);
    if (!date) {
      date = new Date();
    }
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Adjust date by +/- 1 day (called on keyboard +/- or arrow keys)
  const adjustDate = (direction: number) => {
    const currentDate = value || new Date().toISOString().split('T')[0];
    const newValue = addDays(currentDate!, direction);
    onChange(newValue);
    
    // Update view date to show the new month
    const newDate = parseLocalDate(newValue);
    if (newDate) setViewDate(newDate);
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
            onChange={e => {
              // Only allow valid date characters: numbers, /, -, .
              const filtered = e.target.value.replace(/[^0-9\/\-\.]/g, '');
              setTextValue(filtered);
              setInputError(false);
            }}
            onBlur={handleTextBlur}
            onKeyDown={(e) => {
              // Handle Enter key
              if (e.key === 'Enter') {
                handleTextBlur();
                return;
              }
              // Handle +/- and arrow keys for increment/decrement
              if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
                e.preventDefault();
                // Throttle key repeats
                const now = Date.now();
                if (now - lastKeyTimeRef.current >= keyRepeatDelay) {
                  lastKeyTimeRef.current = now;
                  adjustDate(1);
                }
                return;
              }
              if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') {
                e.preventDefault();
                // Throttle key repeats
                const now = Date.now();
                if (now - lastKeyTimeRef.current >= keyRepeatDelay) {
                  lastKeyTimeRef.current = now;
                  adjustDate(-1);
                }
                return;
              }
            }}
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
        {hasError && <p className="text-xs text-red-500 mt-1">{error || 'Invalid date (try: 010125, 1/1/25, or 01/01/2025)'}</p>}

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