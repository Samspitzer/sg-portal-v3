// ===========================================================================
// TasksPage - Pipedrive-inspired Task Management
// Location: packages/frontend/src/components/panels/TasksPage.tsx
// 
// AUDIT COMPLIANCE:
// - Uses common components: Button, Card, CardContent, DataTable, SelectFilter,
//   Select, Textarea, SearchInput, DatePicker, TimePicker, UnsavedChangesModal
// - Uses hooks: useDocumentTitle, useToast
// - Uses layout: Page
// ===========================================================================

import { useDocumentTitle } from '@/hooks';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { 
  Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, 
  Clock, X, User, Building2, FolderOpen, FileText, Receipt, Check, Trash2, Search
} from 'lucide-react';
import { Page } from '@/components/layout';
import { 
  Card, CardContent, Button, SelectFilter, Select, Textarea, SearchInput,
  DataTable, type DataTableColumn, DatePicker, TimePicker, UnsavedChangesModal
} from '@/components/common';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { useUsersStore, useClientsStore, useToast } from '@/contexts';
import { 
  useTaskStore, type Task, type TaskType, type TaskPriority, 
  type TaskInput, type LinkedEntity, type LinkedEntityType 
} from '@/contexts/taskStore';
import { useTaskTypesStore, type TaskTypeConfig } from '@/contexts/taskTypesStore';

// Constants
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

type TimeFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'next-week';

const ENTITY_ICONS: Record<LinkedEntityType, typeof User> = {
  contact: User, company: Building2, project: FolderOpen, 
  estimate: FileText, invoice: Receipt, deal: FileText,
};

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 0;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return new Date(year, month - 1, day);
}

