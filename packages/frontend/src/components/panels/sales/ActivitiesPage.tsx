// ============================================================================
// ActivitiesPage - Sales Activities & Tasks
// Location: src/components/panels/sales/ActivitiesPage.tsx
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Activity,
  Plus,
  Target,
  TrendingUp,
  User,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Trash2,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  Card,
  CardContent,
  SearchInput,
  SelectFilter,
  FilterBar,
  FilterCount,
  DataTable,
  QuickViewModal,
  type QuickViewField,
  type DataTableColumn,
  TaskTypeIcon,
} from '@/components/common';
import { useFormStack } from '@/components/panels/add-forms';
import {
  useSalesStore,
  useUsersStore,
  useToast,
} from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useTaskTypesStore, type TaskTypeConfig } from '@/contexts/taskTypesStore';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Constants
// ============================================================================

const TASK_PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const TASK_STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const LINKED_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'lead', label: 'Lead Activities' },
  { value: 'deal', label: 'Deal Activities' },
];

// ============================================================================
// Task Quick View Component
// ============================================================================

function TaskQuickViewComponent({
  task,
  isOpen,
  taskTypes,
  users,
  onClose,
  onEdit,
  onMarkDone,
  onDelete,
}: {
  task: Task | null;
  isOpen: boolean;
  taskTypes: TaskTypeConfig[];
  users: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  
  if (!task) return null;

  const taskType = taskTypes.find(t => t.value === task.type);
  const assignedUser = users.find(u => u.id === task.assignedUserId);
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority);

  const badges: { label: string; className?: string }[] = [
    {
      label: task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending',
      className: task.status === 'completed'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : task.status === 'in_progress'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    },
  ];

  if (priority) {
    badges.push({ label: priority.label, className: priority.color });
  }

  const fields: QuickViewField[] = [];

  if (taskType) {
    fields.push({
      label: 'Type',
      value: taskType.label,
    });
  }

  if (assignedUser) {
    fields.push({
      label: 'Assigned To',
      value: assignedUser.name,
    });
  }

  if (task.linkedItem) {
    fields.push({
      label: task.linkedItem.type === 'lead' ? 'Lead' : 'Deal',
      value: task.linkedItem.name,
      onClick: () => {
        onClose();
        navigate(`/sales/${task.linkedItem!.type}s/${task.linkedItem!.id}`);
      },
    });
  }

  if (task.description) {
    fields.push({ label: 'Description', value: task.description });
  }

  return (
    <QuickViewModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={
        <>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {formatDate(task.dueDate, 'long')}
            </span>
          )}
          {task.dueTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {task.dueTime}
            </span>
          )}
        </>
      }
      icon={
        taskType ? (
          <TaskTypeIcon icon={taskType.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        )
      }
      badges={badges}
      fields={fields}
      notes={task.notes}
      footerMeta={<>Created {new Date(task.createdAt).toLocaleString()}</>}
      leftActions={[
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: onDelete,
          variant: 'danger',
        },
        ...(task.status !== 'completed'
          ? [{ label: 'Mark as done', icon: <Check className="w-4 h-4" />, onClick: onMarkDone }]
          : []),
      ]}
      primaryAction={{ label: 'Edit Task', onClick: onEdit }}
    />
  );
}

// ============================================================================
// Activity Card Component
// ============================================================================

