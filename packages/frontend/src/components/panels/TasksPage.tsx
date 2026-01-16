import { useDocumentTitle } from '@/hooks';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/common';

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assigneeId: string;
  assigneeName: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  positionName: string;
  level: number; // 0 = current user, 1 = direct report, 2 = report's report, etc.
}

type ViewMode = 'calendar' | 'list';

// Mock data - replace with real API calls
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review Q1 estimates',
    description: 'Review all pending estimates for Q1',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-01-16',
    assigneeId: 'user-1',
    assigneeName: 'John Smith',
    projectId: 'proj-1',
    projectName: 'Office Renovation',
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    title: 'Client follow-up call',
    description: 'Follow up with ABC Corp about proposal',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-01-17',
    assigneeId: 'user-1',
    assigneeName: 'John Smith',
    createdAt: '2026-01-12',
  },
  {
    id: '3',
    title: 'Update project timeline',
    status: 'todo',
    priority: 'low',
    dueDate: '2026-01-20',
    assigneeId: 'user-2',
    assigneeName: 'Jane Doe',
    projectId: 'proj-2',
    projectName: 'Warehouse Build',
    createdAt: '2026-01-13',
  },
  {
    id: '4',
    title: 'Submit invoice for Phase 1',
    status: 'review',
    priority: 'urgent',
    dueDate: '2026-01-15',
    assigneeId: 'user-3',
    assigneeName: 'Mike Johnson',
    projectId: 'proj-1',
    projectName: 'Office Renovation',
    createdAt: '2026-01-08',
  },
  {
    id: '5',
    title: 'Safety inspection prep',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-01-14',
    assigneeId: 'user-2',
    assigneeName: 'Jane Doe',
    projectId: 'proj-3',
    projectName: 'Retail Expansion',
    createdAt: '2026-01-05',
  },
];

// Mock chain of command - in real app, fetch from API based on user's position
const mockChainOfCommand: TeamMember[] = [
  { id: 'user-1', name: 'John Smith', positionName: 'Project Manager', level: 0 },
  { id: 'user-2', name: 'Jane Doe', positionName: 'Estimator', level: 1 },
  { id: 'user-3', name: 'Mike Johnson', positionName: 'Junior Estimator', level: 1 },
  { id: 'user-4', name: 'Sarah Wilson', positionName: 'Coordinator', level: 2 },
];

// Priority badge component
function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const styles = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

// Status badge component
function StatusBadge({ status }: { status: Task['status'] }) {
  const config = {
    todo: { icon: Clock, label: 'To Do', style: 'text-slate-500' },
    in_progress: { icon: AlertCircle, label: 'In Progress', style: 'text-blue-500' },
    review: { icon: Clock, label: 'Review', style: 'text-amber-500' },
    completed: { icon: Check, label: 'Completed', style: 'text-green-500' },
  };

  const { icon: Icon, label, style } = config[status];

  return (
    <span className={clsx('flex items-center gap-1 text-sm', style)}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}

// Task card for list view
function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={clsx(
        'p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer',
        isOverdue && 'border-l-4 border-l-red-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h3>
            <PriorityBadge priority={task.priority} />
          </div>
          {task.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <StatusBadge status={task.status} />
            {task.projectName && (
              <span className="truncate">
                {task.projectName}
              </span>
            )}
            {task.dueDate && (
              <span className={clsx(isOverdue && 'text-red-500 font-medium')}>
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {task.assigneeName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Calendar component
function TaskCalendar({ tasks, currentDate, onDateChange }: { 
  tasks: Task[]; 
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    onDateChange(newDate);
  };

  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50 dark:bg-slate-900/50" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasksByDate[dateStr] || [];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <div
        key={day}
        className={clsx(
          'h-24 p-1 border-t border-l border-slate-200 dark:border-slate-700 overflow-hidden',
          'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
          isToday && 'bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        <div className={clsx(
          'text-sm font-medium mb-1',
          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
        )}>
          {day}
        </div>
        <div className="space-y-0.5">
          {dayTasks.slice(0, 3).map(task => (
            <div
              key={task.id}
              className={clsx(
                'text-xs px-1 py-0.5 rounded truncate cursor-pointer',
                task.priority === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                task.priority === 'high' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                task.priority === 'medium' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                task.priority === 'low' && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              )}
            >
              {task.title}
            </div>
          ))}
          {dayTasks.length > 3 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 pl-1">
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
}

// Team filter dropdown
function TeamFilterDropdown({
  members,
  selectedIds,
  onChange,
}: {
  members: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(members.map(m => m.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        )}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm">
          {selectedIds.length === 0
            ? 'All Team Members'
            : selectedIds.length === 1
            ? members.find(m => m.id === selectedIds[0])?.name
            : `${selectedIds.length} selected`}
        </span>
        <ChevronDown className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                'absolute top-full left-0 mt-1 w-64 z-20',
                'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
                'shadow-lg overflow-hidden'
              )}
            >
              {/* Quick actions */}
              <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Clear
                </button>
              </div>

              {/* Member list */}
              <div className="max-h-64 overflow-y-auto p-1">
                {members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                      'hover:bg-slate-100 dark:hover:bg-slate-700',
                      selectedIds.includes(member.id) && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center',
                      selectedIds.includes(member.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 dark:border-slate-600'
                    )}>
                      {selectedIds.includes(member.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {member.name}
                        {member.level === 0 && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {member.positionName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main TasksPage component
export function TasksPage() {
  useDocumentTitle('Tasks');
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');

  // Filter tasks based on search, team members, and status
  const filteredTasks = useMemo(() => {
    return mockTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.projectName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Team member filter
      if (selectedTeamMembers.length > 0) {
        if (!selectedTeamMembers.includes(task.assigneeId)) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;

      return true;
    });
  }, [searchQuery, selectedTeamMembers, statusFilter]);

  // Group tasks by status for list view
  const tasksByStatus = useMemo(() => {
    const groups: Record<Task['status'], Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    };
    filteredTasks.forEach(task => {
      groups[task.status].push(task);
    });
    return groups;
  }, [filteredTasks]);

  return (
    <Page
      title="Tasks"
      description="Manage your tasks and view team workload"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      }
    >
      {/* Filters bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Team filter */}
            <TeamFilterDropdown
              members={mockChainOfCommand}
              selectedIds={selectedTeamMembers}
              onChange={setSelectedTeamMembers}
            />

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Task['status'] | 'all')}
              className={clsx(
                'px-3 py-2 rounded-lg border text-sm',
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
                'text-slate-700 dark:text-slate-300'
              )}
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* To Do */}
            {tasksByStatus.todo.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  To Do ({tasksByStatus.todo.length})
                </h3>
                <div className="space-y-2">
                  {tasksByStatus.todo.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {tasksByStatus.in_progress.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  In Progress ({tasksByStatus.in_progress.length})
                </h3>
                <div className="space-y-2">
                  {tasksByStatus.in_progress.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Review */}
            {tasksByStatus.review.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Review ({tasksByStatus.review.length})
                </h3>
                <div className="space-y-2">
                  {tasksByStatus.review.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {tasksByStatus.completed.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Completed ({tasksByStatus.completed.length})
                </h3>
                <div className="space-y-2">
                  {tasksByStatus.completed.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                    No tasks found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchQuery || selectedTeamMembers.length > 0 || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create a new task to get started'}
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TaskCalendar
              tasks={filteredTasks}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

export default TasksPage;