// ============================================================================
// ActivitiesPage - Sales Activities & Tasks
// Location: src/components/panels/sales/ActivitiesPage.tsx
//
// Mirrors TasksPage exactly, but only shows tasks linked to leads or deals.
// Cascading filters, show/hide closed tasks, QuickFilters for time.
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Activity,
  Plus,
  Target,
  TrendingUp,
  User,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Trash2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  SearchInput,
  SelectFilter,
  FilterBar,
  FilterCount,
  FilterToggle,
  QuickFilters,
  type QuickFilterOption,
  DataTable,
  type DataTableColumn,
  TaskTypeIcon,
  QuickViewModal,
  type QuickViewField,
  type QuickViewAction,
} from '@/components/common';
import { useFormStack } from '@/components/panels/add-forms';
import {
  useSalesStore,
  useUsersStore,
  useToast,
} from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { useDocumentTitle, useTableSort } from '@/hooks';
import { parseLocalDate, formatDate, taskMatchesTimeFilter } from '@/utils/dateUtils';
import { TASK_PRIORITY_CONFIG, type TimeFilter } from '@/utils/taskConstants';

// ============================================================================
// Types
// ============================================================================

type LinkedTypeFilter = 'all' | 'lead' | 'deal';

// ============================================================================
// Task Quick View
// ============================================================================

