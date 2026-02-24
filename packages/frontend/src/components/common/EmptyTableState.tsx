// ============================================================================
// EmptyTableState
// Location: src/components/common/EmptyTableState.tsx
//
// Reusable empty state for DataTable pages.
// Replaces the repeated CardContent + icon + heading + text + button pattern.
// ============================================================================

import React from 'react';
import { Plus } from 'lucide-react';
import { CardContent } from './Card';
import { Button } from './Button';

interface EmptyTableStateProps {
  /** Lucide icon component */
  icon: React.ElementType;
  /** Whether any filters are currently active — changes the message */
  hasFilters: boolean;
  /** Singular entity name, e.g. "company", "contact", "deal" */
  entityName: string;
  /** Optional callback for the "Add" button (only shown when no filters are active) */
  onAdd?: () => void;
  /** Button label, e.g. "Add Company". Defaults to "Add {entityName}" */
  addLabel?: string;
}

export function EmptyTableState({
  icon: Icon,
  hasFilters,
  entityName,
  onAdd,
  addLabel,
}: EmptyTableStateProps) {
  const label = addLabel ?? `Add ${entityName.charAt(0).toUpperCase() + entityName.slice(1)}`;

  return (
    <CardContent className="p-12 text-center">
      <Icon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
      <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
        {hasFilters ? `No ${entityName}s found` : `No ${entityName}s yet`}
      </h3>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        {hasFilters
          ? 'Try adjusting your filters or search term'
          : `Get started by adding your first ${entityName}`}
      </p>
      {!hasFilters && onAdd && (
        <Button variant="primary" className="mt-4" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          {label}
        </Button>
      )}
    </CardContent>
  );
}