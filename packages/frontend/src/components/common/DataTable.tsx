import { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from './Card';

// Column definition
export interface DataTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Function to render the cell content */
  render: (item: T) => ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Function to get the sort value (defaults to render output if string) */
  sortValue?: (item: T) => string | number;
  /** Column width class (e.g., 'w-48', 'min-w-[200px]') */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on smaller screens */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data array */
  data: T[];
  /** Unique key for each row */
  rowKey: (item: T) => string;
  /** Click handler for rows */
  onRowClick?: (item: T) => void;
  /** Current sort field (column key) */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Sort handler */
  onSort?: (field: string) => void;
  /** Content to show when data is empty */
  emptyState?: ReactNode;
  /** Filters/search bar content */
  filters?: ReactNode;
  /** Additional class for the container */
  className?: string;
  /** Loading state */
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  emptyState,
  filters,
  className,
  loading = false,
}: DataTableProps<T>) {
  const handleSort = (column: DataTableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortField !== columnKey) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return (
      <Card className={clsx('flex flex-col h-full', className)}>
        {filters && <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">{filters}</div>}
        <div className="flex items-center justify-center flex-1 p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      </Card>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <Card className={clsx('flex flex-col h-full', className)}>
        {filters && <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">{filters}</div>}
        <div className="flex-1">{emptyState}</div>
      </Card>
    );
  }

  return (
    <Card className={clsx('flex flex-col h-full overflow-hidden', className)}>
      {/* Filters Section - Fixed at top */}
      {filters && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          {filters}
        </div>
      )}

      {/* Table Container - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300',
                    getAlignment(column.align),
                    column.width,
                    column.sortable && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none',
                    column.hideOnMobile && 'hidden md:table-cell'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className={clsx(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {column.sortable && <SortIcon columnKey={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {data.map((item) => (
              <tr
                key={rowKey(item)}
                className={clsx(
                  'border-b border-slate-100 dark:border-slate-800',
                  onRowClick && 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer',
                  'transition-colors'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-4 py-3 text-sm',
                      getAlignment(column.align),
                      column.width,
                      column.hideOnMobile && 'hidden md:table-cell'
                    )}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count footer - Fixed at bottom */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 bg-white dark:bg-slate-900">
        {data.length} {data.length === 1 ? 'item' : 'items'}
      </div>
    </Card>
  );
}