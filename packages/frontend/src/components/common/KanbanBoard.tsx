// ============================================================================
// KanbanBoard Component
// Location: src/components/common/KanbanBoard.tsx
// 
// Reusable Pipedrive-style Kanban board with drag-and-drop support.
// Used by LeadsPage and DealsPage.
// ============================================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { GripVertical, Plus } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface KanbanColumn<T> {
  id: string;
  title: string;
  color: string;
  items: T[];
}

export interface KanbanCardProps<T> {
  item: T;
  onClick: (item: T) => void;
  onDragStart: (e: React.DragEvent, item: T) => void;
  isDragging: boolean;
}

export interface KanbanBoardProps<T> {
  /** Columns with their items */
  columns: KanbanColumn<T>[];
  /** Render function for card content */
  renderCard: (props: KanbanCardProps<T>) => React.ReactNode;
  /** Get unique key for item */
  getItemId: (item: T) => string;
  /** Get value for item (for column totals) */
  getItemValue?: (item: T) => number;
  /** Called when item is dropped in a new column */
  onItemMove: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  /** Called when card is clicked */
  onCardClick: (item: T) => void;
  /** Called when add button is clicked in a column */
  onAddClick?: (columnId: string) => void;
  /** Format value for display (e.g., currency formatting) */
  formatValue?: (value: number) => string;
  /** Show value totals in column headers */
  showTotals?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Default Card Component
// ============================================================================

export interface DefaultKanbanCardData {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  label?: { text: string; color: string };
  owner?: { name: string; avatar?: string };
  metadata?: { icon?: React.ReactNode; text: string }[];
}

export function DefaultKanbanCard({
  item,
  onClick,
  onDragStart,
  isDragging,
  formatValue,
}: KanbanCardProps<DefaultKanbanCardData> & { formatValue?: (value: number) => string }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={() => onClick(item)}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'p-3 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        'group',
        isDragging && 'opacity-50 shadow-lg scale-105'
      )}
    >
      {/* Drag Handle + Title Row */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">
              {item.title}
            </h4>
            {item.label && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                  item.label.color
                )}
              >
                {item.label.text}
              </span>
            )}
          </div>
          
          {item.subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Value and Owner Row */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        {item.value !== undefined && (
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {formatValue ? formatValue(item.value) : item.value}
          </span>
        )}
        
        {item.owner && (
          <div className="flex items-center gap-1.5">
            {item.owner.avatar ? (
              <img
                src={item.owner.avatar}
                alt={item.owner.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                  {item.owner.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {item.owner.name}
            </span>
          </div>
        )}
      </div>

      {/* Metadata Row */}
      {item.metadata && item.metadata.length > 0 && (
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
          {item.metadata.map((meta, idx) => (
            <div key={idx} className="flex items-center gap-1">
              {meta.icon}
              <span>{meta.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Column Component
// ============================================================================

interface KanbanColumnProps<T> {
  column: KanbanColumn<T>;
  renderCard: (props: KanbanCardProps<T>) => React.ReactNode;
  getItemId: (item: T) => string;
  getItemValue?: (item: T) => number;
  formatValue?: (value: number) => string;
  showTotals?: boolean;
  onItemMove: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  onCardClick: (item: T) => void;
  onAddClick?: (columnId: string) => void;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  draggedFromColumn: string | null;
  setDraggedFromColumn: (id: string | null) => void;
}

function KanbanColumnComponent<T>({
  column,
  renderCard,
  getItemId,
  getItemValue,
  formatValue,
  showTotals = true,
  onItemMove,
  onCardClick,
  onAddClick,
  draggedItemId,
  setDraggedItemId,
  draggedFromColumn,
  setDraggedFromColumn,
}: KanbanColumnProps<T>) {
  const [isDragOver, setIsDragOver] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  // Calculate column total
  const columnTotal = useMemo(() => {
    if (!getItemValue) return 0;
    return column.items.reduce((sum, item) => sum + (getItemValue(item) || 0), 0);
  }, [column.items, getItemValue]);

  const handleDragStart = useCallback((e: React.DragEvent, item: T) => {
    setDraggedItemId(getItemId(item));
    setDraggedFromColumn(column.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [column.id, getItemId, setDraggedItemId, setDraggedFromColumn]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (draggedItemId && draggedFromColumn && draggedFromColumn !== column.id) {
      onItemMove(draggedItemId, draggedFromColumn, column.id);
    }
    
    setDraggedItemId(null);
    setDraggedFromColumn(null);
  }, [draggedItemId, draggedFromColumn, column.id, onItemMove, setDraggedItemId, setDraggedFromColumn]);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDraggedFromColumn(null);
    setIsDragOver(false);
  }, [setDraggedItemId, setDraggedFromColumn]);

  return (
    <div
      ref={columnRef}
      className={clsx(
        'flex flex-col w-72 flex-shrink-0',
        'bg-slate-50 dark:bg-slate-900/50 rounded-xl',
        'border border-slate-200 dark:border-slate-700',
        isDragOver && 'ring-2 ring-brand-500 ring-opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex-1 truncate">
            {column.title}
          </h3>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            {column.items.length}
          </span>
          {onAddClick && (
            <button
              onClick={() => onAddClick(column.id)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              title={`Add to ${column.title}`}
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        
        {showTotals && getItemValue && columnTotal > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatValue ? formatValue(columnTotal) : columnTotal}
          </p>
        )}
      </div>

      {/* Cards Container */}
      <div
        className={clsx(
          'flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)]',
          isDragOver && 'bg-brand-50/50 dark:bg-brand-900/10'
        )}
      >
        {column.items.length === 0 ? (
          <div className={clsx(
            'h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500',
            isDragOver ? 'border-2 border-dashed border-brand-400 rounded-lg' : ''
          )}>
            {isDragOver ? 'Drop here' : 'No items'}
          </div>
        ) : (
          column.items.map((item) => (
            <div key={getItemId(item)} onDragEnd={handleDragEnd}>
              {renderCard({
                item,
                onClick: onCardClick,
                onDragStart: handleDragStart,
                isDragging: getItemId(item) === draggedItemId,
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main KanbanBoard Component
// ============================================================================

export function KanbanBoard<T>({
  columns,
  renderCard,
  getItemId,
  getItemValue,
  onItemMove,
  onCardClick,
  onAddClick,
  formatValue,
  showTotals = true,
  className,
}: KanbanBoardProps<T>) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);

  return (
    <div
      className={clsx(
        'flex gap-4 overflow-x-auto pb-4',
        'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent',
        className
      )}
    >
      {columns.map((column) => (
        <KanbanColumnComponent
          key={column.id}
          column={column}
          renderCard={renderCard}
          getItemId={getItemId}
          getItemValue={getItemValue}
          formatValue={formatValue}
          showTotals={showTotals}
          onItemMove={onItemMove}
          onCardClick={onCardClick}
          onAddClick={onAddClick}
          draggedItemId={draggedItemId}
          setDraggedItemId={setDraggedItemId}
          draggedFromColumn={draggedFromColumn}
          setDraggedFromColumn={setDraggedFromColumn}
        />
      ))}
    </div>
  );
}

export default KanbanBoard;