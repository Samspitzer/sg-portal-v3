// ===========================================================================
// TasksPage - Pipedrive-inspired Task Management
// Location: packages/frontend/src/components/panels/TasksPage.tsx
// 
// UPDATED: Now uses FormStack for all task creation and editing.
// - AddTaskForm: Modal popup for creating new tasks
// - EditTaskForm: Side panel with calendar for editing tasks
// ===========================================================================

import { useDocumentTitle } from '@/hooks';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, 
  Clock, User, Building2, Check,
  Target, TrendingUp
} from 'lucide-react';
import { Page } from '@/components/layout';
import { 
  Button, SelectFilter, SearchInput,
  DataTable, type DataTableColumn,
  FilterBar, FilterCount, FilterToggle, QuickFilters, type QuickFilterOption,
  TaskTypeIcon
} from '@/components/common';
import { useFormStack } from '@/components/panels/add-forms';
import { useUsersStore, useToast } from '@/contexts';
import { 
  useTaskStore, type Task, type TaskPriority, 
  type LinkedEntityType 
} from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { parseLocalDate, formatDate } from '@/utils/dateUtils';

// =============================================================================
// Constants
// =============================================================================

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

type TimeFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'next-week';

// =============================================================================
// Task Calendar Component
// =============================================================================

function TaskCalendar({ 
  tasks, 
  currentDate, 
  onDateChange, 
  onTaskClick,
  onNewTask 
}: { 
  tasks: Task[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onNewTask: (date?: Date) => void;
}) {
  const { getActiveTaskTypes } = useTaskTypesStore();
  const taskTypes = useMemo(() => getActiveTaskTypes(), [getActiveTaskTypes]);
  
  // Get calendar grid data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month and how many days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Build weeks array
    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];
    
    // Fill in empty days at start
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    // Fill in days
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Fill remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const key = task.dueDate;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {calendarData.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            {week.map((date, dayIdx) => {
              if (!date) {
                return <div key={dayIdx} className="min-h-[100px] bg-slate-50 dark:bg-slate-900/50" />;
              }
              
              const dateKey = formatDateKey(date);
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isToday = date.getTime() === today.getTime();
              const isPast = date < today;
              
              return (
                <div 
                  key={dayIdx} 
                  className={clsx(
                    'min-h-[100px] p-1 border-r border-slate-200 dark:border-slate-700 last:border-r-0',
                    isPast && 'bg-slate-50 dark:bg-slate-900/30'
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx(
                      'w-6 h-6 flex items-center justify-center text-xs rounded-full',
                      isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                    )}>
                      {date.getDate()}
                    </span>
                    <button 
                      onClick={() => onNewTask(date)}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Tasks */}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(task => {
                      const taskType = taskTypes.find(t => t.value === task.type);
                      return (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={clsx(
                            'w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-colors',
                            task.status === 'completed' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 line-through'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                          )}
                        >
                          {taskType && <TaskTypeIcon icon={taskType.icon} className="w-3 h-3 inline mr-1" />}
                          {task.title}
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main TasksPage Component
// =============================================================================

export function TasksPage() {
  useDocumentTitle('Tasks');
  const navigate = useNavigate();
  
  const { users } = useUsersStore();
  const { tasks, completeTask, reopenTask } = useTaskStore();
  const { getActiveTaskTypes, taskTypes } = useTaskTypesStore();
  const toast = useToast();
  const { openAddTask, openEditTask } = useFormStack();
  
  // View state - persist viewMode to localStorage
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
    const saved = localStorage.getItem('tasks-view-mode');
    return (saved === 'list' || saved === 'calendar') ? saved : 'list';
  });
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Persist viewMode changes to localStorage
  useEffect(() => {
    localStorage.setItem('tasks-view-mode', viewMode);
  }, [viewMode]);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Navigate to linked entity
  const navigateToEntity = useCallback((type: LinkedEntityType, id: string) => {
    const routes: Record<LinkedEntityType, string> = {
      contact: `/clients/contacts/${id}`,
      company: `/clients/companies/${id}`,
      project: `/projects/${id}`,
      estimate: `/estimates/${id}`,
      invoice: `/accounting/invoices/${id}`,
      deal: `/sales/deals/${id}`,
      lead: `/sales/leads/${id}`,
    };
    navigate(routes[type] || '/');
  }, [navigate]);

  // Time filter logic
  const matchesTime = useCallback((dueDate?: string): boolean => {
    if (!dueDate || timeFilter === 'all') return true;
    
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const taskDate = parseLocalDate(dueDate); 
    taskDate.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today); 
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today); 
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    const startNextWeek = new Date(endOfWeek); 
    startNextWeek.setDate(startNextWeek.getDate() + 1);
    const endNextWeek = new Date(startNextWeek); 
    endNextWeek.setDate(endNextWeek.getDate() + 6);
    
    switch (timeFilter) {
      case 'overdue': return taskDate < today;
      case 'today': return taskDate.getTime() === today.getTime();
      case 'tomorrow': return taskDate.getTime() === tomorrow.getTime();
      case 'this-week': return taskDate >= today && taskDate <= endOfWeek;
      case 'next-week': return taskDate >= startNextWeek && taskDate <= endNextWeek;
      default: return true;
    }
  }, [timeFilter]);

  // Build filter options
  const taskTypeOptions = useMemo(() => {
    const activeTypes = getActiveTaskTypes();
    return activeTypes.map(tt => ({
      value: tt.value,
      label: tt.label,
    }));
  }, [getActiveTaskTypes]);

  const userOptions = useMemo(() => 
    users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  // Time filter quick options
  const timeFilterOptions: QuickFilterOption<TimeFilter>[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This Week' },
    { value: 'next-week', label: 'Next Week' },
  ], []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        task.title.toLowerCase().includes(searchLower) ||
        task.linkedContact?.name.toLowerCase().includes(searchLower) ||
        task.linkedItem?.name.toLowerCase().includes(searchLower);
      
      // User filter
      const matchesUser = !selectedUser || task.assignedUserId === selectedUser;
      
      // Type filter
      const matchesType = !selectedType || task.type === selectedType;
      
      // Time filter
      const matchesTimeFilter = matchesTime(task.dueDate);
      
      // Don't show deleted
      const notDeleted = task.status !== 'cancelled';
      
      return matchesSearch && matchesUser && matchesType && matchesTimeFilter && notDeleted;
    });
  }, [tasks, search, selectedUser, selectedType, matchesTime]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'dueDate':
          aVal = a.dueDate || '9999-99-99';
          bVal = b.dueDate || '9999-99-99';
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          aVal = priorityOrder[a.priority || 'low'] ?? 4;
          bVal = priorityOrder[b.priority || 'low'] ?? 4;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortField, sortDirection]);

  // Handlers
  const handleNewTask = useCallback((date?: Date) => {
    const defaultDueDate = date 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : undefined;
    openAddTask({ defaultDueDate });
  }, [openAddTask]);

  const handleEditTask = useCallback((task: Task) => {
    openEditTask({ task });
  }, [openEditTask]);

  const handleToggleComplete = useCallback(async (task: Task) => {
    try {
      if (task.status === 'completed') {
        await reopenTask(task.id);
        toast.success('Task Reopened', 'Task has been reopened');
      } else {
        await completeTask(task.id);
        toast.success('Task Completed', 'Task marked as done');
        
        // If task has a linked lead/deal, open follow-up task form
        if (task.linkedItem && (task.linkedItem.type === 'lead' || task.linkedItem.type === 'deal')) {
          openAddTask({
            defaultContactId: task.linkedContact?.type === 'contact' ? task.linkedContact.id : undefined,
            defaultContactName: task.linkedContact?.type === 'contact' ? task.linkedContact.name : undefined,
            defaultLinkedItemType: task.linkedItem.type as 'lead' | 'deal',
            defaultLinkedItemId: task.linkedItem.id,
            defaultLinkedItemName: task.linkedItem.name,
          });
        }
      }
    } catch (err) {
      toast.error('Error', 'Failed to update task');
    }
  }, [completeTask, reopenTask, toast, openAddTask]);

  // Table columns
  const columns: DataTableColumn<Task>[] = useMemo(() => [
    {
      key: 'status',
      header: '',
      width: 40,
      render: (task) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
          className={clsx(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            task.status === 'completed'
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
          )}
        >
          {task.status === 'completed' && <Check className="w-3 h-3" />}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Task',
      sortable: true,
      render: (task) => {
        const taskType = taskTypes.find(t => t.value === task.type);
        return (
          <div className="flex items-center gap-2">
            {taskType && (
              <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <TaskTypeIcon icon={taskType.icon} className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <span className={clsx(
              'font-medium',
              task.status === 'completed' && 'line-through text-slate-400'
            )}>
              {task.title}
            </span>
          </div>
        );
      },
    },
    {
      key: 'linkedTo',
      header: 'Linked To',
      render: (task) => {
        const items = [];
        if (task.linkedContact) {
          const Icon = task.linkedContact.type === 'company' ? Building2 : User;
          items.push(
            <button
              key="contact"
              onClick={(e) => { e.stopPropagation(); navigateToEntity(task.linkedContact!.type, task.linkedContact!.id); }}
              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{task.linkedContact.name}</span>
            </button>
          );
        }
        if (task.linkedItem) {
          const Icon = task.linkedItem.type === 'lead' ? Target : TrendingUp;
          items.push(
            <button
              key="item"
              onClick={(e) => { e.stopPropagation(); navigateToEntity(task.linkedItem!.type, task.linkedItem!.id); }}
              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{task.linkedItem.name}</span>
            </button>
          );
        }
        return items.length > 0 ? <div className="flex flex-col gap-0.5">{items}</div> : <span className="text-slate-400">—</span>;
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (task) => {
        if (!task.dueDate) return <span className="text-slate-400">—</span>;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = parseLocalDate(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today && task.status !== 'completed';
        const isToday = dueDate.getTime() === today.getTime();
        
        return (
          <span className={clsx(
            'text-sm',
            isOverdue && 'text-red-600 dark:text-red-400 font-medium',
            isToday && 'text-blue-600 dark:text-blue-400 font-medium'
          )}>
            {formatDate(task.dueDate, 'short')}
            {task.dueTime && ` ${task.dueTime}`}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (task) => {
        if (!task.priority) return <span className="text-slate-400">—</span>;
        const priority = PRIORITIES.find(p => p.value === task.priority);
        return priority ? (
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', priority.color)}>
            {priority.label}
          </span>
        ) : null;
      },
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (task) => {
        const user = users.find(u => u.id === task.assignedUserId);
        return user ? (
          <span className="text-sm text-slate-600 dark:text-slate-400">{user.name}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
  ], [taskTypes, users, handleToggleComplete, navigateToEntity]);

  return (
    <Page 
      title="Tasks" 
      description="Manage tasks and activities"
      fillHeight
      actions={
        <Button onClick={() => handleNewTask()} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      }
    >
      {/* Main Content Container */}
      <div className="flex flex-col h-full min-h-0">
        {/* Filter Bar */}
        <FilterBar rightContent={<FilterCount count={filteredTasks.length} singular="task" />}>
          {/* View Mode Toggle */}
          <FilterToggle
            options={[
              { value: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
              { value: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />

          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tasks..."
            className="w-48"
          />

          {/* Time Filter */}
          <QuickFilters
            options={timeFilterOptions}
            value={timeFilter}
            onChange={(v) => setTimeFilter(v as TimeFilter)}
          />

          {/* Type Filter */}
          <SelectFilter
            label="Type"
            value={selectedType}
            onChange={setSelectedType}
            options={taskTypeOptions}
            icon={Clock}
          />

          {/* User Filter */}
          <SelectFilter
            label="Assigned"
            value={selectedUser}
            onChange={setSelectedUser}
            options={userOptions}
            icon={User}
          />
        </FilterBar>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'list' ? (
            <DataTable
              data={sortedTasks}
              columns={columns}
              rowKey={(task) => task.id}
              onRowClick={handleEditTask}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              emptyState={
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No tasks found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {search || selectedUser || selectedType || timeFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first task to get started'}
                  </p>
                  <Button onClick={() => handleNewTask()}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Task
                  </Button>
                </div>
              }
            />
          ) : (
            <TaskCalendar
              tasks={sortedTasks}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onTaskClick={handleEditTask}
              onNewTask={handleNewTask}
            />
          )}
        </div>
      </div>
    </Page>
  );
}

export default TasksPage;