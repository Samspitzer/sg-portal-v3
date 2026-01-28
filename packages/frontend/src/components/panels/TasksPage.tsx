// ===========================================================================
// TasksPage - Pipedrive-inspired Task Management
// Location: packages/frontend/src/components/panels/TasksPage.tsx
// 
// AUDIT COMPLIANCE:
// - Uses common components: Button, Card, CardContent, DataTable, SelectFilter,
//   Select, Textarea, SearchInput, DatePicker, TimePicker, UnsavedChangesModal,
//   Input, Toggle, TaskTypeIcon
// - Uses hooks: useDocumentTitle, useDropdownKeyboard
// - Uses contexts: useToast, useUsersStore, useClientsStore, useTaskStore, useTaskTypesStore
// - Uses layout: Page
// ===========================================================================

import { useDocumentTitle, useDropdownKeyboard } from '@/hooks';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, 
  Clock, X, User, Building2, FileText, Check, Trash2, Search
} from 'lucide-react';
import { Page } from '@/components/layout';
import { 
  Card, CardContent, Button, SelectFilter, Textarea, SearchInput,
  DataTable, type DataTableColumn, DatePicker, TimePicker, UnsavedChangesModal,
  Input, Toggle, TaskTypeIcon, EntitySearchDropdown, type EntitySearchItem,
  FilterBar, FilterCount, FilterToggle, QuickFilters, type QuickFilterOption
} from '@/components/common';
import { useUsersStore, useClientsStore, useToast } from '@/contexts';
import { 
  useTaskStore, type Task, type TaskType, type TaskPriority, 
  type TaskInput, type LinkedEntity, type LinkedEntityType 
} from '@/contexts/taskStore';
import { useTaskTypesStore, type TaskTypeConfig } from '@/contexts/taskTypesStore';
import { parseLocalDate, formatDate, } from '@/utils/dateUtils';
import { ENTITY_ICONS } from '@/config';

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
// =============================================================================
// Company Search Component
// =============================================================================

function CompanySearch({ 
  value, 
  onChange,
  onCompanySelected 
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  onCompanySelected?: (companyId: string | null) => void;
}) {
  const { companies } = useClientsStore();

  const companyItems: EntitySearchItem[] = useMemo(() => 
    companies.map(c => ({ id: c.id, name: c.name })),
    [companies]
  );

  const handleChange = (item: EntitySearchItem | null) => {
    if (item) {
      onChange({ type: 'company', id: item.id, name: item.name });
      onCompanySelected?.(item.id);
    } else {
      onChange(null);
      onCompanySelected?.(null);
    }
  };

  const selectedItem = value ? { id: value.id, name: value.name } : null;

  return (
    <EntitySearchDropdown
      label="Company"
      value={selectedItem}
      onChange={handleChange}
      items={companyItems}
      placeholder="Search companies..."
      icon={Building2}
    />
  );
}

// =============================================================================
// Contact Search Component (filtered by company)
// =============================================================================

function ContactSearch({ 
  value, 
  onChange,
  companyId,
  onContactSelected,
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  companyId: string | null;
  onContactSelected?: (contact: { id: string; companyId: string; name: string } | null) => void;
}) {
  const { contacts, companies } = useClientsStore();

  const contactItems: EntitySearchItem[] = useMemo(() => {
    let contactList = contacts;
    
    // Filter by company if set
    if (companyId) {
      contactList = contacts.filter(c => c.companyId === companyId);
    }
    
    return contactList.map(c => {
      const company = companies.find(comp => comp.id === c.companyId);
      return { 
        id: c.id, 
        name: `${c.firstName} ${c.lastName}`.trim() || 'Unnamed',
        subtitle: !companyId && company?.name ? company.name : undefined,
        metadata: { companyId: c.companyId }
      };
    });
  }, [contacts, companies, companyId]);

  const handleChange = (item: EntitySearchItem | null) => {
    if (item) {
      onChange({ type: 'contact', id: item.id, name: item.name });
      onContactSelected?.({ 
        id: item.id, 
        companyId: (item.metadata?.companyId as string) || '', 
        name: item.name 
      });
    } else {
      onChange(null);
      onContactSelected?.(null);
    }
  };

  const selectedItem = value ? { id: value.id, name: value.name } : null;

  return (
    <EntitySearchDropdown
      label="Contact"
      value={selectedItem}
      onChange={handleChange}
      items={contactItems}
      placeholder={companyId ? "Search contacts from this company..." : "Search all contacts..."}
      icon={User}
      labelSuffix={companyId ? "(filtered by company)" : undefined}
      emptyMessage="No contacts found"
    />
  );
}

// =============================================================================
// Day Schedule Sidebar Component
// =============================================================================