function TaskQuickView({
  task,
  isOpen,
  onClose,
  onEdit,
  onMarkDone,
  onDelete,
  users,
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
  users: { id: string; name: string }[];
}) {
  if (!task) return null;

  const assignedUser = users.find(u => u.id === task.assignedUserId);
  const priority = TASK_PRIORITY_CONFIG.find(p => p.value === task.priority);
  const isCompleted = task.status === 'completed';

  const badges: { label: string; className?: string }[] = [];
  if (priority) badges.push({ label: priority.label, className: priority.color });
  if (isCompleted) badges.push({ label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' });

  const fields: QuickViewField[] = [
    {
      label: 'Assigned To',
      value: assignedUser?.name,
      icon: <User className="w-4 h-4" />,
      hideIfEmpty: true,
    },
    {
      label: 'Due Date',
      value: task.dueDate ? formatDate(task.dueDate, 'short') : undefined,
      icon: <CalendarIcon className="w-4 h-4" />,
      hideIfEmpty: true,
    },
    {
      label: 'Linked Lead/Deal',
      value: task.linkedItem?.name,
      icon: task.linkedItem?.type === 'deal'
        ? <TrendingUp className="w-4 h-4" />
        : <Target className="w-4 h-4" />,
      onClick: task.linkedItem
        ? () => { window.location.href = `/sales/${task.linkedItem!.type}s/${task.linkedItem!.id}`; onClose(); }
        : undefined,
      hideIfEmpty: true,
    },
    {
      label: 'Company',
      value: task.linkedContact?.type === 'company' ? task.linkedContact.name : undefined,
      icon: <Building2 className="w-4 h-4" />,
      hideIfEmpty: true,
    },
    {
      label: 'Notes',
      value: task.notes,
      icon: <Activity className="w-4 h-4" />,
      hideIfEmpty: true,
      fullWidth: true,
    },
  ];

  const leftActions: QuickViewAction[] = !isCompleted ? [
    {
      label: 'Mark Done',
      icon: <Check className="w-4 h-4" />,
      onClick: onMarkDone,
      variant: 'secondary',
    },
  ] : [];

  const rightActions: QuickViewAction[] = [
    {
      label: 'Edit',
      onClick: onEdit,
      variant: 'secondary',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'danger',
    },
  ];

  return (
    <QuickViewModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      iconBgClass="bg-blue-100 dark:bg-blue-900/30"
      badges={badges}
      fields={fields}
      leftActions={leftActions}
      rightActions={rightActions}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivitiesPage() {
  useDocumentTitle('Sales Activities');
  const toast = useToast();

  const { leads, deals } = useSalesStore();
  const { users } = useUsersStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { taskTypes, getActiveTaskTypes } = useTaskTypesStore();
  const { openAddTask, openEditTask } = useFormStack();

  // State
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [linkedTypeFilter, setLinkedTypeFilter] = useState<LinkedTypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showClosed, setShowClosed] = useState(false);
  const { sortField, sortDirection, handleSort } = useTableSort<string>('dueDate');
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  void leads;
  void deals;

  // Only sales-linked tasks (lead or deal)
  const salesTasks = useMemo(() =>
    tasks.filter(task =>
      task.linkedItem?.type === 'lead' || task.linkedItem?.type === 'deal'
    ),
    [tasks]
  );

  // Cascading task type options (based on user + time + linkedType filters)
  const taskTypeOptions = useMemo(() => {
    const activeTypes = getActiveTaskTypes();
    const allTypeCounts = new Map<string, number>();
    const filteredTypeCounts = new Map<string, number>();

    salesTasks.forEach(t => {
      if (!t.type) return;
      const isClosed = t.status === 'completed' || t.status === 'cancelled';
      if (isClosed && !showClosed) return;

      allTypeCounts.set(t.type, (allTypeCounts.get(t.type) || 0) + 1);

      let matches = true;
      if (selectedUser) matches = t.assignedUserId === selectedUser;
      if (timeFilter !== 'all' && matches) matches = taskMatchesTimeFilter(t.dueDate, timeFilter);
      if (linkedTypeFilter !== 'all' && matches) matches = t.linkedItem?.type === linkedTypeFilter;

      if (matches) filteredTypeCounts.set(t.type, (filteredTypeCounts.get(t.type) || 0) + 1);
    });

    const hasActive = !!(selectedUser || timeFilter !== 'all' || linkedTypeFilter !== 'all');
    return activeTypes
      .map(tt => ({
        value: tt.value,
        label: tt.label,
        count: hasActive ? (filteredTypeCounts.get(tt.value) || 0) : (allTypeCounts.get(tt.value) || 0),
        disabled: hasActive ? (filteredTypeCounts.get(tt.value) || 0) === 0 : false,
      }))
      .filter(tt => (allTypeCounts.get(tt.value) || 0) > 0)
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [salesTasks, selectedUser, timeFilter, linkedTypeFilter, getActiveTaskTypes, showClosed]);

  // Cascading user options
  const userOptions = useMemo(() => {
    const allCounts = new Map<string, number>();
    const filtCounts = new Map<string, number>();

    salesTasks.forEach(t => {
      if (!t.assignedUserId) return;
      const isClosed = t.status === 'completed' || t.status === 'cancelled';
      if (isClosed && !showClosed) return;

      allCounts.set(t.assignedUserId, (allCounts.get(t.assignedUserId) || 0) + 1);

      let matches = true;
      if (selectedType) matches = t.type === selectedType;
      if (timeFilter !== 'all' && matches) matches = taskMatchesTimeFilter(t.dueDate, timeFilter);
      if (linkedTypeFilter !== 'all' && matches) matches = t.linkedItem?.type === linkedTypeFilter;

      if (matches) filtCounts.set(t.assignedUserId, (filtCounts.get(t.assignedUserId) || 0) + 1);
    });

    const hasActive = !!(selectedType || timeFilter !== 'all' || linkedTypeFilter !== 'all');
    return users
      .filter(u => u.isActive && (allCounts.get(u.id) || 0) > 0)
      .map(u => ({
        value: u.id,
        label: u.name,
        count: hasActive ? (filtCounts.get(u.id) || 0) : (allCounts.get(u.id) || 0),
        disabled: hasActive ? (filtCounts.get(u.id) || 0) === 0 : false,
      }))
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [salesTasks, users, selectedType, timeFilter, linkedTypeFilter, showClosed]);

  // Overdue count for QuickFilters warning
  const overdueCount = useMemo(() =>
    salesTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const d = parseLocalDate(t.dueDate); d.setHours(0, 0, 0, 0);
      return d < today;
    }).length,
    [salesTasks]
  );

  const timeFilterOptions: QuickFilterOption<TimeFilter>[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue', count: overdueCount, isWarning: true },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'next-week', label: 'Next Week' },
  ], [overdueCount]);

  // Linked type options (lead/deal toggle)
  const linkedTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'lead', label: 'Leads' },
    { value: 'deal', label: 'Deals' },
  ];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return salesTasks.filter(task => {
      const isClosed = task.status === 'completed' || task.status === 'cancelled';
      if (isClosed && !showClosed) return false;

      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        task.title.toLowerCase().includes(searchLower) ||
        task.linkedItem?.name.toLowerCase().includes(searchLower) ||
        task.linkedContact?.name.toLowerCase().includes(searchLower);

      const matchesUser = !selectedUser || task.assignedUserId === selectedUser;
      const matchesType = !selectedType || task.type === selectedType;
      const matchesLinkedType = linkedTypeFilter === 'all' || task.linkedItem?.type === linkedTypeFilter;
      const matchesTimeFilter = showClosed && isClosed ? true : taskMatchesTimeFilter(task.dueDate, timeFilter);

      return matchesSearch && matchesUser && matchesType && matchesLinkedType && matchesTimeFilter;
    });
  }, [salesTasks, search, selectedUser, selectedType, linkedTypeFilter, timeFilter, showClosed]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      switch (sortField) {
        case 'dueDate':
          aVal = a.dueDate ?? '';
          bVal = b.dueDate ?? '';
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'priority': {
          const order = { urgent: 0, high: 1, medium: 2, low: 3, undefined: 4 };
          aVal = order[a.priority as keyof typeof order] ?? 4;
          bVal = order[b.priority as keyof typeof order] ?? 4;
          break;
        }
        default:
          return 0;
      }

      if (aVal === bVal) return 0;
      const dir = sortDirection === 'asc' ? 1 : -1;
      return (aVal ?? '') < (bVal ?? '') ? -dir : dir;
    });
    return sorted;
  }, [filteredTasks, sortField, sortDirection]);

  // Handlers
  const handleAddActivity = useCallback(() => {
    openAddTask({});
  }, [openAddTask]);

  const handleMarkDone = useCallback(async (task: Task) => {
    try {
      await updateTask(task.id, { status: 'completed' } as Partial<TaskInput>);
      toast.success('Completed', `"${task.title}" marked as done`);
    } catch {
      toast.error('Error', 'Failed to update task');
    }
  }, [updateTask, toast]);

  const handleDeleteTask = useCallback(async () => {
    if (!quickViewTask) return;
    try {
      await deleteTask(quickViewTask.id);
      toast.success('Deleted', 'Task has been removed');
      setQuickViewTask(null);
    } catch {
      toast.error('Error', 'Failed to delete task');
    }
  }, [quickViewTask, deleteTask, toast]);

  const handleEditTask = useCallback((task: Task) => {
    openEditTask({ task });
    setQuickViewTask(null);
  }, [openEditTask]);

  // Table columns
  const columns: DataTableColumn<Task>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Activity',
      sortable: true,
      render: (task: Task) => {
        const type = taskTypes.find(t => t.value === task.type);
        const isOverdue = task.dueDate
          ? parseLocalDate(task.dueDate) < new Date() && task.status !== 'completed'
          : false;
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateTask(task.id, {
                  status: task.status === 'completed' ? 'todo' : 'completed',
                } as Partial<TaskInput>);
              }}
              className={clsx(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500 text-white'
                  : isOverdue
                    ? 'border-red-400 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-brand-400'
              )}
            >
              {task.status === 'completed' && <Check className="w-3 h-3" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {type && <TaskTypeIcon icon={type.icon} className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              <div className="min-w-0">
                <p className={clsx(
                  'font-medium text-slate-900 dark:text-white truncate',
                  task.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500'
                )}>
                  {task.title}
                </p>
                {task.linkedItem && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {task.linkedItem.type === 'lead'
                      ? <Target className="w-3 h-3" />
                      : <TrendingUp className="w-3 h-3" />}
                    {task.linkedItem.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (task: Task) => {
        if (!task.dueDate) return <span className="text-slate-400">—</span>;
        const taskDate = parseLocalDate(task.dueDate); taskDate.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const isOverdue = taskDate < today && task.status !== 'completed';
        return (
          <span className={clsx(
            'flex items-center gap-1 text-sm',
            isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-600 dark:text-slate-300'
          )}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {formatDate(task.dueDate, 'short')}
            {task.dueTime && (
              <span className="text-slate-400 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />{task.dueTime}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (task: Task) => {
        const p = TASK_PRIORITY_CONFIG.find(p => p.value === task.priority);
        if (!p) return <span className="text-slate-400">—</span>;
        return (
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', p.color)}>
            {p.label}
          </span>
        );
      },
    },
    {
      key: 'assignedUserId',
      header: 'Assigned To',
      render: (task: Task) => {
        const u = users.find(u => u.id === task.assignedUserId);
        return u ? (
          <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400" />{u.name}
          </span>
        ) : <span className="text-slate-400">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (task: Task) => (
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          task.status === 'completed'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : task.status === 'in_progress'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : task.status === 'cancelled'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        )}>
          {task.status === 'todo' ? 'To Do'
            : task.status === 'in_progress' ? 'In Progress'
            : task.status === 'completed' ? 'Completed'
            : 'Cancelled'}
        </span>
      ),
    },
  ], [taskTypes, users, updateTask]);

  return (
    <Page
      title="Activities"
      description="Sales tasks linked to leads and deals"
      fillHeight
      actions={
        <Button variant="primary" onClick={handleAddActivity}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Activity
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Filter Bar */}
        <FilterBar rightContent={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowClosed(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                showClosed
                  ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              )}
            >
              <Check className="w-3 h-3" />
              Show closed
            </button>
            <FilterCount count={filteredTasks.length} singular="activity" plural="activities" />
          </div>
        }>
          {/* Linked Type Toggle (All / Leads / Deals) */}
          <FilterToggle
            options={linkedTypeOptions}
            value={linkedTypeFilter}
            onChange={(v) => setLinkedTypeFilter(v as LinkedTypeFilter)}
          />

          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search activities..."
            className="w-48"
          />

          {/* Time Filter */}
          <QuickFilters
            options={timeFilterOptions}
            value={timeFilter}
            onChange={(v) => setTimeFilter(v as TimeFilter)}
          />

          {/* Cascading Type Filter */}
          {taskTypeOptions.length > 0 && (
            <SelectFilter
              label="Type"
              value={selectedType}
              onChange={setSelectedType}
              options={taskTypeOptions}
              size="sm"
              className="w-36"
            />
          )}

          {/* Cascading User Filter */}
          {userOptions.length > 0 && (
            <SelectFilter
              label="Assigned To"
              value={selectedUser}
              onChange={setSelectedUser}
              options={userOptions}
              icon={User}
              size="sm"
              className="w-36"
            />
          )}

          {(search || selectedUser || selectedType || linkedTypeFilter !== 'all' || timeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedUser('');
                setSelectedType('');
                setLinkedTypeFilter('all');
                setTimeFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </FilterBar>

        {/* Data Table */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={sortedTasks}
            rowKey={(task) => task.id}
            onRowClick={(task) => setQuickViewTask(task)}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyState={
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No activities found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {search || selectedUser || selectedType || linkedTypeFilter !== 'all' || timeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create tasks linked to leads or deals to see them here'}
                </p>
                <Button variant="primary" onClick={handleAddActivity}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Activity
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {/* Quick View */}
      <TaskQuickView
        task={quickViewTask}
        isOpen={!!quickViewTask}
        users={users}
        onClose={() => setQuickViewTask(null)}
        onEdit={() => quickViewTask && handleEditTask(quickViewTask)}
        onMarkDone={async () => {
          if (quickViewTask) {
            await handleMarkDone(quickViewTask);
            setQuickViewTask(null);
          }
        }}
        onDelete={handleDeleteTask}
      />
    </Page>
  );
}

export default ActivitiesPage;