function ActivityCard({
  task,
  taskType,
  assignedUser,
  onClick,
  onMarkDone,
}: {
  task: Task;
  taskType?: TaskTypeConfig;
  assignedUser?: { name: string };
  onClick: () => void;
  onMarkDone: () => void;
}) {
  const navigate = useNavigate();
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Task Type Icon */}
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            task.status === 'completed'
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          )}>
            {taskType ? (
              <TaskTypeIcon 
                icon={taskType.icon} 
                className={clsx(
                  'w-5 h-5',
                  task.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              />
            ) : (
              <Activity className={clsx(
                'w-5 h-5',
                task.status === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
              )} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={clsx(
                'font-medium text-slate-900 dark:text-white truncate',
                task.status === 'completed' && 'line-through text-slate-500'
              )}>
                {task.title}
              </h3>
              {priority && (
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', priority.color)}>
                  {priority.label}
                </span>
              )}
            </div>

            {/* Linked Entity */}
            {task.linkedItem && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/sales/${task.linkedItem!.type}s/${task.linkedItem!.id}`);
                }}
                className="flex items-center gap-1.5 mt-1 text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                {task.linkedItem.type === 'lead' ? (
                  <Target className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {task.linkedItem.name}
              </button>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {task.dueDate && (
                <span className={clsx(
                  'flex items-center gap-1',
                  isOverdue && 'text-red-600 dark:text-red-400 font-medium'
                )}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formatDate(task.dueDate, 'short')}
                </span>
              )}
              {assignedUser && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {assignedUser.name}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action */}
          {task.status !== 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkDone();
              }}
              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Mark as done"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivitiesPage() {
  useDocumentTitle('Sales Activities');
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { leads, deals } = useSalesStore();
  const { users } = useUsersStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const { openAddTask } = useFormStack();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [linkedTypeFilter, setLinkedTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  // Filter to only sales-related tasks (linked to leads or deals)
  const salesTasks = useMemo(() => {
    return tasks.filter(task => 
      task.linkedItem?.type === 'lead' || task.linkedItem?.type === 'deal'
    );
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return salesTasks.filter(task => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesLinkedItem = task.linkedItem?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLinkedItem) return false;
      }

      // Linked type filter
      if (linkedTypeFilter !== 'all' && task.linkedItem?.type !== linkedTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) {
        return false;
      }

      // Owner filter
      if (ownerFilter && task.assignedUserId !== ownerFilter) {
        return false;
      }

      return true;
    });
  }, [salesTasks, searchQuery, linkedTypeFilter, statusFilter, priorityFilter, ownerFilter]);

  // Sort by due date (overdue first, then upcoming)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Completed tasks at the end
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      return 0;
    });
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: salesTasks.length,
      pending: salesTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
      overdue: salesTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < today && 
        t.status !== 'completed' && 
        t.status !== 'cancelled'
      ).length,
      dueToday: salesTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }).length,
    };
  }, [salesTasks]);

  // Owner options
  const ownerOptions = useMemo(() => 
    users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  // Handlers
  const handleAddActivity = useCallback(() => {
    openAddTask({
      defaultLinkedItemType: 'lead',
    });
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

  const handleEditTask = useCallback(() => {
    navigate('/tasks');
    setQuickViewTask(null);
  }, [navigate]);

  // Table columns for list view
  const columns: DataTableColumn<Task>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Activity',
      sortable: true,
      render: (task: Task) => {
        const type = taskTypes.find(t => t.value === task.type);
        return (
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              task.status === 'completed'
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            )}>
              {type ? (
                <TaskTypeIcon 
                  icon={type.icon} 
                  className={clsx(
                    'w-4 h-4',
                    task.status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  )}
                />
              ) : (
                <Activity className={clsx(
                  'w-4 h-4',
                  task.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                )} />
              )}
            </div>
            <div>
              <p className={clsx(
                'font-medium text-slate-900 dark:text-white',
                task.status === 'completed' && 'line-through text-slate-500'
              )}>
                {task.title}
              </p>
              {task.linkedItem && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {task.linkedItem.type === 'lead' ? 'Lead' : 'Deal'}: {task.linkedItem.name}
                </p>
              )}
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
        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
        return (
          <span className={clsx(isOverdue && 'text-red-600 dark:text-red-400 font-medium')}>
            {formatDate(task.dueDate, 'short')}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (task: Task) => {
        const priority = TASK_PRIORITIES.find(p => p.value === task.priority);
        if (!priority) return null;
        return (
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', priority.color)}>
            {priority.label}
          </span>
        );
      },
    },
    {
      key: 'assignedUserId',
      header: 'Assigned To',
      render: (task: Task) => {
        const user = users.find(u => u.id === task.assignedUserId);
        return user ? user.name : <span className="text-slate-400">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (task: Task) => {
        const status = TASK_STATUSES.find(s => s.value === task.status);
        return (
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            task.status === 'completed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : task.status === 'in_progress'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          )}>
            {status?.label || task.status}
          </span>
        );
      },
    },
  ], [taskTypes, users]);

  // Suppress unused variable warnings
  void leads;
  void deals;

  return (
    <Page
      title="Activities"
      description="Sales tasks and follow-ups"
      actions={
        <Button variant="primary" onClick={handleAddActivity}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Activity
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.dueToday}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Due Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search activities..."
          className="w-64"
        />
        
        <SelectFilter
          label="Type"
          value={linkedTypeFilter}
          onChange={setLinkedTypeFilter}
          options={LINKED_TYPES}
        />
        
        <SelectFilter
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={TASK_STATUSES}
        />
        
        <SelectFilter
          label="Priority"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={TASK_PRIORITIES.map(p => ({ value: p.value, label: p.label }))}
        />
        
        <SelectFilter
          label="Owner"
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={ownerOptions}
        />

        <FilterCount count={sortedTasks.length} singular="activity" plural="activities" />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={viewMode === 'cards' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="w-4 h-4" />
          </Button>
        </div>
      </FilterBar>

      {/* Results */}
      {sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              No activities found
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create tasks linked to leads or deals to see them here'}
            </p>
            <Button variant="primary" className="mt-4" onClick={handleAddActivity}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Activity
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map(task => (
            <ActivityCard
              key={task.id}
              task={task}
              taskType={taskTypes.find(t => t.value === task.type)}
              assignedUser={users.find(u => u.id === task.assignedUserId)}
              onClick={() => setQuickViewTask(task)}
              onMarkDone={() => handleMarkDone(task)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <DataTable
            data={sortedTasks}
            columns={columns}
            rowKey={(task) => task.id}
            onRowClick={(task) => setQuickViewTask(task)}
            emptyState={
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No activities found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters</p>
              </div>
            }
          />
        </Card>
      )}

      {/* Task Quick View Modal */}
      <TaskQuickViewComponent
        task={quickViewTask}
        isOpen={!!quickViewTask}
        taskTypes={taskTypes}
        users={users}
        onClose={() => setQuickViewTask(null)}
        onEdit={handleEditTask}
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