// ===========================================================================
// TimePicker Component - Enhanced with Text Input + Dropdown Picker
// Location: packages/frontend/src/components/common/TimePicker.tsx
// ===========================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Clock, X } from 'lucide-react';

interface TimePickerProps {
  label?: string;
  value: string; // 24-hour format: HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  step?: number; // Minutes step (default: 15)
}

// Validate and parse user input (HH:MM or H:MM AM/PM)
function validateTimeInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Try 24-hour format HH:MM
  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const [, hour, minute] = h24Match;
    const h = parseInt(hour!, 10), m = parseInt(minute!, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  
  // Try 12-hour format H:MM AM/PM
  const h12Match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)$/);
  if (h12Match) {
    const [, hour, minute, period] = h12Match;
    let h = parseInt(hour!, 10);
    const m = parseInt(minute!, 10);
    const isPM = period!.toLowerCase() === 'pm';
    
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  
  return null; // Invalid
}

// Format time for display (12-hour with AM/PM)
function formatDisplayTime(value: string): string {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const hour = h ?? 0;
  const minute = m ?? 0;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function TimePicker({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  className,
  error,
  step = 15
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  
  // Throttle for keyboard repeat
  const lastKeyTimeRef = useRef(0);
  const keyRepeatDelay = 150; // ms between repeats when holding key

  // Generate time options based on step
  const timeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += step) {
        const value24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        options.push({ value: value24, label });
      }
    }
    return options;
  }, [step]);

  // Sync text value with prop value
  useEffect(() => {
    if (value) {
      setTextValue(formatDisplayTime(value));
    } else {
      setTextValue('');
    }
    setInputError(false);
  }, [value]);

  // Check dropdown position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 280;
      setDropdownPosition(spaceBelow < dropdownHeight ? 'top' : 'bottom');
    }
  }, [isOpen]);

  // Scroll to selected time when opening
  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' });
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectTime = (timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  };

  // Add/subtract minutes from current time
  const addMinutes = (currentValue: string, minutes: number): string => {
    if (!currentValue) return '09:00';
    
    const [h, m] = currentValue.split(':').map(Number);
    let totalMinutes = (h ?? 0) * 60 + (m ?? 0) + minutes;
    
    // Wrap around 24 hours
    while (totalMinutes < 0) totalMinutes += 24 * 60;
    while (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
    
    const newHour = Math.floor(totalMinutes / 60);
    const newMinute = totalMinutes % 60;
    
    return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
  };

  // Adjust time by +/- step minutes (called on keyboard +/- or arrow keys)
  const adjustTime = (direction: number) => {
    const newValue = addMinutes(value || '09:00', direction * step);
    onChange(newValue);
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
    const result = validateTimeInput(textValue);
    if (result === null) {
      setInputError(true);
    } else {
      setInputError(false);
      onChange(result);
    }
  };

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
              // Only allow valid time characters: numbers, :, space, a, m, p, A, M, P
              const filtered = e.target.value.replace(/[^0-9:\sAMPamp]/g, '');
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
                  adjustTime(1);
                }
                return;
              }
              if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') {
                e.preventDefault();
                // Throttle key repeats
                const now = Date.now();
                if (now - lastKeyTimeRef.current >= keyRepeatDelay) {
                  lastKeyTimeRef.current = now;
                  adjustTime(-1);
                }
                return;
              }
            }}
            placeholder={placeholder}
            className={clsx(
              'w-full h-9 pl-3 pr-16 text-sm text-left rounded-lg border transition-colors',
              'bg-white dark:bg-slate-800',
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
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          </div>
        </div>
        {hasError && <p className="text-xs text-red-500 mt-1">{error || 'Invalid time format (use H:MM AM/PM)'}</p>}

        {/* Dropdown */}
        {isOpen && (
          <div
            className={clsx(
              'absolute left-0 right-0 z-50 py-1 max-h-60 overflow-y-auto',
              'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
              'border border-slate-200 dark:border-slate-700',
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
            {timeOptions.map((option) => (
              <button
                key={option.value}
                ref={value === option.value ? selectedRef : null}
                type="button"
                onClick={() => selectTime(option.value)}
                className={clsx(
                  'w-full px-3 py-1.5 text-sm text-left transition-colors',
                  value === option.value
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}