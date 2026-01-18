import { useDocumentTitle } from '@/hooks';
import { useState, useMemo, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Plus, Search, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Clock, X, User, Building2, FolderOpen, FileText, Receipt } from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, Textarea, SelectFilter, DatePicker, TimePicker, DataTable, type DataTableColumn } from '@/components/common';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { useUsersStore, useClientsStore, useToast } from '@/contexts';
import { useTaskStore, type Task, type TaskType, type TaskPriority, type TaskInput, type LinkedEntity, type LinkedEntityType } from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';

// Constants - Priorities remain static
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

// Helper to parse YYYY-MM-DD without timezone issues
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '1', 10);
  const day = parseInt(parts[2] || '1', 10);
  return new Date(year, month - 1, day);
}

// Helper to format date for display  
function formatDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

// Contact/Company Search - searches contacts and companies
function ContactCompanySearch({ 
  value, 
  onChange,
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
}) {
  const { contacts, companies } = useClientsStore();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build searchable contacts and companies
  const allItems = useMemo(() => {
    const items: { type: LinkedEntityType; id: string; name: string; subtitle: string }[] = [];
    
    // Add contacts
    contacts.forEach(c => {
      const fullName = `${c.firstName} ${c.lastName}`.trim();
      items.push({ type: 'contact', id: c.id, name: fullName || 'Unnamed Contact', subtitle: 'Contact' });
    });
    
    // Add companies
    companies.forEach(c => {
      items.push({ type: 'company', id: c.id, name: c.name, subtitle: 'Company' });
    });
    
    return items;
  }, [contacts, companies]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10);
    const query = search.toLowerCase();
    return allItems
      .filter(item => item.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [search, allItems]);

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

  const selectItem = (item: typeof allItems[0]) => {
    onChange({ type: item.type, id: item.id, name: item.name });
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch('');
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link to Contact / Company</label>
      
      {value ? (
        // Show selected item
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {(() => {
            const Icon = ENTITY_ICONS[value.type];
            return <Icon className="w-4 h-4 text-slate-400" />;
          })()}
          <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
          <span className="text-xs text-slate-400 capitalize">{value.type}</span>
          <button type="button" onClick={handleClear} className="text-slate-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Show search input
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search contacts or companies..."
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
                    onClick={() => selectItem(item)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span>
                    <span className="text-xs text-slate-400">{item.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {isOpen && search && filteredItems.length === 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 p-3 text-center text-sm text-slate-500">
              No contacts or companies found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Item Search - searches projects, estimates, invoices, deals (filtered by selected contact/company)
function ItemSearch({ 
  value, 
  onChange,
  linkedContactCompany,
  onSelectWithLinkedEntity
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  linkedContactCompany: LinkedEntity | null;
  onSelectWithLinkedEntity?: (item: LinkedEntity, linkedTo: LinkedEntity) => void;
}) {
  // TODO: Import these stores when available
  // const { projects } = useProjectsStore();
  // const { estimates } = useEstimatesStore();
  // const { invoices } = useInvoicesStore();
  // const { deals } = useDealsStore();
  
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build searchable items (projects, estimates, invoices, deals)
  // Each item should have a linkedContactId or linkedCompanyId for filtering
  const allItems = useMemo(() => {
    const items: { 
      type: LinkedEntityType; 
      id: string; 
      name: string; 
      subtitle: string;
      linkedContactId?: string;
      linkedCompanyId?: string;
      linkedContactName?: string;
      linkedCompanyName?: string;
    }[] = [];
    
    // TODO: Add projects when store is available
    // projects.forEach(p => items.push({ 
    //   type: 'project', 
    //   id: p.id, 
    //   name: p.name, 
    //   subtitle: 'Project',
    //   linkedContactId: p.contactId,
    //   linkedCompanyId: p.companyId,
    //   linkedContactName: p.contactName,
    //   linkedCompanyName: p.companyName,
    // }));
    
    // TODO: Add estimates, invoices, deals when stores are available
    
    return items;
  }, []);

  // Filter items based on search AND selected contact/company
  const filteredItems = useMemo(() => {
    let items = allItems;
    
    // If a contact/company is selected, only show items linked to them
    if (linkedContactCompany) {
      items = items.filter(item => {
        if (linkedContactCompany.type === 'contact') {
          return item.linkedContactId === linkedContactCompany.id;
        } else if (linkedContactCompany.type === 'company') {
          return item.linkedCompanyId === linkedContactCompany.id;
        }
        return true;
      });
    }
    
    // Then filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(query));
    }
    
    return items.slice(0, 10);
  }, [search, allItems, linkedContactCompany]);

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

  const selectItem = (item: typeof allItems[0]) => {
    onChange({ type: item.type, id: item.id, name: item.name });
    setSearch('');
    setIsOpen(false);
    
    // If no contact/company is selected yet, auto-populate from the item's linked entity
    if (!linkedContactCompany && onSelectWithLinkedEntity) {
      if (item.linkedContactId && item.linkedContactName) {
        onSelectWithLinkedEntity(
          { type: item.type, id: item.id, name: item.name },
          { type: 'contact', id: item.linkedContactId, name: item.linkedContactName }
        );
      } else if (item.linkedCompanyId && item.linkedCompanyName) {
        onSelectWithLinkedEntity(
          { type: item.type, id: item.id, name: item.name },
          { type: 'company', id: item.linkedCompanyId, name: item.linkedCompanyName }
        );
      }
    }
  };

  const clearItem = () => {
    onChange(null);
    setSearch('');
  };

  // Show helper text if filtered by contact/company
  const helperText = linkedContactCompany 
    ? `Showing items linked to ${linkedContactCompany.name}`
    : null;

  // Don't show if no items available
  if (allItems.length === 0) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link to Item</label>
        <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          No projects, estimates, or invoices available yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link to Item</label>
      
      {value ? (
        // Show selected item
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {(() => {
            const Icon = ENTITY_ICONS[value.type];
            return <Icon className="w-4 h-4 text-slate-400" />;
          })()}
          <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
          <span className="text-xs text-slate-400 capitalize">{value.type}</span>
          <button type="button" onClick={clearItem} className="text-slate-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Show search input
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search projects, estimates, invoices..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Dropdown */}
          {isOpen && filteredItems.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              {helperText && (
                <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  {helperText}
                </div>
              )}
              {filteredItems.map(item => {
                const Icon = ENTITY_ICONS[item.type];
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span>
                    <span className="text-xs text-slate-400">{item.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {isOpen && filteredItems.length === 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 p-3 text-center text-sm text-slate-500">
              {linkedContactCompany 
                ? `No items linked to ${linkedContactCompany.name}`
                : 'No items found'
              }
            </div>
          )}
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
  linkedContact: null,
  linkedItem: null,
  description: '',
  notes: '',
  dueDate: '',
  dueTime: '',
};

// Task Form Modal
function TaskFormModal({ task, isOpen, onClose, onSave }: { task: Task | null; isOpen: boolean; onClose: () => void; onSave: (data: TaskInput) => void }) {
  const { users } = useUsersStore();
  const { getActiveTaskTypes } = useTaskTypesStore();
  const toast = useToast();
  const [formData, setFormData] = useState<TaskInput>({ ...EMPTY_FORM });
  const [initialData, setInitialData] = useState<TaskInput>({ ...EMPTY_FORM });

  // Get active task types with icons for the dropdown
  const taskTypeOptions = useMemo(() => {
    return getActiveTaskTypes().map(tt => ({
      value: tt.value,
      label: tt.label,
      icon: <TaskTypeIcon icon={tt.icon} className="w-4 h-4" />,
    }));
  }, [getActiveTaskTypes]);

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
      JSON.stringify(formData.linkedContact) !== JSON.stringify(initialData.linkedContact) ||
      JSON.stringify(formData.linkedItem) !== JSON.stringify(initialData.linkedItem)
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
      formData.linkedContact !== null ||
      formData.linkedItem !== null
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
          linkedContact: task.linkedContact || null,
          linkedItem: task.linkedItem || null,
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
            <div className="[&>*]:w-full">
              <SelectFilter 
                label="Select Type" 
                value={formData.type || ''} 
                onChange={v => setFormData(d => ({ ...d, type: (v || undefined) as TaskType | undefined }))} 
                options={taskTypeOptions}
                showAllOption={false}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
            <div className="[&>*]:w-full">
              <SelectFilter 
                label="Select Priority" 
                value={formData.priority || ''} 
                onChange={v => setFormData(d => ({ ...d, priority: v as TaskPriority || undefined }))} 
                options={PRIORITIES} 
                showAllOption={false}
              />
            </div>
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
          <div className="[&>*]:w-full">
            <SelectFilter 
              label="Select User" 
              value={formData.assignedUserId} 
              onChange={v => setFormData(d => ({ ...d, assignedUserId: v }))} 
              options={userOptions} 
              showAllOption={false}
            />
          </div>
        </div>

        {/* Link to Contact / Company */}
        <ContactCompanySearch 
          value={formData.linkedContact || null} 
          onChange={v => setFormData(d => ({ ...d, linkedContact: v }))} 
        />

        {/* Link to Item (filtered by selected contact/company) */}
        <ItemSearch 
          value={formData.linkedItem || null} 
          onChange={v => setFormData(d => ({ ...d, linkedItem: v }))} 
          linkedContactCompany={formData.linkedContact || null}
          onSelectWithLinkedEntity={(item, linkedTo) => {
            // When selecting an item, auto-populate the contact/company if not already set
            setFormData(d => ({ 
              ...d, 
              linkedItem: item,
              linkedContact: d.linkedContact || linkedTo 
            }));
          }}
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
  const { getActiveTaskTypes } = useTaskTypesStore();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Get task type options for filter - only show types that have tasks
  const taskTypeOptions = useMemo(() => {
    const typeCounts = new Map<string, number>();
    tasks.forEach(t => {
      if (t.type) {
        typeCounts.set(t.type, (typeCounts.get(t.type) || 0) + 1);
      }
    });
    
    return getActiveTaskTypes()
      .filter(tt => typeCounts.has(tt.value))
      .map(tt => ({
        value: tt.value,
        label: tt.label,
        icon: <TaskTypeIcon icon={tt.icon} className="w-4 h-4" />,
        count: typeCounts.get(tt.value) || 0,
      }));
  }, [getActiveTaskTypes, tasks]);

  // Get user options for filter - only show users that have tasks assigned
  const userFilterOptions = useMemo(() => {
    const userCounts = new Map<string, number>();
    tasks.forEach(t => {
      if (t.assignedUserId) {
        userCounts.set(t.assignedUserId, (userCounts.get(t.assignedUserId) || 0) + 1);
      }
    });
    
    return users
      .filter(u => userCounts.has(u.id))
      .map(u => ({
        value: u.id,
        label: u.name,
        count: userCounts.get(u.id) || 0,
      }));
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

  // Get task types for column rendering
  const { taskTypes } = useTaskTypesStore();

  // DataTable columns for tasks
  const taskColumns: DataTableColumn<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      sortable: true,
      render: (task) => {
        const taskType = taskTypes.find(t => t.value === task.type);
        return (
          <div className="flex items-center gap-2">
            {taskType && (
              <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                <TaskTypeIcon icon={taskType.icon} className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
            )}
            <span className="font-medium text-slate-900 dark:text-white">{task.title}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (task) => {
        const statusStyles: Record<string, string> = {
          todo: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
          in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const statusLabels: Record<string, string> = {
          todo: 'To Do',
          in_progress: 'In Progress',
          review: 'Review',
          completed: 'Completed',
          cancelled: 'Cancelled',
        };
        return (
          <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', statusStyles[task.status])}>
            {statusLabels[task.status] || task.status}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (task) => {
        if (!task.dueDate) return <span className="text-slate-400">—</span>;
        const isOverdue = parseLocalDate(task.dueDate) < new Date() && task.status !== 'completed';
        return (
          <span className={clsx(isOverdue && 'text-red-500 font-medium')}>
            {formatDate(task.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'assignedUserName',
      header: 'Assigned To',
      sortable: true,
      render: (task) => task.assignedUserName || <span className="text-slate-400">—</span>,
    },
    {
      key: 'linkedContact',
      header: 'Contact / Company',
      render: (task) => {
        const entity = task.linkedContact || task.linkedItem;
        if (!entity) return <span className="text-slate-400">—</span>;
        const Icon = ENTITY_ICONS[entity.type];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{entity.name}</span>
          </div>
        );
      },
    },
  ];

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

  // Shared compact styles - all items h-7 (28px)
  const btnBase = "h-7 px-2 text-xs font-medium rounded transition-colors";
  const btnActive = "bg-blue-600 text-white";
  const btnInactive = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";
  const timeBtn = (active: boolean, danger?: boolean) => clsx(
    "h-7 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap",
    active 
      ? danger 
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  );

  return (
    <Page title="Tasks" description="Manage tasks and activities" actions={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New Task</Button>}>
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
        {/* View toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md h-7 p-0.5">
          <button onClick={() => setViewMode('list')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'list' ? btnActive : btnInactive)}>
            <List className="w-3 h-3" />List
          </button>
          <button onClick={() => setViewMode('calendar')} className={clsx(btnBase, "flex items-center gap-1", viewMode === 'calendar' ? btnActive : btnInactive)}>
            <CalendarIcon className="w-3 h-3" />Calendar
          </button>
        </div>

        {/* Search */}
        <div className="relative h-7">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search..." 
            className="h-7 w-40 pl-7 pr-2 text-xs border rounded-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        {/* Type filter - only show if there are tasks with types */}
        {taskTypeOptions.length > 0 && (
          <SelectFilter
            label="Type"
            value={selectedType}
            onChange={setSelectedType}
            options={taskTypeOptions}
            showAllOption={true}
            size="sm"
          />
        )}

        {/* User filter - only show if there are tasks with users */}
        {userFilterOptions.length > 0 && (
          <SelectFilter
            label="Assigned To"
            value={selectedUser}
            onChange={setSelectedUser}
            options={userFilterOptions}
            showAllOption={true}
            size="sm"
            icon={<User className="w-3 h-3" />}
          />
        )}

        {/* Time filters */}
        <div className="flex items-center gap-0.5">
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
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{filteredTasks.length} tasks</span>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <DataTable<Task>
          columns={taskColumns}
          data={filteredTasks}
          rowKey={(task) => task.id}
          onRowClick={(task) => openEdit(task)}
          emptyState={
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No tasks yet</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Get started by creating your first task</p>
            </CardContent>
          }
        />
      ) : (
        <TaskCalendar tasks={filteredTasks} currentDate={currentDate} onDateChange={setCurrentDate} onTaskClick={openEdit} />
      )}

      {/* Form Modal */}
      <TaskFormModal task={editingTask} isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingTask(null); }} onSave={handleSave} />
    </Page>
  );
}

export default TasksPage;