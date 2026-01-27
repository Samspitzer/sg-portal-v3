import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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
  sortValue?: (item: T) => string | number | null | undefined;
  /** Initial column width in pixels */
  width?: number;
  /** Minimum column width in pixels */
  minWidth?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on smaller screens */
  hideOnMobile?: boolean;
  /** Whether column is resizable (default true) */
  resizable?: boolean;
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
  /** Sort handler - receives field name, component manages direction toggle */
  onSort?: (field: string) => void;
  /** Content to show when data is empty */
  emptyState?: ReactNode;
  /** Filters/search bar content */
  filters?: ReactNode;
  /** Additional class for the container */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Enable column resizing (default true) */
  resizable?: boolean;
}

// Default column widths
const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  sortField,
  sortDirection = 'asc',
  onSort,
  emptyState,
  filters,
  className,
  loading = false,
  resizable = true,
}: DataTableProps<T>) {
  // Track column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(col => {
      widths[col.key] = col.width || DEFAULT_WIDTH;
    });
    return widths;
  });

  // Refs for resize handling
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Handle sort click - just pass field, let parent manage direction
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    onSort(column.key);
  };

  // Start column resize
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey] || DEFAULT_WIDTH;
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(MIN_WIDTH, startWidth.current + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  }, []);

  // End column resize
  const handleResizeEnd = useCallback(() => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleResizeMove]);

  // Double-click to auto-fit column width
  const handleDoubleClickResize = useCallback((columnKey: string) => {
    if (!tableRef.current) return;
    
    // Find all cells in this column and measure content width
    const cells = tableRef.current.querySelectorAll(`td[data-column="${columnKey}"], th[data-column="${columnKey}"]`);
    let maxWidth = MIN_WIDTH;
    
    cells.forEach(cell => {
      // Create a temporary span to measure content
      const content = cell.textContent || '';
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'nowrap';
      span.style.fontSize = '14px';
      span.textContent = content;
      document.body.appendChild(span);
      const width = span.offsetWidth + 40; // Add padding
      document.body.removeChild(span);
      maxWidth = Math.max(maxWidth, width);
    });
    
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: Math.min(maxWidth, 400), // Cap at 400px
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // Sort icon component
  const SortIcon = ({ columnKey, isSortable }: { columnKey: string; isSortable?: boolean }) => {
    if (!isSortable) return null;
    
    if (sortField !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-brand-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-brand-600" />
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

      {/* Table Container - Scrollable both horizontally and vertically */}
      <div className="flex-1 overflow-auto min-h-0">
        <table ref={tableRef} className="w-full border-collapse" style={{ minWidth: 'max-content' }}>
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {columns.map((column) => (
                <th
                  key={column.key}
                  data-column={column.key}
                  style={{ 
                    width: columnWidths[column.key] || DEFAULT_WIDTH,
                    minWidth: column.minWidth || MIN_WIDTH,
                  }}
                  className={clsx(
                    'px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 relative whitespace-nowrap',
                    getAlignment(column.align),
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
                    <span className="truncate">{column.header}</span>
                    <SortIcon columnKey={column.key} isSortable={column.sortable} />
                  </div>
                  
                  {/* Resize handle */}
                  {resizable && column.resizable !== false && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-500/50 group flex items-center justify-center"
                      onMouseDown={(e) => handleResizeStart(e, column.key)}
                      onDoubleClick={() => handleDoubleClickResize(column.key)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-[2px] h-4 bg-slate-300 dark:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
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
                    data-column={column.key}
                    style={{ 
                      width: columnWidths[column.key] || DEFAULT_WIDTH,
                      minWidth: column.minWidth || MIN_WIDTH,
                    }}
                    className={clsx(
                      'px-4 py-3 text-sm',
                      getAlignment(column.align),
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