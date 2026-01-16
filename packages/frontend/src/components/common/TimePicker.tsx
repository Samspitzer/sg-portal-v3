import { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';

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

export function TimePicker({ 
  label, 
  value, 
  onChange, 
  placeholder = 'Select time', 
  required, 
  className, 
  error,
  step = 15 
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  // Generate time options
  const timeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += step) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const value24 = `${h}:${m}`;
        
        // Format as 12-hour with AM/PM for display
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const label = `${hour12}:${m} ${ampm}`;
        
        options.push({ value: value24, label });
      }
    }
    return options;
  }, [step]);

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return '';
    const option = timeOptions.find(o => o.value === value);
    return option?.label || value;
  }, [value, timeOptions]);

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

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const adjustTime = (direction: number) => {
    if (!value) {
      // Default to 9:00 AM if no value
      onChange('09:00');
      return;
    }
    
    const currentIndex = timeOptions.findIndex(o => o.value === value);
    if (currentIndex === -1) {
      onChange('09:00');
      return;
    }
    
    const newIndex = Math.max(0, Math.min(timeOptions.length - 1, currentIndex + direction));
    const newOption = timeOptions[newIndex];
    if (newOption) {
      onChange(newOption.value);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const setNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    // Round to nearest step
    const m = String(Math.round(now.getMinutes() / step) * step % 60).padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full h-9 px-3 text-sm text-left rounded-lg border transition-colors',
            'bg-white dark:bg-slate-800',
            'flex items-center justify-between gap-2',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className={clsx(
              'truncate',
              displayValue ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
            )}>
              {displayValue || placeholder}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={clear}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            <div className="flex flex-col -my-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); adjustTime(-1); }}
                className="p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <ChevronUp className="w-3 h-3 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); adjustTime(1); }}
                className="p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={clsx(
              'absolute left-0 right-0 z-50',
              'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
              'border border-slate-200 dark:border-slate-700',
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
            {/* Time list */}
            <div className="max-h-60 overflow-y-auto py-1">
              {timeOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => selectTime(option.value)}
                    className={clsx(
                      'w-full px-3 py-1.5 text-sm text-left transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={clear}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={setNow}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Now
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export default TimePicker;