import { useDocumentTitle } from '@/hooks';
import { useState, useMemo, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Plus, Search, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Check, Clock, AlertCircle, X, User, Building2, FolderOpen, FileText, Receipt } from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, Textarea, SelectFilter, MultiSelectUsers, DatePicker, TimePicker } from '@/components/common';
import { useUsersStore, useClientsStore, useToast } from '@/contexts';
import { useTaskStore, type Task, type TaskType, type TaskPriority, type TaskInput, type LinkedEntity, type LinkedEntityType } from '@/contexts/taskStore';

// Constants
const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'email', label: 'Email' },
  { value: 'follow_up', label: 'Follow Up' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

type TimeFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'next-week';

// Entity type icons
const ENTITY_ICONS: Record<LinkedEntityType, typeof User> = {
  contact: User,
  company: Building2,
  project: FolderOpen,
  estimate: FileText,
  invoice: Receipt,
  deal: FileText,
};

// Priority badge
function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={clsx('px-1.5 py-0.5 text-[10px] font-medium rounded capitalize', styles[priority])}>{priority}</span>;
}

// Task card
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <div onClick={onClick} className={clsx('p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer', isOverdue && 'border-l-4 border-l-red-500')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{task.title}</span>
          {task.priority && <PriorityBadge priority={task.priority} />}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {task.primaryEntityName && <span className="hidden sm:inline truncate max-w-[100px]">{task.primaryEntityName}</span>}
          {task.dueDate && <span className={clsx(isOverdue && 'text-red-500 font-medium')}>{new Date(task.dueDate).toLocaleDateString()}</span>}
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-medium">
            {task.assignedUserName?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Unified Entity Search - searches all entity types
function EntitySearch({ value, onChange }: { value: LinkedEntity[]; onChange: (v: LinkedEntity[]) => void }) {
  const { companies, contacts } = useClientsStore();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build searchable items from all sources
  const allItems = useMemo(() => {
    const items: { type: LinkedEntityType; id: string; name: string; subtitle?: string }[] = [];
    
    // Add contacts - use firstName + lastName
    contacts.forEach(c => {
      const fullName = `${c.firstName} ${c.lastName}`.trim();
      items.push({ type: 'contact', id: c.id, name: fullName || 'Unnamed Contact', subtitle: 'Contact' });
    });
    
    // Add companies
    companies.forEach(c => items.push({ type: 'company', id: c.id, name: c.name, subtitle: 'Company' }));
    
    // TODO: Add projects, estimates, invoices when stores are available
    
    return items;
  }, [contacts, companies]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    return allItems
      .filter(item => item.name.toLowerCase().includes(query))
      .filter(item => !value.some(v => v.type === item.type && v.id === item.id))
      .slice(0, 10);
  }, [search, allItems, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && 
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addEntity = (item: typeof allItems[0]) => {
    onChange([...value, { type: item.type, id: item.id, name: item.name }]);
    setSearch('');
    setIsOpen(false);
  };

  const removeEntity = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Link to</label>
      
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => search && setIsOpen(true)}
          placeholder="Search contacts, companies, projects..."
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Dropdown */}
        {isOpen && filteredItems.length > 0 && (
          <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {filteredItems.map(item => {
              const Icon = ENTITY_ICONS[item.type];
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => addEntity(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span>
                  <span className="text-xs text-slate-400 capitalize">{item.subtitle}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {isOpen && search && filteredItems.length === 0 && (
          <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 p-3 text-center text-sm text-slate-500">
            No results found
          </div>
        )}
      </div>

      {/* Selected entities */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((e, i) => {
            const Icon = ENTITY_ICONS[e.type];
            return (
              <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-md">
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{e.name}</span>
                <button type="button" onClick={() => removeEntity(i)} className="text-slate-400 hover:text-red-500 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Empty form state for comparison
const EMPTY_FORM: TaskInput = {
  title: '',
  type: undefined, // undefined = not selected
  priority: undefined, // undefined = not selected
  assignedUserId: '',
  linkedEntities: [],
  description: '',
  notes: '',
  dueDate: '',
  dueTime: '',
};

// Task Form Modal
function TaskFormModal({ task, isOpen, onClose, onSave }: { task: Task | null; isOpen: boolean; onClose: () => void; onSave: (data: TaskInput) => void }) {
  const { users } = useUsersStore();
  const toast = useToast();
  const [formData, setFormData] = useState<TaskInput>({ ...EMPTY_FORM });
  const [initialData, setInitialData] = useState<TaskInput>({ ...EMPTY_FORM });

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return (
      formData.title !== initialData.title ||
      formData.type !== initialData.type ||
      formData.priority !== initialData.priority ||
      formData.assignedUserId !== initialData.assignedUserId ||
      formData.description !== initialData.description ||
      formData.notes !== initialData.notes ||
      formData.dueDate !== initialData.dueDate ||
      formData.dueTime !== initialData.dueTime ||
      JSON.stringify(formData.linkedEntities) !== JSON.stringify(initialData.linkedEntities)
    );
  }, [formData, initialData]);

  // Check if form has any data filled
  const hasData = useMemo(() => {
    return (
      formData.title.trim() !== '' ||
      formData.type !== undefined ||
      formData.priority !== undefined ||
      formData.assignedUserId !== '' ||
      (formData.description?.trim() ?? '') !== '' ||
      (formData.notes?.trim() ?? '') !== '' ||
      (formData.dueDate ?? '') !== '' ||
      (formData.dueTime ?? '') !== '' ||
      (formData.linkedEntities && formData.linkedEntities.length > 0)
    );
  }, [formData]);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        const taskData: TaskInput = {
          title: task.title,
          description: task.description || '',
          type: task.type,
          priority: task.priority,
          dueDate: task.dueDate || '',
          dueTime: task.dueTime || '',
          assignedUserId: task.assignedUserId,
          linkedEntities: task.linkedEntities || [],
          notes: task.notes || '',
        };
        setFormData(taskData);
        setInitialData(taskData);
      } else {
        setFormData({ ...EMPTY_FORM });
        setInitialData({ ...EMPTY_FORM });
      }
    }
  }, [task, isOpen]);

  // Handle save from unsaved changes dialog
  const handleSaveChanges = () => {
    if (formData.title.trim() && formData.assignedUserId) {
      onSave(formData);
      toast.success('Saved', task ? 'Task updated' : 'Task created');
    } else {
      toast.error('Error', 'Please fill in required fields (Title and Assigned To)');
    }
  };

  // Handle discard from unsaved changes dialog
  const handleDiscardChanges = () => {
    toast.info('Discarded', 'Changes discarded');
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.assignedUserId) return;
    onSave(formData);
    toast.success('Saved', task ? 'Task updated' : 'Task created');
  };

  const userOptions = users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={task ? 'Edit Task' : 'New Task'} 
      size="lg"
      hasUnsavedChanges={hasData && hasChanges}
      onSaveChanges={handleSaveChanges}
      onDiscardChanges={handleDiscardChanges}
    >
      <div className="space-y-4">
        <Input 
          label="Title" 
          value={formData.title} 
          onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} 
          placeholder="Task title..." 
          required 
        />
        
        {/* Type, Priority - symmetrical grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
            <SelectFilter 
              label="Select Type" 
              value={formData.type || ''} 
              onChange={v => setFormData(d => ({ ...d, type: v as TaskType || undefined }))} 
              options={TASK_TYPES} 
              showAllOption={false}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
            <SelectFilter 
              label="Select Priority" 
              value={formData.priority || ''} 
              onChange={v => setFormData(d => ({ ...d, priority: v as TaskPriority || undefined }))} 
              options={PRIORITIES} 
              showAllOption={false}
              className="w-full"
            />
          </div>
        </div>

        {/* Due Date, Due Time - symmetrical grid */}
        <div className="grid grid-cols-2 gap-4">
          <DatePicker 
            label="Due Date" 
            value={formData.dueDate || ''} 
            onChange={v => setFormData(d => ({ ...d, dueDate: v }))} 
          />
          <TimePicker 
            label="Due Time" 
            value={formData.dueTime || ''} 
            onChange={v => setFormData(d => ({ ...d, dueTime: v }))} 
          />
        </div>

        {/* Assigned To - full width */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Assigned To <span className="text-red-500">*</span>
          </label>
          <SelectFilter 
            label="Select User" 
            value={formData.assignedUserId} 
            onChange={v => setFormData(d => ({ ...d, assignedUserId: v }))} 
            options={userOptions} 
            showAllOption={false}
            className="w-full"
          />
        </div>

        <EntitySearch 
          value={formData.linkedEntities || []} 
          onChange={v => setFormData(d => ({ ...d, linkedEntities: v }))} 
        />

        <Textarea 
          label="Description" 
          value={formData.description || ''} 
          onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} 
          rows={3} 
          placeholder="Task description..." 
        />

        <Textarea 
          label="Notes (private)" 
          value={formData.notes || ''} 
          onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} 
          rows={2} 
          placeholder="Private notes..." 
        />
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!formData.title.trim() || !formData.assignedUserId}>
          {task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </Modal>
  );
}

// Calendar view
function TaskCalendar({ tasks, currentDate, onDateChange, onTaskClick }: { tasks: Task[]; currentDate: Date; onDateChange: (d: Date) => void; onTaskClick: (t: Task) => void }) {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(t => { 
      if (t.dueDate) { 
        const key = t.dueDate;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key]!.push(t); 
      } 
    });
    return grouped;
  }, [tasks]);

  const navigate = (dir: number) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + dir); onDateChange(d); };

  return (
    <Card>
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-sm text-slate-900 dark:text-white">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} className="h-24 bg-slate-50 dark:bg-slate-900/50 border-t border-l border-slate-200 dark:border-slate-700" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          return (
            <div key={day} className={clsx('h-24 p-1 border-t border-l border-slate-200 dark:border-slate-700 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/50', isToday && 'bg-blue-50 dark:bg-blue-900/20')}>
              <div className={clsx('text-xs font-medium mb-1', isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400')}>{day}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => (
                  <div key={t.id} onClick={() => onTaskClick(t)} className={clsx('text-[10px] px-1 rounded truncate cursor-pointer', t.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : t.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="text-[10px] text-blue-600 dark:text-blue-400 pl-1">+{dayTasks.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Main component
export function TasksPage() {
  useDocumentTitle('Tasks');
  
  const { users } = useUsersStore();
  const { tasks, createTask, updateTask } = useTaskStore();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const matchesTime = (dueDate?: string): boolean => {
    if (!dueDate || timeFilter === 'all') return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate); taskDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    const startNextWeek = new Date(endOfWeek); startNextWeek.setDate(startNextWeek.getDate() + 1);
    const endNextWeek = new Date(startNextWeek); endNextWeek.setDate(endNextWeek.getDate() + 6);
    
    switch (timeFilter) {
      case 'overdue': return taskDate < today;
      case 'today': return taskDate.getTime() === today.getTime();
      case 'tomorrow': return taskDate.getTime() === tomorrow.getTime();
      case 'this-week': return taskDate >= today && taskDate <= endOfWeek;
      case 'next-week': return taskDate >= startNextWeek && taskDate <= endNextWeek;
      default: return true;
    }
  };

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedUsers.length && !selectedUsers.includes(t.assignedUserId)) return false;
    if (!matchesTime(t.dueDate)) return false;
    return true;
  }), [tasks, search, selectedUsers, timeFilter]);

  const grouped = useMemo(() => {
    const g = { todo: [] as Task[], in_progress: [] as Task[], review: [] as Task[], completed: [] as Task[] };
    filteredTasks.forEach(t => {
      if (t.status === 'todo') g.todo.push(t);
      else if (t.status === 'in_progress') g.in_progress.push(t);
      else if (t.status === 'review') g.review.push(t);
      else if (t.status === 'completed') g.completed.push(t);
    });
    return g;
  }, [filteredTasks]);

  const overdueCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return tasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [tasks]);

  const handleSave = async (data: TaskInput) => {
    const user = users.find(u => u.id === data.assignedUserId);
    const taskData = { ...data, assignedUserName: user?.name || '' };
    
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const openEdit = (task: Task) => { setEditingTask(task); setIsFormOpen(true); };
  const openNew = () => { setEditingTask(null); setIsFormOpen(true); };

  // Shared styles
  const btnBase = "h-7 px-2.5 text-xs font-medium rounded transition-colors";
  const btnActive = "bg-blue-600 text-white";
  const btnInactive = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";
  const timeBtn = (active: boolean, danger?: boolean) => clsx(
    "h-7 px-2.5 text-xs font-medium rounded transition-colors",
    active 
      ? danger 
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  );

  return (
    <Page title="Tasks" description="Manage tasks and activities" actions={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New Task</Button>}>
      {/* Compact filter bar */}
      <Card className="mb-4">
        <CardContent className="p-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded h-7 p-0.5">
              <button onClick={() => setViewMode('list')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'list' ? btnActive : btnInactive)}>
                <List className="w-3.5 h-3.5" />List
              </button>
              <button onClick={() => setViewMode('calendar')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'calendar' ? btnActive : btnInactive)}>
                <CalendarIcon className="w-3.5 h-3.5" />Calendar
              </button>
            </div>

            {/* Search */}
            <div className="relative h-7">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search..." 
                className="h-7 w-36 pl-7 pr-2 text-xs border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" 
              />
            </div>

            {/* User filter */}
            <div className="h-7">
              <MultiSelectUsers value={selectedUsers} onChange={setSelectedUsers} placeholder="All Users" size="sm" activeOnly />
            </div>

            {/* Time filters */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
              <button onClick={() => setTimeFilter('all')} className={timeBtn(timeFilter === 'all')}>All</button>
              <button onClick={() => setTimeFilter('overdue')} className={timeBtn(timeFilter === 'overdue', true)}>
                {overdueCount > 0 ? `Overdue (${overdueCount})` : 'Overdue'}
              </button>
              <button onClick={() => setTimeFilter('today')} className={timeBtn(timeFilter === 'today')}>Today</button>
              <button onClick={() => setTimeFilter('tomorrow')} className={timeBtn(timeFilter === 'tomorrow')}>Tomorrow</button>
              <button onClick={() => setTimeFilter('this-week')} className={timeBtn(timeFilter === 'this-week')}>This week</button>
              <button onClick={() => setTimeFilter('next-week')} className={timeBtn(timeFilter === 'next-week')}>Next week</button>
            </div>

            {/* Count */}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{filteredTasks.length} tasks</span>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {grouped.todo.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />To Do ({grouped.todo.length})</h3>
              <div className="space-y-1">{grouped.todo.map(t => <TaskCard key={t.id} task={t} onClick={() => openEdit(t)} />)}</div>
            </div>
          )}
          {grouped.in_progress.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />In Progress ({grouped.in_progress.length})</h3>
              <div className="space-y-1">{grouped.in_progress.map(t => <TaskCard key={t.id} task={t} onClick={() => openEdit(t)} />)}</div>
            </div>
          )}
          {grouped.review.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Review ({grouped.review.length})</h3>
              <div className="space-y-1">{grouped.review.map(t => <TaskCard key={t.id} task={t} onClick={() => openEdit(t)} />)}</div>
            </div>
          )}
          {grouped.completed.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Completed ({grouped.completed.length})</h3>
              <div className="space-y-1">{grouped.completed.map(t => <TaskCard key={t.id} task={t} onClick={() => openEdit(t)} />)}</div>
            </div>
          )}
          {filteredTasks.length === 0 && (
            <Card><CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No tasks found. Click "New Task" to create one.</CardContent></Card>
          )}
        </div>
      ) : (
        <TaskCalendar tasks={filteredTasks} currentDate={currentDate} onDateChange={setCurrentDate} onTaskClick={openEdit} />
      )}

      {/* Form Modal */}
      <TaskFormModal task={editingTask} isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingTask(null); }} onSave={handleSave} />
    </Page>
  );
}

export default TasksPage;