function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function formatDateLong(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Contact/Company Search Component
function ContactCompanySearch({ value, onChange }: { value: LinkedEntity | null; onChange: (v: LinkedEntity | null) => void; }) {
  const { contacts, companies } = useClientsStore();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => {
    const items: { type: LinkedEntityType; id: string; name: string; subtitle: string }[] = [];
    contacts.forEach(c => items.push({ type: 'contact', id: c.id, name: `${c.firstName} ${c.lastName}`.trim() || 'Unnamed', subtitle: 'Contact' }));
    companies.forEach(c => items.push({ type: 'company', id: c.id, name: c.name, subtitle: 'Company' }));
    return items;
  }, [contacts, companies]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10);
    return allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [search, allItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && 
          inputRef.current && !inputRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link to Contact / Company</label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {(() => { const Icon = ENTITY_ICONS[value.type]; return <Icon className="w-4 h-4 text-slate-400" />; })()}
          <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
          <span className="text-xs text-slate-400 capitalize">{value.type}</span>
          <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input ref={inputRef} value={search} onChange={e => { setSearch(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)}
            placeholder="Search contacts or companies..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {isOpen && filteredItems.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredItems.map(item => {
                const Icon = ENTITY_ICONS[item.type];
                return (
                  <button key={`${item.type}-${item.id}`} type="button" onClick={() => { onChange({ type: item.type, id: item.id, name: item.name }); setSearch(''); setIsOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Icon className="w-4 h-4 text-slate-400" /><span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span><span className="text-xs text-slate-400">{item.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Item Search Component (Projects, Deals, Estimates, Invoices)
function ItemSearch({ value, onChange }: { value: LinkedEntity | null; onChange: (v: LinkedEntity | null) => void; }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with actual stores when available
  const allItems = useMemo(() => {
    const items: { type: LinkedEntityType; id: string; name: string; subtitle: string }[] = [];
    return items;
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10);
    return allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [search, allItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && 
          inputRef.current && !inputRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link to Item (Project, Deal, etc.)</label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {(() => { const Icon = ENTITY_ICONS[value.type]; return <Icon className="w-4 h-4 text-slate-400" />; })()}
          <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
          <span className="text-xs text-slate-400 capitalize">{value.type}</span>
          <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input ref={inputRef} value={search} onChange={e => { setSearch(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)}
            placeholder="Search projects, deals, estimates..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {isOpen && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const Icon = ENTITY_ICONS[item.type];
                return (
                  <button key={`${item.type}-${item.id}`} type="button" onClick={() => { onChange({ type: item.type, id: item.id, name: item.name }); setSearch(''); setIsOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Icon className="w-4 h-4 text-slate-400" /><span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span><span className="text-xs text-slate-400">{item.subtitle}</span>
                  </button>
                );
              }) : (
                <div className="p-3 text-center text-xs text-slate-400">No projects or deals available yet</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Task Type Button Group
function TaskTypeButtonGroup({ value, onChange, taskTypes }: { value: TaskType | undefined; onChange: (v: TaskType | undefined) => void; taskTypes: TaskTypeConfig[]; }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {taskTypes.map(tt => (
        <button key={tt.id} type="button" onClick={() => onChange(value === tt.value ? undefined : tt.value as TaskType)}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            value === tt.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600')}>
          <TaskTypeIcon icon={tt.icon} className="w-4 h-4" /><span>{tt.label}</span>
        </button>
      ))}
    </div>
  );
}

// Task Detail Panel (Slide-out)
function TaskDetailPanel({ task, isOpen, onClose, onSave, onDelete }: { 
  task: Task | null; isOpen: boolean; onClose: () => void; onSave: (data: TaskInput, markDone?: boolean) => void; onDelete?: (taskId: string) => void;
}) {
  const { users } = useUsersStore();
  const { getActiveTaskTypes } = useTaskTypesStore();
  const toast = useToast();
  const [formData, setFormData] = useState<TaskInput>({ title: '', type: undefined, priority: undefined, assignedUserId: '', linkedContact: null, linkedItem: null, description: '', notes: '', dueDate: '', dueTime: '' });
  const [initialData, setInitialData] = useState<TaskInput | null>(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const taskTypes = useMemo(() => getActiveTaskTypes(), [getActiveTaskTypes]);

  useEffect(() => {
    if (isOpen && task) {
      const data: TaskInput = { title: task.title, description: task.description || '', type: task.type, priority: task.priority, dueDate: task.dueDate || '', dueTime: task.dueTime || '', assignedUserId: task.assignedUserId, linkedContact: task.linkedContact || null, linkedItem: task.linkedItem || null, notes: task.notes || '' };
      setFormData(data); setInitialData(data); setIsMarkingDone(task.status === 'completed');
    } else if (isOpen && !task) {
      const emptyData: TaskInput = { title: '', type: undefined, priority: undefined, assignedUserId: '', linkedContact: null, linkedItem: null, description: '', notes: '', dueDate: '', dueTime: '' };
      setFormData(emptyData); setInitialData(emptyData); setIsMarkingDone(false);
    }
  }, [task, isOpen]);

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return formData.title !== initialData.title || formData.type !== initialData.type || formData.priority !== initialData.priority || 
      formData.assignedUserId !== initialData.assignedUserId || formData.description !== initialData.description || formData.notes !== initialData.notes || 
      formData.dueDate !== initialData.dueDate || formData.dueTime !== initialData.dueTime || 
      JSON.stringify(formData.linkedContact) !== JSON.stringify(initialData.linkedContact) ||
      JSON.stringify(formData.linkedItem) !== JSON.stringify(initialData.linkedItem);
  }, [formData, initialData]);

  const handleSave = () => {
    if (!formData.title.trim()) { toast.error('Required Field', 'Please enter a task title'); return; }
    if (!formData.assignedUserId) { toast.error('Required Field', 'Please select who this task is assigned to'); return; }
    onSave(formData, isMarkingDone);
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };
  
  const handleDiscard = () => {
    setShowDiscardModal(false);
    onClose();
  };
  
  const handleDelete = () => { 
    if (task && onDelete) { 
      onDelete(task.id); 
      onClose(); 
    } 
  };
  
  const userOptions = users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }));
  const currentTaskType = taskTypes.find(t => t.value === formData.type);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={handleClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {currentTaskType && <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"><TaskTypeIcon icon={currentTaskType.icon} className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{task ? formData.title || 'Untitled Task' : 'New Task'}</h2>
                {formData.dueDate && <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateLong(formData.dueDate)}</p>}
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <input value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} placeholder="Task title..."
              className="w-full text-xl font-medium bg-transparent border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none py-1 text-slate-900 dark:text-white placeholder:text-slate-400" />
            
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Activity Type</label>
              <TaskTypeButtonGroup value={formData.type} onChange={v => setFormData(d => ({ ...d, type: v }))} taskTypes={taskTypes} /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Due Date" value={formData.dueDate || ''} onChange={v => setFormData(d => ({ ...d, dueDate: v }))} />
              <TimePicker label="Due Time" value={formData.dueTime || ''} onChange={v => setFormData(d => ({ ...d, dueTime: v }))} />
            </div>
            
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
              <div className="flex items-center gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" onClick={() => setFormData(d => ({ ...d, priority: d.priority === p.value ? undefined : p.value }))}
                    className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', formData.priority === p.value ? p.color + ' ring-2 ring-offset-1 ring-blue-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600')}>{p.label}</button>
                ))}
              </div>
            </div>
            
            <Select
              label="Assigned To"
              value={formData.assignedUserId}
              onChange={e => setFormData(d => ({ ...d, assignedUserId: e.target.value }))}
              options={userOptions}
              placeholder="Select user..."
              required
            />
            
            <ContactCompanySearch value={formData.linkedContact || null} onChange={v => setFormData(d => ({ ...d, linkedContact: v }))} />
            
            <ItemSearch value={formData.linkedItem || null} onChange={v => setFormData(d => ({ ...d, linkedItem: v }))} />
            
            <Textarea
              label="Notes"
              value={formData.notes || ''}
              onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
              rows={3}
              placeholder="Add notes..."
            />
            
            {task && <div className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">Created: {new Date(task.createdAt).toLocaleString()}{task.createdByName && ` by ${task.createdByName}`}</div>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              {task && (<><button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete task"><Trash2 className="w-5 h-5" /></button>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isMarkingDone} onChange={e => setIsMarkingDone(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" /><span className="text-sm text-slate-600 dark:text-slate-400">Mark as done</span></label></>)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.title.trim() || !formData.assignedUserId}>{task ? 'Save' : 'Create Task'}</Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />
    </>,
    document.body
  );
}

// Quick Preview Popover (for calendar view)
function TaskQuickPreview({ task, position, onClose, onEdit, onMarkDone }: { task: Task; position: { x: number; y: number }; onClose: () => void; onEdit: () => void; onMarkDone: () => void; }) {
  const { taskTypes } = useTaskTypesStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose(); };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside); document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  const taskType = taskTypes.find(t => t.value === task.type);
  const adjustedPosition = useMemo(() => {
    let x = position.x, y = position.y;
    if (x + 280 > window.innerWidth - 20) x = position.x - 280;
    if (y + 200 > window.innerHeight - 20) y = position.y - 200;
    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  return createPortal(
    <div ref={popoverRef} style={{ left: adjustedPosition.x, top: adjustedPosition.y }} className="fixed z-[60] w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        {taskType && <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><TaskTypeIcon icon={taskType.icon} className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div>}
        <div className="flex-1 min-w-0"><h4 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{task.dueDate && formatDateLong(task.dueDate)}{task.dueTime && ` at ${task.dueTime}`}</p></div>
      </div>
      <div className="px-4 py-3 space-y-2 text-sm">
        {task.assignedUserName && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><User className="w-4 h-4 text-slate-400" /><span>{task.assignedUserName}</span></div>}
        {task.linkedContact && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">{(() => { const Icon = ENTITY_ICONS[task.linkedContact.type]; return <Icon className="w-4 h-4 text-slate-400" />; })()}<span className="truncate">{task.linkedContact.name}</span></div>}
        {task.priority && <div className="flex items-center gap-2"><span className={clsx('px-2 py-0.5 text-xs font-medium rounded', PRIORITIES.find(p => p.value === task.priority)?.color)}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span></div>}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button onClick={onMarkDone} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400"><Check className="w-4 h-4" /><span>Mark as done</span></button>
        <Button size="sm" onClick={onEdit}>Edit</Button>
      </div>
    </div>,
    document.body
  );
}

// Calendar View
function TaskCalendar({ tasks, currentDate, onDateChange, onTaskClick }: { 
  tasks: Task[]; currentDate: Date; onDateChange: (d: Date) => void; onTaskClick: (task: Task, event: React.MouseEvent) => void;
}) {
  const { taskTypes } = useTaskTypesStore();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(t => { if (t.dueDate) { if (!grouped[t.dueDate]) grouped[t.dueDate] = []; grouped[t.dueDate]!.push(t); } });
    return grouped;
  }, [tasks]);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-sm text-slate-900 dark:text-white">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); onDateChange(d); }}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); onDateChange(d); }}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} className="h-28 bg-slate-50 dark:bg-slate-900/50 border-t border-l border-slate-200 dark:border-slate-700" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = todayStr === dateStr;
          return (
            <div key={day} className={clsx('h-28 p-1.5 border-t border-l border-slate-200 dark:border-slate-700 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors', isToday && 'bg-blue-50 dark:bg-blue-900/20')}>
              <div className={clsx('text-xs font-medium mb-1', isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400')}>{day}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const tt = taskTypes.find(type => type.value === t.type);
                  return (
                    <div key={t.id} onClick={(e) => onTaskClick(t, e)} className={clsx('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate transition-colors',
                      t.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200' : 
                      t.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200' : 
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600')}>
                      {tt && <TaskTypeIcon icon={tt.icon} className="w-3 h-3 flex-shrink-0" />}<span className="truncate">{t.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && <div className="text-[10px] text-blue-600 dark:text-blue-400 pl-1 font-medium">+{dayTasks.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Main TasksPage Component
export function TasksPage() {
  useDocumentTitle('Tasks');
  const { users } = useUsersStore();
  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const { getActiveTaskTypes, taskTypes } = useTaskTypesStore();
  const toast = useToast();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });

  const taskTypeOptions = useMemo(() => {
    const typeCounts = new Map<string, number>();
    tasks.forEach(t => { if (t.type) typeCounts.set(t.type, (typeCounts.get(t.type) || 0) + 1); });
    return getActiveTaskTypes().filter(tt => typeCounts.has(tt.value)).map(tt => ({
      value: tt.value, label: tt.label, icon: <TaskTypeIcon icon={tt.icon} className="w-4 h-4" />, count: typeCounts.get(tt.value) || 0,
    }));
  }, [getActiveTaskTypes, tasks]);

  const userFilterOptions = useMemo(() => {
    const userCounts = new Map<string, number>();
    tasks.forEach(t => { if (t.assignedUserId) userCounts.set(t.assignedUserId, (userCounts.get(t.assignedUserId) || 0) + 1); });
    return users.filter(u => userCounts.has(u.id)).map(u => ({ value: u.id, label: u.name, count: userCounts.get(u.id) || 0 }));
  }, [users, tasks]);

  const matchesTime = (dueDate?: string): boolean => {
    if (!dueDate || timeFilter === 'all') return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const taskDate = parseLocalDate(dueDate); taskDate.setHours(0, 0, 0, 0);
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
    if (selectedUser && t.assignedUserId !== selectedUser) return false;
    if (selectedType && t.type !== selectedType) return false;
    if (!matchesTime(t.dueDate)) return false;
    return true;
  }), [tasks, search, selectedUser, selectedType, timeFilter]);

  const overdueCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return tasks.filter(t => t.dueDate && parseLocalDate(t.dueDate) < today && t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [tasks]);

  const taskColumns: DataTableColumn<Task>[] = [
    { key: 'title', header: 'Task', sortable: true, render: (task) => {
      const tt = taskTypes.find(t => t.value === task.type);
      return <div className="flex items-center gap-2">{tt && <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700 flex-shrink-0"><TaskTypeIcon icon={tt.icon} className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></div>}<span className="font-medium text-slate-900 dark:text-white">{task.title}</span></div>;
    }},
    { key: 'status', header: 'Status', sortable: true, width: 'w-28', render: (task) => {
      const styles: Record<string, string> = { todo: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      const labels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed', cancelled: 'Cancelled' };
      return <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', styles[task.status])}>{labels[task.status] || task.status}</span>;
    }},
    { key: 'dueDate', header: 'Due Date', sortable: true, width: 'w-28', render: (task) => {
      if (!task.dueDate) return <span className="text-slate-400">—</span>;
      const isOverdue = parseLocalDate(task.dueDate) < new Date() && task.status !== 'completed';
      return <span className={clsx(isOverdue && 'text-red-500 font-medium')}>{formatDate(task.dueDate)}</span>;
    }},
    { key: 'assignedUserName', header: 'Assigned To', sortable: true, width: 'w-36', render: (task) => task.assignedUserName || <span className="text-slate-400">—</span> },
    { key: 'linkedContact', header: 'Contact / Company', width: 'w-40', render: (task) => {
      const entity = task.linkedContact || task.linkedItem;
      if (!entity) return <span className="text-slate-400">—</span>;
      const Icon = ENTITY_ICONS[entity.type];
      return <div className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{entity.name}</span></div>;
    }},
  ];

  const handleSave = async (data: TaskInput, markDone?: boolean) => {
    const user = users.find(u => u.id === data.assignedUserId);
    const taskData = { ...data, assignedUserName: user?.name || '' };
    
    if (selectedTask) {
      if (markDone && selectedTask.status !== 'completed') {
        await updateTask(selectedTask.id, { ...taskData, status: 'completed' } as TaskInput);
        toast.success('Task Completed', 'Task has been marked as done');
      } else if (!markDone && selectedTask.status === 'completed') {
        await updateTask(selectedTask.id, { ...taskData, status: 'todo' } as TaskInput);
        toast.success('Task Updated', 'Task has been reopened');
      } else {
        await updateTask(selectedTask.id, taskData);
        toast.success('Task Updated', 'Your changes have been saved');
      }
    } else {
      await createTask(taskData);
      toast.success('Task Created', 'New task has been added');
    }
    setIsPanelOpen(false); setSelectedTask(null);
  };

  const handleDelete = async (taskId: string) => { 
    await deleteTask(taskId); 
    toast.success('Task Deleted', 'The task has been removed'); 
  };
  
  const openEditPanel = (task: Task) => { setSelectedTask(task); setIsPanelOpen(true); setPreviewTask(null); };
  const openNewPanel = () => { setSelectedTask(null); setIsPanelOpen(true); };
  const handleCalendarTaskClick = (task: Task, event: React.MouseEvent) => { event.stopPropagation(); setPreviewTask(task); setPreviewPosition({ x: event.clientX, y: event.clientY }); };
  
  const handleMarkDone = async () => { 
    if (previewTask) { 
      await updateTask(previewTask.id, { status: 'completed' } as Partial<TaskInput>); 
      toast.success('Task Completed', 'Task has been marked as done'); 
      setPreviewTask(null); 
    } 
  };

  const btnBase = "h-7 px-2 text-xs font-medium rounded transition-colors";
  const btnActive = "bg-blue-600 text-white";
  const btnInactive = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";
  const timeBtn = (active: boolean, danger?: boolean) => clsx("h-7 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap",
    active ? (danger ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400") : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700");

  return (
    <Page title="Tasks" description="Manage tasks and activities" actions={<Button onClick={openNewPanel} size="sm"><Plus className="w-4 h-4 mr-1" />New Task</Button>}>
      <div className="relative z-20 flex items-center gap-2 flex-wrap pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md h-7 p-0.5">
          <button onClick={() => setViewMode('list')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'list' ? btnActive : btnInactive)}><List className="w-3 h-3" />List</button>
          <button onClick={() => setViewMode('calendar')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'calendar' ? btnActive : btnInactive)}><CalendarIcon className="w-3 h-3" />Calendar</button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." className="w-40" />
        {taskTypeOptions.length > 0 && <SelectFilter label="Type" value={selectedType} onChange={setSelectedType} options={taskTypeOptions} showAllOption={true} size="sm" />}
        {userFilterOptions.length > 0 && <SelectFilter label="Assigned To" value={selectedUser} onChange={setSelectedUser} options={userFilterOptions} showAllOption={true} size="sm" icon={<User className="w-3 h-3" />} />}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setTimeFilter('all')} className={timeBtn(timeFilter === 'all')}>All</button>
          <button onClick={() => setTimeFilter('overdue')} className={timeBtn(timeFilter === 'overdue', true)}>{overdueCount > 0 ? `Overdue (${overdueCount})` : 'Overdue'}</button>
          <button onClick={() => setTimeFilter('today')} className={timeBtn(timeFilter === 'today')}>Today</button>
          <button onClick={() => setTimeFilter('tomorrow')} className={timeBtn(timeFilter === 'tomorrow')}>Tomorrow</button>
          <button onClick={() => setTimeFilter('this-week')} className={timeBtn(timeFilter === 'this-week')}>This week</button>
          <button onClick={() => setTimeFilter('next-week')} className={timeBtn(timeFilter === 'next-week')}>Next week</button>
        </div>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{filteredTasks.length} tasks</span>
      </div>

      {viewMode === 'list' ? (
        <DataTable<Task> columns={taskColumns} data={filteredTasks} rowKey={(task) => task.id} onRowClick={(task) => openEditPanel(task)}
          emptyState={<CardContent className="p-12 text-center"><Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" /><h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No tasks yet</h3><p className="mt-2 text-slate-500 dark:text-slate-400">Get started by creating your first task</p></CardContent>} />
      ) : (
        <TaskCalendar tasks={filteredTasks} currentDate={currentDate} onDateChange={setCurrentDate} onTaskClick={handleCalendarTaskClick} />
      )}

      <TaskDetailPanel task={selectedTask} isOpen={isPanelOpen} onClose={() => { setIsPanelOpen(false); setSelectedTask(null); }} onSave={handleSave} onDelete={handleDelete} />
      {previewTask && <TaskQuickPreview task={previewTask} position={previewPosition} onClose={() => setPreviewTask(null)} onEdit={() => openEditPanel(previewTask)} onMarkDone={handleMarkDone} />}
      
      <style>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.2s ease-out; }
      `}</style>
    </Page>
  );
}

export default TasksPage;