// ============================================================================
// useTableSort
// Location: src/hooks/useTableSort.ts
//
// Reusable sort state for DataTable pages.
// Replaces the repeated sortField/sortDirection/handleSort pattern.
// ============================================================================

import { useState, useCallback } from 'react';

export function useTableSort<TField extends string>(
  defaultField: TField,
  defaultDirection: 'asc' | 'desc' = 'asc'
) {
  const [sortField, setSortField] = useState<TField>(defaultField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultDirection);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as TField);
      setSortDirection('asc');
    }
  }, [sortField]);

  return { sortField, sortDirection, handleSort };
}