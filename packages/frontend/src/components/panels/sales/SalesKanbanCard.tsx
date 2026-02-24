// ============================================================================
// SalesKanbanCard
// Location: src/components/panels/sales/SalesKanbanCard.tsx
//
// Shared Kanban card component used by both DealsPage and LeadsPage.
// Replaces the near-identical DealCard and LeadCard inline components.
//
// Variants:
//   - Deal: has status (active/won/lost) → drives border color, status icon, draggability
//   - Lead: has label badge and optional source footer
// ============================================================================

import { clsx } from 'clsx';
import { Building2, User, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { KanbanCardProps } from '@/components/common/KanbanBoard';

// ============================================================================
// Shared data shape used by both DealsPage and LeadsPage
// ============================================================================

export interface SalesCardData {
  id: string;
  title: string;
  companyName?: string;
  contactName?: string;
  value?: number;
  owner?: { name: string };
  // Deal-specific
  status?: 'active' | 'won' | 'lost';
  // Lead-specific
  label?: { text: string; color: string | undefined };
  source?: string;
  createdAt: string;
}

// ============================================================================
// Component
// ============================================================================

export function SalesKanbanCard({
  item,
  onClick,
  onDragStart,
  isDragging,
}: KanbanCardProps<SalesCardData>) {
  // Deal mode: status drives draggability, borders, and the status icon
  const isDeal = item.status !== undefined;
  const isLost  = item.status === 'lost';
  const isWon   = item.status === 'won';
  const isDraggable = isDeal ? item.status === 'active' : true;

  const StatusIcon = isWon ? CheckCircle : isLost ? XCircle : Clock;
  const statusIconColor = isWon
    ? 'text-green-600 dark:text-green-400'
    : isLost
    ? 'text-red-600 dark:text-red-400'
    : 'text-blue-600 dark:text-blue-400';

  const valueColor = isDeal
    ? isWon   ? 'text-green-600 dark:text-green-400'
    : isLost  ? 'text-slate-400 line-through'
    :           'text-green-600 dark:text-green-400'
    : 'text-green-600 dark:text-green-400';

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
        onDragStart(e, item);
      }}
      onClick={() => onClick(item)}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'p-3 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 group',
        'flex flex-col h-[148px]',   // ← fixed height, flex-col
        isDragging && 'opacity-50 shadow-lg scale-105',
        isWon  && 'border-l-4 border-l-green-500',
        isLost && 'border-l-4 border-l-red-500 opacity-60',
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 flex-1">
          {item.title}
        </h4>

        {/* Deal: status icon */}
        {isDeal && (
          <StatusIcon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', statusIconColor)} />
        )}

        {/* Lead: label badge */}
        {!isDeal && item.label && (
          <span className={clsx('px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0', item.label.color || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
            {item.label.text}
          </span>
        )}
        {/* Spacer when no label on lead */}
        {!isDeal && !item.label && <span className="w-4 flex-shrink-0" />}
      </div>

      {/* Company / Contact — always 2 lines tall */}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 flex-1 min-h-0">
        <div className="flex items-center gap-1 h-4">
          {item.companyName ? (
            <>
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.companyName}</span>
            </>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 italic">—</span>
          )}
        </div>
        <div className="flex items-center gap-1 h-4">
          {item.contactName ? (
            <>
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.contactName}</span>
            </>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 italic">—</span>
          )}
        </div>
      </div>

      {/* Value + Owner */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 mt-1.5">
        {item.value !== undefined && item.value > 0 ? (
          <span className={clsx('text-sm font-semibold', valueColor)}>
            ${item.value.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">No value</span>
        )}

        {item.owner ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {item.owner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
              {item.owner.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">Unassigned</span>
        )}
      </div>

      {/* Lead-only: source — always reserve the line */}
      {!isDeal && (
        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate h-4">
          {item.source ? `Source: ${item.source}` : ''}
        </div>
      )}
    </div>
  );
}