// ============================================================================
// Date Utilities
// Location: src/utils/dateUtils.ts
// 
// Centralized date parsing and formatting functions.
// Use these instead of duplicating date logic in components.
// ============================================================================

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date object
 * Returns current date if invalid
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 0;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return new Date(year, month - 1, day);
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Format date for display
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param format - 'short' (1/15/2026), 'long' (Monday, January 15), 'display' (01/15/2026)
 */
export function formatDate(
  dateStr: string, 
  format: 'short' | 'long' | 'display' = 'short'
): string {
  const date = parseLocalDate(dateStr);
  
  switch (format) {
    case 'display':
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
    case 'long':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'short':
    default:
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
  }
}

/**
 * Add days to a date
 * @param dateStr - ISO date string
 * @param days - Number of days to add (negative to subtract)
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return toISODateString(date);
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayISO();
}

/**
 * Check if a date is in the past
 */
export function isPast(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(dateStr: string): boolean {
  return dateStr === addDays(getTodayISO(), 1);
}