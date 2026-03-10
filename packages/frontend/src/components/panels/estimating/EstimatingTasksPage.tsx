// ============================================================================
// EstimatingTasksPage
// Location: src/components/panels/estimating/EstimatingTasksPage.tsx
//
// Dedicated tasks view for the Estimating panel — shows only tasks linked
// to estimate entities (type === 'estimate').
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Check, Clock, User, CheckSquare,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button, SearchInput, SelectFilter, FilterBar, FilterCount,
  DataTable, type DataTableColumn, EmptyTableState,
  TaskTypeIcon, QuickViewModal, type QuickViewField,
} from '@/components/common';
import { useUsersStore, useToast } from '@/contexts';
import { useTaskStore, type Task } from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { useFormStack } from '@/components/panels/add-forms';
import { useDocumentTitle, useTableSort } from '@/hooks';
import { formatDate, taskMatchesTimeFilter } from '@/utils/dateUtils';
import { TASK_PRIORITY_CONFIG, type TimeFilter } from '@/utils/taskConstants';

// ── Task Quick View ────────────────────────────────────────────────────────────

const TASK_PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high',   label: 'High',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, (m! - 1), d!);
}

function TaskDueBadge({ dueDate }: { dueDate?: string }) {
  if (!dueDate) return <span className="text-slate-400 text-xs">—</span>;
  const date = parseLocalDate(dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isOverdue = date < today;
  const isToday = date.getTime() === today.getTime();
  return (
    <span className={clsx('text-xs font-medium', isOverdue && 'text-red-600 dark:text-red-400', isToday && 'text-amber-600 dark:text-amber-400', !isOverdue && !isToday && 'text-slate-500 dark:text-slate-400')}>
      {isToday ? 'Today' : isOverdue ? `${Math.floor((today.getTime() - date.getTime()) / 86400000)}d overdue` : formatDate(dueDate, 'short')}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EstimatingTasksPage() {
  useDocumentTitle('Estimating Tasks');

  const { tasks, completeTask, reopenTask, deleteTask } = useTaskStore();
  const { users } = useUsersStore();
  const { getActiveTaskTypes, taskTypes: allTaskTypes } = useTaskTypesStore();
  const toast = useToast();
  const { openAddTask } = useFormStack();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  const { sortField, sortDirection, handleSort } = useTableSort<string>('dueDate');

  // Only estimate-linked tasks
  const estimateTasks = useMemo(() =>
    tasks.filter(t => t.linkedItem?.type === 'estimate'),
    [tasks]
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return estimateTasks.filter(task => {
      const isClosed = task.status === 'completed' || task.status === 'cancelled';
      if (isClosed && !showClosed) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesProject = task.linkedItem?.name.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesProject) return false;
      }
      if (selectedUser && task.assignedUserId !== selectedUser) return false;
      if (selectedType && task.type !== selectedType) return false;
      if (timeFilter !== 'all' && !taskMatchesTimeFilter(task.dueDate, timeFilter)) return false;
      return true;
    }).sort((a, b) => {
      const mult = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return mult * a.dueDate.localeCompare(b.dueDate);
      }
      if (sortField === 'title') return mult * a.title.localeCompare(b.title);
      if (sortField === 'status') return mult * a.status.localeCompare(b.status);
      return 0;
    });
  }, [estimateTasks, search, selectedUser, selectedType, timeFilter, showClosed, sortField, sortDirection]);

  const userOptions = useMemo(() => {
    const ids = new Set(estimateTasks.map(t => t.assignedUserId));
    return users.filter(u => ids.has(u.id)).map(u => ({ value: u.id, label: u.name }));
  }, [estimateTasks, users]);

  const taskTypeOptions = useMemo(() => {
    const active = getActiveTaskTypes();
    const used = new Set(estimateTasks.map(t => t.type).filter(Boolean));
    return active.filter(tt => used.has(tt.value)).map(tt => ({ value: tt.value, label: tt.label }));
  }, [estimateTasks, getActiveTaskTypes]);

  const hasFilters = !!(search || selectedUser || selectedType || timeFilter !== 'all');

  const handleAddTask = useCallback(() => {
    openAddTask({ defaultLinkedItemType: 'estimate' });
  }, [openAddTask]);

  const handleCompleteTask = useCallback(async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (task.status === 'completed') {
        await reopenTask(task.id);
        toast.info('Reopened', `"${task.title}" reopened`);
      } else {
        await completeTask(task.id);
        toast.success('Done', `"${task.title}" completed`);
      }
    } catch {
      toast.error('Error', 'Could not update task');
    }
  }, [completeTask, reopenTask, toast]);

  const handleMarkDone = useCallback(async () => {
    if (!quickViewTask) return;
    await completeTask(quickViewTask.id);
    toast.success('Task Completed', 'Task has been marked as done');
    setQuickViewTask(null);
  }, [quickViewTask, completeTask, toast]);

  const handleDeleteTask = useCallback(async () => {
    if (!quickViewTask) return;
    await deleteTask(quickViewTask.id);
    toast.success('Task Deleted', 'Task has been removed');
    setQuickViewTask(null);
  }, [quickViewTask, deleteTask, toast]);

  const columns: DataTableColumn<Task>[] = [
    {
      key: 'status',
      header: '',
      width: 44,
      render: (task: Task) => {
        const isDone = task.status === 'completed';
        return (
          <button
            onClick={e => handleCompleteTask(task, e)}
            className={clsx(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
              isDone
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
            )}
            title={isDone ? 'Reopen task' : 'Mark complete'}
          >
            {isDone && <Check className="w-3 h-3" />}
          </button>
        );
      },
    },
    {
      key: 'title',
      header: 'Task',
      sortable: true,
      render: (task: Task) => {
        const taskType = allTaskTypes.find(tt => tt.value === task.type);
        const isDone = task.status === 'completed';
        return (
          <div className="min-w-0">
            <div className={clsx('flex items-center gap-2', isDone && 'opacity-60')}>
              {taskType && <TaskTypeIcon icon={taskType.icon} className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              <span className={clsx('text-sm font-medium text-slate-900 dark:text-white truncate', isDone && 'line-through text-slate-400')}>{task.title}</span>
            </div>
            {task.linkedItem && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-teal-600 dark:text-teal-400 truncate">{task.linkedItem.name}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due',
      sortable: true,
      width: 110,
      render: (task: Task) => <TaskDueBadge dueDate={task.dueDate} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 90,
      render: (task: Task) => {
        if (!task.priority) return <span className="text-xs text-slate-400">—</span>;
        const cfg = TASK_PRIORITY_CONFIG.find(p => p.value === task.priority);
        return cfg ? (
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>{cfg.label}</span>
        ) : null;
      },
    },
    {
      key: 'assignedUserName',
      header: 'Assigned',
      width: 130,
      render: (task: Task) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{task.assignedUserName || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status' as keyof Task,
      header: 'Status',
      sortable: true,
      width: 110,
      render: (task: Task) => {
        const map: Record<string, string> = {
          todo: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
          in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const label: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed', cancelled: 'Cancelled' };
        return <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', map[task.status] ?? map.todo)}>{label[task.status] ?? task.status}</span>;
      },
    },
  ];

  // Quick view modal fields
  const quickViewFields = useMemo((): QuickViewField[] => {
    if (!quickViewTask) return [];
    const taskType = allTaskTypes.find(t => t.value === quickViewTask.type);
    const assignedUser = users.find(u => u.id === quickViewTask.assignedUserId);
    const fields: QuickViewField[] = [];
    if (taskType) fields.push({ label: 'Type', value: <span className="flex items-center gap-1.5"><TaskTypeIcon icon={taskType.icon} className="w-4 h-4" />{taskType.label}</span> });
    if (assignedUser) fields.push({ label: 'Assigned To', value: assignedUser.name, icon: <User className="w-4 h-4 text-slate-400" /> });
    if (quickViewTask.linkedItem) fields.push({ label: 'Project', value: quickViewTask.linkedItem.name });
    if (quickViewTask.description) fields.push({ label: 'Description', value: quickViewTask.description });
    return fields;
  }, [quickViewTask, allTaskTypes, users]);

  const quickViewBadges = useMemo(() => {
    if (!quickViewTask) return [];
    const priority = TASK_PRIORITIES.find(p => p.value === quickViewTask.priority);
    return [
      {
        label: quickViewTask.status === 'completed' ? 'Completed' : quickViewTask.status === 'in_progress' ? 'In Progress' : 'Pending',
        className: quickViewTask.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : quickViewTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      },
      ...(priority ? [{ label: priority.label, className: priority.color }] : []),
    ];
  }, [quickViewTask]);

  return (
    <Page
      title="Estimating Tasks"
      fillHeight
      actions={
        <Button onClick={handleAddTask}>
          <Plus className="w-4 h-4 mr-1.5" />New Task
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <FilterBar
          secondaryRow={
            <div className="flex flex-wrap gap-1.5">
              {TIME_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeFilter(opt.value)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    timeFilter === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
          rightContent={<FilterCount count={filteredTasks.length} singular="task" />}
        >
          <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…" className="w-48 [&_input]:h-[34px] [&_input]:text-sm" />
          <SelectFilter label="Assigned To" value={selectedUser} onChange={setSelectedUser} options={userOptions} icon={User} className="w-36" />
          {taskTypeOptions.length > 0 && (
            <SelectFilter label="Type" value={selectedType} onChange={setSelectedType} options={taskTypeOptions} className="w-36" />
          )}
          <button
            onClick={() => setShowClosed(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border h-[34px]',
              showClosed
                ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            )}
          >
            <Check className="w-3 h-3" />
            Show closed
          </button>
        </FilterBar>

        <div className="flex-1 min-h-0">
          <DataTable
            data={filteredTasks}
            columns={columns}
            rowKey={(t: Task) => t.id}
            onRowClick={setQuickViewTask}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyState={
              <EmptyTableState
                icon={CheckSquare}
                hasFilters={hasFilters}
                entityName="estimating task"
                onAdd={handleAddTask}
                addLabel="New Task"
              />
            }
          />
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewTask}
        onClose={() => setQuickViewTask(null)}
        title={quickViewTask?.title ?? ''}
        subtitle={
          <>
            {quickViewTask?.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(quickViewTask.dueDate, 'long')}
              </span>
            )}
          </>
        }
        icon={
          (() => {
            const tt = allTaskTypes.find(t => t.value === quickViewTask?.type);
            return tt ? <TaskTypeIcon icon={tt.icon} className="w-5 h-5 text-teal-600 dark:text-teal-400" /> : <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
          })()
        }
        badges={quickViewBadges}
        fields={quickViewFields}
        notes={quickViewTask?.notes}
        footerMeta={quickViewTask ? <>Created {new Date(quickViewTask.createdAt).toLocaleString()}</> : undefined}
        leftActions={[{ label: 'Delete', variant: 'danger', onClick: handleDeleteTask }]}
        rightActions={[
          { label: 'Close', variant: 'secondary', onClick: () => setQuickViewTask(null) },
          ...(quickViewTask?.status !== 'completed' ? [{ label: 'Mark Done', variant: 'primary' as const, onClick: handleMarkDone }] : []),
        ]}
      />
    </Page>
  );
}

export default EstimatingTasksPage;