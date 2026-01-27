// EntityTasksSection - Minimal Pipedrive-style tasks list for entity detail pages
// Location: packages/frontend/src/components/common/EntityTasksSection.tsx

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Plus, Check, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react';
import { useTaskStore, type Task, type LinkedEntityType } from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { TaskTypeIcon } from './TaskTypeIcon';
import { useToast } from '@/contexts';

interface EntityTasksSectionProps {
  entityType: LinkedEntityType;
  entityId: string;
  entityName: string;
  /** Called when user clicks "Add Task" - should open task panel with entity pre-linked */
  onAddTask: () => void;
  /** Called when user clicks a task row - should open task in edit panel */
  onTaskClick: (task: Task) => void;
}

// Parse date string to Date object (local timezone)
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  return new Date(year, month, day);
}

// Format date for display
function formatTaskDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  
  // Check if overdue
  if (date < today) {
    const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function EntityTasksSection({ 
  entityType, 
  entityId, 
  entityName,
  onAddTask,
  onTaskClick,
}: EntityTasksSectionProps) {
  const { tasks, completeTask, reopenTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const toast = useToast();
  
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Filter tasks linked to this entity
  const { openTasks, completedTasks } = useMemo(() => {
    const linkedTasks = tasks.filter(task => {
      // Check if task is linked to this entity via linkedContact or linkedItem
      const isLinkedContact = task.linkedContact?.type === entityType && task.linkedContact?.id === entityId;
      const isLinkedItem = task.linkedItem?.type === entityType && task.linkedItem?.id === entityId;
      return isLinkedContact || isLinkedItem;
    });
    
    const open = linkedTasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        // Sort by due date (earliest first), tasks without due date at end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    
    const completed = linkedTasks
      .filter(t => t.status === 'completed')
      .sort((a, b) => {
        // Sort by completion date (most recent first)
        if (!a.completedAt && !b.completedAt) return 0;
        if (!a.completedAt) return 1;
        if (!b.completedAt) return -1;
        return b.completedAt.localeCompare(a.completedAt);
      });
    
    return { openTasks: open, completedTasks: completed };
  }, [tasks, entityType, entityId]);
  
  // Check if a task is overdue
  const isOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parseLocalDate(task.dueDate) < today;
  };
  
  // Handle marking task complete
  const handleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    completeTask(task.id);
    toast.success('Task Completed', task.title);
  };
  
  // Handle reopening task
  const handleReopen = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    reopenTask(task.id);
    toast.info('Task Reopened', task.title);
  };
  
  // Get task type config
  const getTaskType = (typeValue?: string) => {
    if (!typeValue) return null;
    return taskTypes.find(t => t.value === typeValue);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Tasks</span>
        <div className="flex items-center gap-2">
          {openTasks.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{openTasks.length} open</span>
          )}
          <button 
            onClick={onAddTask}
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            title={`Add task for ${entityName}`}
          >
            <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
      
      {/* Open Tasks List */}
      {openTasks.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {openTasks.map(task => {
            const taskType = getTaskType(task.type);
            const overdue = isOverdue(task);
            return (
              <div 
                key={task.id} 
                onClick={() => onTaskClick(task)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group"
              >
                {/* Complete checkbox */}
                <button
                  onClick={(e) => handleComplete(e, task)}
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                    overdue 
                      ? 'border-red-300 dark:border-red-500 hover:border-green-500 hover:bg-green-500' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-green-500 hover:bg-green-500',
                    'group-hover:border-green-400'
                  )}
                />
                
                {/* Task type icon */}
                {taskType && (
                  <div className={clsx(
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                    overdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                  )}>
                    <TaskTypeIcon 
                      icon={taskType.icon} 
                      className={clsx('w-3 h-3', overdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')} 
                    />
                  </div>
                )}
                
                {/* Task title */}
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                  {task.title}
                </span>
                
                {/* Due date */}
                {task.dueDate && (
                  <span className={clsx(
                    'text-xs flex-shrink-0',
                    overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-400 dark:text-slate-500'
                  )}>
                    {formatTaskDate(task.dueDate)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No open tasks</p>
          <button 
            onClick={onAddTask}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Add a task
          </button>
        </div>
      )}
      
      {/* Completed Section Toggle */}
      {completedTasks.length > 0 && (
        <>
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 px-3 py-2 w-full text-left border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            {showCompleted ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {completedTasks.length} completed
            </span>
          </button>
          
          {/* Completed Tasks List */}
          {showCompleted && (
            <div className="divide-y divide-slate-50 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {completedTasks.map(task => {
                const taskType = getTaskType(task.type);
                return (
                  <div 
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group"
                  >
                    {/* Completed checkmark - click to reopen */}
                    <button
                      onClick={(e) => handleReopen(e, task)}
                      className="w-4 h-4 flex items-center justify-center flex-shrink-0 group-hover:text-amber-500"
                      title="Click to reopen"
                    >
                      <Check className="w-3.5 h-3.5 text-green-500 group-hover:text-amber-500" />
                    </button>
                    
                    {/* Task type icon */}
                    {taskType && (
                      <TaskTypeIcon icon={taskType.icon} className="w-3 h-3 flex-shrink-0" />
                    )}
                    
                    {/* Task title */}
                    <span className="text-xs line-through truncate flex-1">{task.title}</span>
                    
                    {/* Completed date */}
                    {task.completedAt && (
                      <span className="text-xs">
                        {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EntityTasksSection;