function DayScheduleSidebar({ 
  date,
  tasks,
  onDateChange,
}: { 
  date: string;
  tasks: Task[];
  onDateChange?: (date: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (date) return parseLocalDate(date);
    return new Date();
  });

  // Update current month when date changes
  useEffect(() => {
    if (date) {
      setCurrentMonth(parseLocalDate(date));
    }
  }, [date]);

  // Filter tasks for the selected date
  const dayTasks = useMemo(() => {
    if (!date) return [];
    return tasks
      .filter(t => t.dueDate === date && t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.dueTime && !b.dueTime) return 0;
        if (!a.dueTime) return 1;
        if (!b.dueTime) return -1;
        return a.dueTime.localeCompare(b.dueTime);
      });
  }, [date, tasks]);

  // Get tasks for the current month view
  const tasksByDate = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach(t => {
      if (t.dueDate && t.status !== 'completed' && t.status !== 'cancelled') {
        map.set(t.dueDate, (map.get(t.dueDate) || 0) + 1);
      }
    });
    return map;
  }, [tasks]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayStr = formatDateStr(today);

  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="w-full h-full border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col">
      {/* Mini Calendar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={goToPrevMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={goToNextMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map(({ date: d, isCurrentMonth }, i) => {
            const dateStr = formatDateStr(d);
            const isSelected = dateStr === date;
            const isToday = dateStr === todayStr;
            const taskCount = tasksByDate.get(dateStr) || 0;

            return (
              <button
                key={i}
                onClick={() => onDateChange?.(dateStr)}
                className={clsx(
                  'relative h-8 text-xs rounded transition-colors',
                  isCurrentMonth 
                    ? 'text-slate-700 dark:text-slate-300' 
                    : 'text-slate-400 dark:text-slate-600',
                  isSelected 
                    ? 'bg-blue-600 text-white font-medium' 
                    : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/30 font-medium'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {d.getDate()}
                {taskCount > 0 && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule for Selected Date */}
      {date ? (
        <>
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {parseLocalDate(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dayTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No tasks scheduled</p>
            ) : (
              dayTasks.map(task => (
                <div 
                  key={task.id}
                  className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {task.title}
                  </p>
                  {task.dueTime && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {task.dueTime}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a due date to see your schedule</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Contact/Company Search (Legacy - keeping for backward compatibility)
// =============================================================================
// Item Search Component (Projects, Deals, Estimates, Invoices)
// =============================================================================

interface SearchItem { 
  type: LinkedEntityType; 
  id: string; 
  name: string; 
  subtitle?: string; 
}

function ItemSearch({ 
  value, 
  onChange 
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void; 
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with actual stores when available
  const allItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    // Add items from project store, deal store, etc. when available
    return items;
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10);
    return allItems
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, allItems]);

  // Keyboard navigation using the hook
  const { highlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: filteredItems,
    isOpen,
    onSelect: (item) => {
      if (item) {
        onChange({ type: item.type, id: item.id, name: item.name });
        setSearch('');
        setIsOpen(false);
        resetHighlight();
      }
    },
    onClose: () => {
      setIsOpen(false);
      resetHighlight();
    },
  });

  // Click outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        resetHighlight();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [resetHighlight]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
    resetHighlight();
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Link to Item (Project, Deal, etc.)
      </label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          {(() => { 
            const Icon = ENTITY_ICONS[value.type]; 
            return <Icon className="w-4 h-4 text-slate-400" />; 
          })()}
          <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
          <span className="text-xs text-slate-400 capitalize">{value.type}</span>
          <button 
            type="button" 
            onClick={() => onChange(null)} 
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <Input
            value={search}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, deals, estimates..."
            leftIcon={<Search className="w-4 h-4" />}
            disableAutoValidation
          />
          {isOpen && (
            <div 
              ref={dropdownRef} 
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => {
                  const Icon = ENTITY_ICONS[item.type];
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button 
                      key={`${item.type}-${item.id}`} 
                      type="button" 
                      onClick={() => { 
                        onChange({ type: item.type, id: item.id, name: item.name }); 
                        setSearch(''); 
                        setIsOpen(false);
                        resetHighlight();
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                        isHighlighted 
                          ? 'bg-slate-100 dark:bg-slate-700' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                      )}
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400">{item.subtitle}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No projects or deals available yet
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Task Type Button Group
// =============================================================================

function TaskTypeButtonGroup({ 
  value, 
  onChange, 
  taskTypes 
}: { 
  value: TaskType | undefined; 
  onChange: (v: TaskType | undefined) => void; 
  taskTypes: TaskTypeConfig[]; 
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {taskTypes.map(tt => (
        <button 
          key={tt.id} 
          type="button" 
          onClick={() => onChange(value === tt.value ? undefined : tt.value as TaskType)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            value === tt.value 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          )}
        >
          <TaskTypeIcon icon={tt.icon} className="w-4 h-4" />
          <span>{tt.label}</span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Task Detail Panel (Slide-out)
// =============================================================================

export function TaskDetailPanel({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  defaultLinkedContact,
  defaultLinkedItem,
}: { 
  task: Task | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: TaskInput, markDone?: boolean) => void; 
  onDelete?: (taskId: string) => void;
  /** Pre-fill linked contact when creating new task */
  defaultLinkedContact?: LinkedEntity | null;
  /** Pre-fill linked item when creating new task */
  defaultLinkedItem?: LinkedEntity | null;
}) {
  const { users } = useUsersStore();
  const { companies } = useClientsStore();
  const { tasks: allTasks } = useTaskStore();
  const { getActiveTaskTypes } = useTaskTypesStore();
  const toast = useToast();
  
  const [formData, setFormData] = useState<TaskInput>({ 
    title: '', 
    type: undefined, 
    priority: undefined, 
    assignedUserId: '', 
    linkedContact: null, 
    linkedItem: null, 
    description: '', 
    notes: '', 
    dueDate: '', 
    dueTime: '' 
  });
  const [initialData, setInitialData] = useState<TaskInput | null>(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  
  // Separate company selection state (linked to contact)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [linkedCompany, setLinkedCompany] = useState<LinkedEntity | null>(null);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(280); // 280px default
  const [panelWidth, setPanelWidth] = useState(900); // Total panel width
  const [isResizing, setIsResizing] = useState<'sidebar' | 'panel' | null>(null);
  const minSidebarWidth = 220;
  const maxSidebarWidth = 360;
  const minPanelWidth = 750;
  const maxPanelWidth = 1200;
  const minFormWidth = 520; // Minimum form width to prevent text cutoff
  
  const taskTypes = useMemo(() => getActiveTaskTypes(), [getActiveTaskTypes]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing === 'sidebar') {
        // Resize sidebar (drag from middle divider)
        const panelRight = window.innerWidth;
        const newSidebarWidth = panelRight - e.clientX;
        // Ensure form area doesn't get too narrow
        const formWidth = panelWidth - newSidebarWidth - 6; // 6px for dividers
        if (formWidth >= minFormWidth) {
          setSidebarWidth(Math.min(maxSidebarWidth, Math.max(minSidebarWidth, newSidebarWidth)));
        }
      } else if (isResizing === 'panel') {
        // Resize panel (drag from left edge)
        const newWidth = window.innerWidth - e.clientX;
        // Ensure form area doesn't get too narrow
        const formWidth = newWidth - sidebarWidth - 6; // 6px for dividers
        if (formWidth >= minFormWidth || newWidth > panelWidth) {
          setPanelWidth(Math.min(maxPanelWidth, Math.max(minPanelWidth, newWidth)));
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelWidth, sidebarWidth]);

  // Initialize form data when panel opens
  useEffect(() => {
    if (isOpen && task) {
      const data: TaskInput = { 
        title: task.title, 
        description: task.description || '', 
        type: task.type, 
        priority: task.priority, 
        dueDate: task.dueDate || '', 
        dueTime: task.dueTime || '', 
        assignedUserId: task.assignedUserId, 
        linkedContact: task.linkedContact || null, 
        linkedItem: task.linkedItem || null, 
        notes: task.notes || '' 
      };
      setFormData(data); 
      setInitialData(data); 
      setIsMarkingDone(task.status === 'completed');
      
      // Set company state from linkedContact if it's a company, or from contact's company
      if (task.linkedContact?.type === 'company') {
        setLinkedCompany(task.linkedContact);
        setSelectedCompanyId(task.linkedContact.id);
      } else {
        setLinkedCompany(null);
        setSelectedCompanyId(null);
      }
    } else if (isOpen && !task) {
      // New task - use defaults if provided
      const emptyData: TaskInput = { 
        title: '', 
        type: undefined, 
        priority: undefined, 
        assignedUserId: '', 
        linkedContact: defaultLinkedContact?.type === 'contact' ? defaultLinkedContact : null, 
        linkedItem: defaultLinkedItem || null, 
        description: '', 
        notes: '', 
        dueDate: '', 
        dueTime: '' 
      };
      setFormData(emptyData); 
      setInitialData(emptyData); 
      setIsMarkingDone(false);
      
      // Set company from defaults
      if (defaultLinkedContact?.type === 'company') {
        setLinkedCompany(defaultLinkedContact);
        setSelectedCompanyId(defaultLinkedContact.id);
      } else {
        setLinkedCompany(null);
        setSelectedCompanyId(null);
      }
    }
  }, [task, isOpen, defaultLinkedContact, defaultLinkedItem]);

  // Track if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
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

  const handleSave = () => {
    if (!formData.title.trim()) { 
      toast.error('Required Field', 'Please enter a task title'); 
      return; 
    }
    if (!formData.assignedUserId) { 
      toast.error('Required Field', 'Please select who this task is assigned to'); 
      return; 
    }
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
  
  const userOptions = users
    .filter(u => u.isActive)
    .map(u => ({ value: u.id, label: u.name }));
  
  const currentTaskType = taskTypes.find(t => t.value === formData.type);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 dark:bg-black/40" 
          onClick={handleClose} 
        />
        
        {/* Panel - resizable width */}
        <div 
          className="absolute right-0 top-0 bottom-0 bg-white dark:bg-slate-900 shadow-2xl flex animate-slide-in-right"
          style={{ width: panelWidth, maxWidth: '100vw' }}
        >
          {/* Left Edge Resize Handle */}
          <div 
            onMouseDown={() => setIsResizing('panel')}
            className={clsx(
              "w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors flex-shrink-0",
              isResizing === 'panel' ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
            )}
            title="Drag to resize panel"
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0" style={{ minWidth: minFormWidth }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentTaskType && (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <TaskTypeIcon icon={currentTaskType.icon} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                    {task ? formData.title || 'Untitled Task' : 'New Task'}
                  </h2>
                  {formData.dueDate && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(formData.dueDate, 'long')}
                    </p>
                )}
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Task Title */}
            <Input
              value={formData.title}
              onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
              placeholder="Task title..."
              className="text-lg font-medium [&_input]:py-3"
              disableAutoValidation
            />
            
            {/* Activity Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Activity Type
              </label>
              <TaskTypeButtonGroup 
                value={formData.type} 
                onChange={v => setFormData(d => ({ ...d, type: v }))} 
                taskTypes={taskTypes} 
              />
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700" />
            
            {/* Due Date, Time, Assigned To - Row */}
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned To
                </label>
                <SelectFilter
                  label="Select user"
                  value={formData.assignedUserId}
                  onChange={(value) => setFormData(d => ({ ...d, assignedUserId: value }))}
                  options={userOptions}
                  placeholder="Select user..."
                  showAllOption={false}
                  size="md"
                  className="w-full"
                />
              </div>
            </div>

            {/* Priority - Full width row */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRIORITIES.map(p => (
                  <button 
                    key={p.value} 
                    type="button" 
                    onClick={() => setFormData(d => ({ 
                      ...d, 
                      priority: d.priority === p.value ? undefined : p.value 
                    }))}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all', 
                      formData.priority === p.value 
                        ? p.color + ' ring-2 ring-offset-1 ring-blue-500' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700" />
            
            {/* Company & Contact - Row */}
            <div className="grid grid-cols-2 gap-4">
              <CompanySearch 
                value={linkedCompany} 
                onChange={(v) => {
                  setLinkedCompany(v);
                }}
                onCompanySelected={(companyId) => {
                  setSelectedCompanyId(companyId);
                  // If clearing company, also clear contact
                  if (!companyId) {
                    setFormData(d => ({ ...d, linkedContact: null }));
                  }
                }}
              />
              <ContactSearch 
                value={formData.linkedContact?.type === 'contact' ? formData.linkedContact : null} 
                onChange={v => setFormData(d => ({ ...d, linkedContact: v }))}
                companyId={selectedCompanyId}
                onContactSelected={(contact) => {
                  if (contact) {
                    // Auto-select company when contact is selected
                    const company = companies.find(c => c.id === contact.companyId);
                    if (company) {
                      setLinkedCompany({ type: 'company', id: company.id, name: company.name });
                      setSelectedCompanyId(company.id);
                    }
                  }
                }}
              />
            </div>
            
            {/* Link to Item */}
            <ItemSearch 
              value={formData.linkedItem || null} 
              onChange={v => setFormData(d => ({ ...d, linkedItem: v }))} 
            />

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700" />
            
            {/* Notes */}
            <Textarea
              label="Notes"
              value={formData.notes || ''}
              onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
              rows={4}
              placeholder="Add notes..."
            />
            
            {/* Created info */}
            {task && (
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                Created: {new Date(task.createdAt).toLocaleString()}
                {task.createdByName && ` by ${task.createdByName}`}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              {task && (
                <>
                  <button 
                    onClick={handleDelete} 
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                    title="Delete task"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <Toggle
                    checked={isMarkingDone}
                    onChange={setIsMarkingDone}
                    label="Mark as done"
                    size="sm"
                    activeColor="success"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.title.trim() || !formData.assignedUserId}
              >
                {task ? 'Save' : 'Create Task'}
              </Button>
            </div>
          </div>
          </div>
          
          {/* Middle Resizable Divider */}
          <div 
            onMouseDown={() => setIsResizing('sidebar')}
            className={clsx(
              "w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors flex-shrink-0",
              isResizing === 'sidebar' ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
            )}
            title="Drag to resize calendar"
          />
          
          {/* Day Schedule Sidebar with Mini Calendar */}
          <div style={{ width: sidebarWidth, minWidth: minSidebarWidth, maxWidth: maxSidebarWidth }} className="flex-shrink-0">
            <DayScheduleSidebar 
              date={formData.dueDate || ''} 
              tasks={allTasks}
              onDateChange={(newDate) => setFormData(d => ({ ...d, dueDate: newDate }))}
            />
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

// =============================================================================
// Quick Preview Popover (for calendar view)
// =============================================================================

function TaskQuickPreview({ 
  task, 
  position, 
  onClose, 
  onEdit, 
  onMarkDone 
}: { 
  task: Task; 
  position: { x: number; y: number }; 
  onClose: () => void; 
  onEdit: () => void; 
  onMarkDone: () => void; 
}) {
  const { taskTypes } = useTaskTypesStore();
  const { contacts, companies } = useClientsStore();
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { 
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose(); 
      }
    };
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onClose(); 
    };
    document.addEventListener('mousedown', handleClickOutside); 
    document.addEventListener('keydown', handleEsc);
    return () => { 
      document.removeEventListener('mousedown', handleClickOutside); 
      document.removeEventListener('keydown', handleEsc); 
    };
  }, [onClose]);

  const taskType = taskTypes.find(t => t.value === task.type);
  
  const adjustedPosition = useMemo(() => {
    let x = position.x, y = position.y;
    if (x + 300 > window.innerWidth - 20) x = position.x - 300;
    if (y + 280 > window.innerHeight - 20) y = position.y - 280;
    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  // Get URLs for linked entities
  const getContactUrl = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return null;
    const company = companies.find(c => c.id === contact.companyId);
    if (!company) return null;
    const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const contactSlug = `${contact.firstName}-${contact.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `/customers/company/${companySlug}/${company.id}/contact/${contactSlug}/${contact.id}`;
  };

  const getCompanyUrl = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return null;
    const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `/customers/company/${companySlug}/${company.id}`;
  };

  const handleEntityClick = (e: React.MouseEvent, type: string, id: string) => {
    e.stopPropagation();
    let url: string | null = null;
    if (type === 'contact') {
      url = getContactUrl(id);
    } else if (type === 'company') {
      url = getCompanyUrl(id);
    }
    // For linked items (projects, deals, etc.), construct URL based on type
    if (type === 'project') url = `/projects/${id}`;
    if (type === 'deal') url = `/deals/${id}`;
    if (type === 'estimate') url = `/estimates/${id}`;
    if (type === 'invoice') url = `/invoices/${id}`;
    
    if (url) {
      onClose();
      navigate(url);
    }
  };

  return createPortal(
    <div 
      ref={popoverRef} 
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }} 
      className="fixed z-[60] w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        {taskType && (
          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <TaskTypeIcon icon={taskType.icon} className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {task.dueDate && formatDate(task.dueDate, 'long')}
            {task.dueTime && ` at ${task.dueTime}`}
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-3 space-y-2.5 text-sm">
        {/* Assigned To */}
        {task.assignedUserName && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 w-20 flex-shrink-0">Assigned to</span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{task.assignedUserName}</span>
            </div>
          </div>
        )}
        
        {/* Company - derived from contact if available */}
        {task.linkedContact?.type === 'company' && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 w-20 flex-shrink-0">Company</span>
            <button
              onClick={(e) => handleEntityClick(e, 'company', task.linkedContact!.id)}
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 group"
            >
              <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
              <span className="truncate underline-offset-2 group-hover:underline">{task.linkedContact.name}</span>
            </button>
          </div>
        )}
        
        {/* Contact */}
        {task.linkedContact?.type === 'contact' && (
          <>
            {/* Show Company first if contact has one */}
            {(() => {
              const contact = contacts.find(c => c.id === task.linkedContact!.id);
              const company = contact ? companies.find(c => c.id === contact.companyId) : null;
              if (company) {
                return (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20 flex-shrink-0">Company</span>
                    <button
                      onClick={(e) => handleEntityClick(e, 'company', company.id)}
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 group"
                    >
                      <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                      <span className="truncate underline-offset-2 group-hover:underline">{company.name}</span>
                    </button>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 w-20 flex-shrink-0">Contact</span>
              <button
                onClick={(e) => handleEntityClick(e, 'contact', task.linkedContact!.id)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 group"
              >
                <User className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                <span className="truncate underline-offset-2 group-hover:underline">{task.linkedContact.name}</span>
              </button>
            </div>
          </>
        )}
        
        {/* Linked Item (Project, Deal, etc.) */}
        {task.linkedItem && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 w-20 flex-shrink-0 capitalize">{task.linkedItem.type}</span>
            <button
              onClick={(e) => handleEntityClick(e, task.linkedItem!.type, task.linkedItem!.id)}
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 group"
            >
              {(() => { 
                const Icon = ENTITY_ICONS[task.linkedItem.type] || FileText; 
                return <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />; 
              })()}
              <span className="truncate underline-offset-2 group-hover:underline">{task.linkedItem.name}</span>
            </button>
          </div>
        )}
        
        {/* Priority */}
        {task.priority && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 w-20 flex-shrink-0">Priority</span>
            <span className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded', 
              PRIORITIES.find(p => p.value === task.priority)?.color
            )}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button 
          onClick={onMarkDone} 
          className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Mark as done</span>
        </button>
        <Button size="sm" onClick={onEdit}>Edit</Button>
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
// Calendar View
// =============================================================================

function TaskCalendar({ 
  tasks, 
  currentDate, 
  onDateChange, 
  onTaskClick,
  onTaskDrop,
}: { 
  tasks: Task[]; 
  currentDate: Date; 
  onDateChange: (d: Date) => void; 
  onTaskClick: (task: Task, event: React.MouseEvent) => void;
  onTaskDrop?: (taskId: string, newDate: string) => void;
}) {
  const { taskTypes } = useTaskTypesStore();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(t => { 
      if (t.dueDate) { 
        if (!grouped[t.dueDate]) grouped[t.dueDate] = []; 
        grouped[t.dueDate]!.push(t); 
      } 
    });
    return grouped;
  }, [tasks]);
  
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-sm text-slate-900 dark:text-white">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setMonth(d.getMonth() - 1); 
              onDateChange(d); 
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDateChange(new Date())}
          >
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { 
              const d = new Date(currentDate); 
              d.setMonth(d.getMonth() + 1); 
              onDateChange(d); 
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Day Headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before the first of the month */}
        {Array(firstDay).fill(null).map((_, i) => (
          <div 
            key={`e-${i}`} 
            className="h-28 bg-slate-50 dark:bg-slate-900/50 border-t border-l border-slate-200 dark:border-slate-700" 
          />
        ))}
        
        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = todayStr === dateStr;
          const isDragOver = dragOverDate === dateStr;
          
          return (
            <div 
              key={day} 
              className={clsx(
                'h-28 p-1.5 border-t border-l border-slate-200 dark:border-slate-700 overflow-hidden transition-colors', 
                isToday && 'bg-blue-50 dark:bg-blue-900/20',
                isDragOver && 'bg-green-50 dark:bg-green-900/20 ring-2 ring-inset ring-green-400',
                !isDragOver && 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDate(dateStr);
              }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedTaskId && onTaskDrop) {
                  onTaskDrop(draggedTaskId, dateStr);
                }
                setDraggedTaskId(null);
                setDragOverDate(null);
              }}
            >
              <div className={clsx(
                'text-xs font-medium mb-1', 
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              )}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const tt = taskTypes.find(type => type.value === t.type);
                  return (
                    <div 
                      key={t.id} 
                      draggable
                      onDragStart={() => setDraggedTaskId(t.id)}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverDate(null);
                      }}
                      onClick={(e) => onTaskClick(t, e)} 
                      className={clsx(
                        'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-grab truncate transition-colors',
                        draggedTaskId === t.id && 'opacity-50',
                        t.priority === 'urgent' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200' 
                          : t.priority === 'high' 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      )}
                    >
                      {tt && <TaskTypeIcon icon={tt.icon} className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 pl-1 font-medium">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// =============================================================================
// Main TasksPage Component
// =============================================================================

export function TasksPage() {
  useDocumentTitle('Tasks');
  const navigate = useNavigate();
  
  const { users } = useUsersStore();
  const { contacts, companies } = useClientsStore();
  const { tasks, createTask, updateTask, deleteTask, completeTask, reopenTask } = useTaskStore();
  const { getActiveTaskTypes, taskTypes } = useTaskTypesStore();
  const toast = useToast();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Sort state
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Preview state (for calendar)
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });

  // Sort handler (same pattern as CompaniesPage)
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
    };
    navigate(routes[type] || '/');
  }, [navigate]);

  // Time filter logic - defined early so it can be used in cascading filter options
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

  // Build filter options based on tasks data - CASCADING FILTERS
  // Type filter options - cascading with user and time filters
  const taskTypeOptions = useMemo(() => {
    const allTypeCounts = new Map<string, number>();
    const filteredTypeCounts = new Map<string, number>();
    
    tasks.forEach(t => { 
      if (!t.type) return;
      
      // Skip completed/cancelled unless searching
      const isSearching = search && search.trim().length > 0;
      if (!isSearching && (t.status === 'completed' || t.status === 'cancelled')) return;
      
      // Count all tasks by type
      allTypeCounts.set(t.type, (allTypeCounts.get(t.type) || 0) + 1);
      
      // Check if task matches other active filters
      let matchesFilters = true;
      
      if (selectedUser && matchesFilters) {
        matchesFilters = t.assignedUserId === selectedUser;
      }
      
      if (timeFilter !== 'all' && matchesFilters) {
        matchesFilters = matchesTime(t.dueDate);
      }
      
      if (matchesFilters) {
        filteredTypeCounts.set(t.type, (filteredTypeCounts.get(t.type) || 0) + 1);
      }
    });
    
    const hasActiveFilter = selectedUser || timeFilter !== 'all';
    
    return getActiveTaskTypes()
      .map(tt => {
        const totalCount = allTypeCounts.get(tt.value) || 0;
        const matchCount = hasActiveFilter 
          ? (filteredTypeCounts.get(tt.value) || 0) 
          : totalCount;
        return {
          value: tt.value, 
          label: tt.label, 
          icon: <TaskTypeIcon icon={tt.icon} className="w-4 h-4" />, 
          count: matchCount,
          disabled: matchCount === 0,
        };
      })
      .filter(tt => (allTypeCounts.get(tt.value) || 0) > 0) // Only show types that have tasks
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [getActiveTaskTypes, tasks, selectedUser, timeFilter, search, matchesTime]);

  // User filter options - cascading with type and time filters
  const userFilterOptions = useMemo(() => {
    const allUserCounts = new Map<string, number>();
    const filteredUserCounts = new Map<string, number>();
    
    tasks.forEach(t => { 
      if (!t.assignedUserId) return;
      
      // Skip completed/cancelled unless searching
      const isSearching = search && search.trim().length > 0;
      if (!isSearching && (t.status === 'completed' || t.status === 'cancelled')) return;
      
      // Count all tasks by user
      allUserCounts.set(t.assignedUserId, (allUserCounts.get(t.assignedUserId) || 0) + 1);
      
      // Check if task matches other active filters
      let matchesFilters = true;
      
      if (selectedType && matchesFilters) {
        matchesFilters = t.type === selectedType;
      }
      
      if (timeFilter !== 'all' && matchesFilters) {
        matchesFilters = matchesTime(t.dueDate);
      }
      
      if (matchesFilters) {
        filteredUserCounts.set(t.assignedUserId, (filteredUserCounts.get(t.assignedUserId) || 0) + 1);
      }
    });
    
    const hasActiveFilter = selectedType || timeFilter !== 'all';
    
    return users
      .filter(u => allUserCounts.has(u.id)) // Only show users that have tasks
      .map(u => {
        const totalCount = allUserCounts.get(u.id) || 0;
        const matchCount = hasActiveFilter 
          ? (filteredUserCounts.get(u.id) || 0) 
          : totalCount;
        return { 
          value: u.id, 
          label: u.name, 
          count: matchCount,
          disabled: matchCount === 0,
        };
      })
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [users, tasks, selectedType, timeFilter, search, matchesTime]);

  // Filtered tasks (exclude completed/cancelled by default, but show them when searching)
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // When NOT searching: hide completed and cancelled tasks
      // When searching: show all tasks including completed ones
      const isSearching = search && search.trim().length > 0;
      if (!isSearching && (t.status === 'completed' || t.status === 'cancelled')) return false;
      
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && 
          !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedUser && t.assignedUserId !== selectedUser) return false;
      if (selectedType && t.type !== selectedType) return false;
      if (!matchesTime(t.dueDate)) return false;
      return true;
    });

    // Sort tasks
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case 'title':
            aVal = a.title?.toLowerCase() || '';
            bVal = b.title?.toLowerCase() || '';
            break;
          case 'dueDate':
            aVal = a.dueDate || '9999-99-99';
            bVal = b.dueDate || '9999-99-99';
            break;
          case 'dueTime':
            aVal = a.dueTime || '99:99';
            bVal = b.dueTime || '99:99';
            break;
          case 'priority':
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            aVal = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
            bVal = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
            break;
          case 'assignedUserName':
            aVal = a.assignedUserName?.toLowerCase() || '';
            bVal = b.assignedUserName?.toLowerCase() || '';
            break;
          case 'contactPerson':
            aVal = a.linkedContact?.name?.toLowerCase() || '';
            bVal = b.linkedContact?.name?.toLowerCase() || '';
            break;
          case 'company':
            // Get company name from contact or direct link
            const getCompanyName = (task: Task) => {
              if (task.linkedContact?.type === 'company') {
                return companies.find(c => c.id === task.linkedContact!.id)?.name?.toLowerCase() || '';
              }
              if (task.linkedContact?.type === 'contact') {
                const contact = contacts.find(c => c.id === task.linkedContact!.id);
                if (contact?.companyId) {
                  return companies.find(c => c.id === contact.companyId)?.name?.toLowerCase() || '';
                }
              }
              return '';
            };
            aVal = getCompanyName(a);
            bVal = getCompanyName(b);
            break;
          case 'linkedItem':
            aVal = a.linkedItem?.name?.toLowerCase() || '';
            bVal = b.linkedItem?.name?.toLowerCase() || '';
            break;
          default:
            aVal = '';
            bVal = '';
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, search, selectedUser, selectedType, timeFilter, sortField, sortDirection, contacts, companies]);

  // Overdue count for badge
  const overdueCount = useMemo(() => {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    return tasks.filter(t => 
      t.dueDate && 
      parseLocalDate(t.dueDate) < today && 
      t.status !== 'completed' && 
      t.status !== 'cancelled'
    ).length;
  }, [tasks]);

  // Time filter options for QuickFilters component
  const timeFilterOptions: QuickFilterOption<TimeFilter>[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue', count: overdueCount, isWarning: true },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this-week', label: 'This week' },
    { value: 'next-week', label: 'Next week' },
  ], [overdueCount]);

  // Table columns definition - Pipedrive style with resizable columns
  const taskColumns: DataTableColumn<Task>[] = useMemo(() => [
    // 1. Done (checkbox) - not sortable, not resizable
    { 
      key: 'done', 
      header: 'Done', 
      width: 60,
      minWidth: 60,
      resizable: false,
      render: (task) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (task.status === 'completed') {
              reopenTask(task.id);
              toast.info('Task Reopened', 'Task has been moved back to To Do');
            } else {
              completeTask(task.id);
              toast.success('Task Completed', 'Task has been marked as done');
            }
          }}
          className={clsx(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
            task.status === 'completed'
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500'
          )}
        >
          {task.status === 'completed' && <Check className="w-3 h-3" />}
        </button>
      )
    },
    // 2. Subject (Title with type icon)
    { 
      key: 'title', 
      header: 'Subject', 
      sortable: true,
      width: 250,
      minWidth: 150,
      render: (task) => {
        const tt = taskTypes.find(t => t.value === task.type);
        return (
          <div className="flex items-center gap-3">
            {tt && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <TaskTypeIcon icon={tt.icon} className="w-3.5 h-3.5" />
              </div>
            )}
            <span className={clsx(
              'font-medium truncate',
              task.status === 'completed' 
                ? 'text-slate-400 dark:text-slate-500 line-through' 
                : 'text-slate-900 dark:text-white'
            )}>
              {task.title}
            </span>
          </div>
        );
      }
    },
    // 3. Deal/Project (linked item - clickable)
    { 
      key: 'linkedItem', 
      header: 'Deal / Project', 
      sortable: true,
      width: 180,
      minWidth: 120,
      render: (task) => {
        const entity = task.linkedItem;
        if (!entity) return <span className="text-slate-400">—</span>;
        const Icon = ENTITY_ICONS[entity.type] || FileText;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToEntity(entity.type, entity.id);
            }}
            className="flex items-center gap-2 text-sm group"
          >
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate text-blue-600 dark:text-blue-400 group-hover:underline">
              {entity.name}
            </span>
          </button>
        );
      }
    },
    // 4. Priority
    { 
      key: 'priority', 
      header: 'Priority', 
      sortable: true, 
      width: 100,
      minWidth: 80,
      render: (task) => {
        if (!task.priority) return <span className="text-slate-400">—</span>;
        const priority = PRIORITIES.find(p => p.value === task.priority);
        return priority ? (
          <span className={clsx('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', priority.color)}>
            {priority.label}
          </span>
        ) : null;
      }
    },
    // 5. Contact Person (clickable)
    { 
      key: 'contactPerson', 
      header: 'Contact Person', 
      sortable: true,
      width: 150,
      minWidth: 100,
      render: (task) => {
        const contact = task.linkedContact;
        if (!contact || contact.type !== 'contact') return <span className="text-slate-400">—</span>;
        const fullContact = contacts.find(c => c.id === contact.id);
        const name = fullContact ? `${fullContact.firstName} ${fullContact.lastName}`.trim() : contact.name;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToEntity('contact', contact.id);
            }}
            className="flex items-center gap-2 group"
          >
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
              {name}
            </span>
          </button>
        );
      }
    },
    // 6. Email
    { 
      key: 'email', 
      header: 'Email', 
      sortable: true,
      width: 180,
      minWidth: 120,
      render: (task) => {
        const contact = task.linkedContact;
        if (!contact || contact.type !== 'contact') return <span className="text-slate-400">—</span>;
        const fullContact = contacts.find(c => c.id === contact.id);
        const email = fullContact?.email;
        if (!email) return <span className="text-slate-400">—</span>;
        return (
          <a 
            href={`mailto:${email}`} 
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
          >
            {email}
          </a>
        );
      }
    },
    // 7. Phone (use phoneOffice or phoneMobile)
    { 
      key: 'phone', 
      header: 'Phone', 
      sortable: true,
      width: 140,
      minWidth: 100,
      render: (task) => {
        const contact = task.linkedContact;
        if (!contact || contact.type !== 'contact') return <span className="text-slate-400">—</span>;
        const fullContact = contacts.find(c => c.id === contact.id);
        // Prefer office phone, fall back to mobile
        const phone = fullContact?.phoneOffice || fullContact?.phoneMobile;
        if (!phone) return <span className="text-slate-400">—</span>;
        return (
          <a 
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            {phone}
          </a>
        );
      }
    },
    // 8. Company (clickable)
    { 
      key: 'company', 
      header: 'Company', 
      sortable: true,
      width: 160,
      minWidth: 100,
      render: (task) => {
        let companyId: string | undefined;
        let companyName: string | undefined;

        // Check if there's a direct company link
        if (task.linkedContact?.type === 'company') {
          const company = companies.find(c => c.id === task.linkedContact!.id);
          companyId = company?.id;
          companyName = company?.name;
        } else if (task.linkedContact?.type === 'contact') {
          // Look up company from contact
          const contact = contacts.find(c => c.id === task.linkedContact!.id);
          if (contact?.companyId) {
            const company = companies.find(c => c.id === contact.companyId);
            companyId = company?.id;
            companyName = company?.name;
          }
        }

        if (!companyId || !companyName) return <span className="text-slate-400">—</span>;
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToEntity('company', companyId!);
            }}
            className="flex items-center gap-2 group"
          >
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
              {companyName}
            </span>
          </button>
        );
      }
    },
    // 9. Due Date
    { 
      key: 'dueDate', 
      header: 'Due Date', 
      sortable: true, 
      width: 110,
      minWidth: 90,
      render: (task) => {
        if (!task.dueDate) return <span className="text-slate-400">—</span>;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = parseLocalDate(task.dueDate);
        const isOverdue = dueDate < today && task.status !== 'completed';
        const isToday = dueDate.getTime() === today.getTime();
        
        if (isOverdue) {
          return (
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">
              {formatDate(task.dueDate)}
            </span>
          );
        }
        if (isToday) {
          return (
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              Today
            </span>
          );
        }
        return (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {formatDate(task.dueDate)}
          </span>
        );
      }
    },
    // 10. Time
    { 
      key: 'dueTime', 
      header: 'Time', 
      sortable: true,
      width: 80,
      minWidth: 60,
      render: (task) => {
        if (!task.dueTime) return <span className="text-slate-400">—</span>;
        return (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {task.dueTime}
          </span>
        );
      }
    },
    // 11. Assigned User
    { 
      key: 'assignedUserName', 
      header: 'Assigned To', 
      sortable: true, 
      width: 140,
      minWidth: 100,
      render: (task) => {
        if (!task.assignedUserName) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
              {task.assignedUserName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{task.assignedUserName}</span>
          </div>
        );
      }
    },
  ], [taskTypes, contacts, companies, completeTask, reopenTask, toast, navigateToEntity]);

  // Handlers
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
    setIsPanelOpen(false); 
    setSelectedTask(null);
  };

  const handleDelete = async (taskId: string) => { 
    await deleteTask(taskId); 
    toast.success('Task Deleted', 'The task has been removed'); 
  };
  
  const openEditPanel = (task: Task) => { 
    setSelectedTask(task); 
    setIsPanelOpen(true); 
    setPreviewTask(null); 
  };
  
  const openNewPanel = () => { 
    setSelectedTask(null); 
    setIsPanelOpen(true); 
  };
  
  const handleCalendarTaskClick = (task: Task, event: React.MouseEvent) => { 
    event.stopPropagation(); 
    setPreviewTask(task); 
    setPreviewPosition({ x: event.clientX, y: event.clientY }); 
  };
  
  const handleMarkDone = async () => { 
    if (previewTask) { 
      await updateTask(previewTask.id, { status: 'completed' } as Partial<TaskInput>); 
      toast.success('Task Completed', 'Task has been marked as done'); 
      setPreviewTask(null); 
    } 
  };

  return (
    <Page 
      title="Tasks" 
      description="Manage tasks and activities"
      fillHeight
      actions={
        <Button onClick={openNewPanel} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      }
    >
      {/* Main Content Container - fills available height */}
      <div className="flex flex-col h-full min-h-0">
        {/* Filter Bar - single row */}
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
            className="w-48 [&_input]:h-[34px] [&_input]:text-sm"
          />

          {/* Type Filter */}
          {taskTypeOptions.length > 0 && (
            <SelectFilter
              label="Type"
              value={selectedType}
              onChange={setSelectedType}
              options={taskTypeOptions}
              showAllOption={true}
              size="sm"
              className="w-36"
            />
          )}

          {/* User Filter */}
          {userFilterOptions.length > 0 && (
            <SelectFilter
              label="Assigned To"
              value={selectedUser}
              onChange={setSelectedUser}
              options={userFilterOptions}
              showAllOption={true}
              size="sm"
              icon={User}
              className="w-36"
            />
          )}

          {/* Vertical Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-600" />

          {/* Time Filter Buttons */}
          <QuickFilters
            options={timeFilterOptions}
            value={timeFilter}
            onChange={setTimeFilter}
          />
        </FilterBar>

      {/* Content - fills remaining height */}
      <div className="flex-1 min-h-0">
        {viewMode === 'list' ? (
          <DataTable<Task> 
            columns={taskColumns} 
            data={filteredTasks} 
            rowKey={(task) => task.id} 
            onRowClick={(task) => openEditPanel(task)}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyState={
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                  No tasks yet
                </h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Get started by creating your first task
                </p>
              </CardContent>
            } 
          />
        ) : (
          <TaskCalendar 
            tasks={filteredTasks} 
            currentDate={currentDate} 
            onDateChange={setCurrentDate} 
            onTaskClick={handleCalendarTaskClick}
            onTaskDrop={(taskId, newDate) => {
              updateTask(taskId, { dueDate: newDate });
              toast.success('Task Moved', `Due date changed to ${newDate}`);
            }}
          />
        )}
      </div>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel 
        task={selectedTask} 
        isOpen={isPanelOpen} 
        onClose={() => { setIsPanelOpen(false); setSelectedTask(null); }} 
        onSave={handleSave} 
        onDelete={handleDelete} 
      />
      
      {/* Quick Preview (Calendar) */}
      {previewTask && (
        <TaskQuickPreview 
          task={previewTask} 
          position={previewPosition} 
          onClose={() => setPreviewTask(null)} 
          onEdit={() => openEditPanel(previewTask)} 
          onMarkDone={handleMarkDone} 
        />
      )}
      
      {/* Animation Styles */}
      <style>{`
        @keyframes slide-in-right { 
          from { transform: translateX(100%); } 
          to { transform: translateX(0); } 
        }
        .animate-slide-in-right { 
          animation: slide-in-right 0.2s ease-out; 
        }
      `}</style>
    </Page>
  );
}

export default TasksPage;