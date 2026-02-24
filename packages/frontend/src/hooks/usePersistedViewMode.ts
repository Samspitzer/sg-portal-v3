// ============================================================================
// usePersistedViewMode
// Location: src/hooks/usePersistedViewMode.ts
//
// View mode state that persists to localStorage.
// Replaces the repeated useState + useEffect localStorage pattern.
//
// Usage:
//   const [viewMode, setViewMode] = usePersistedViewMode('deals-view-mode', 'kanban', ['list', 'kanban']);
// ============================================================================

import { useState, useEffect } from 'react';

export function usePersistedViewMode<T extends string>(
  storageKey: string,
  defaultValue: T,
  validValues: readonly T[]
): [T, (value: T) => void] {
  const [viewMode, setViewMode] = useState<T>(() => {
    const saved = localStorage.getItem(storageKey);
    return (saved && (validValues as readonly string[]).includes(saved)) ? (saved as T) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  return [viewMode, setViewMode];
}