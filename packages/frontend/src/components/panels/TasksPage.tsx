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
  Input, Toggle, TaskTypeIcon
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
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = useMemo(() => {
    const items = companies.map(c => ({ 
      type: 'company' as const, 
      id: c.id, 
      name: c.name 
    }));
    if (!search.trim()) return items.slice(0, 10);
    return items
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, companies]);

  const { highlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: filteredCompanies,
    isOpen,
    onSelect: (item) => {
      if (item) {
        onChange({ type: 'company', id: item.id, name: item.name });
        onCompanySelected?.(item.id);
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

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Company
      </label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{value.name}</span>
          <button 
            type="button" 
            onClick={() => {
              onChange(null);
              onCompanySelected?.(null);
            }} 
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); resetHighlight(); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search companies..."
            leftIcon={<Search className="w-4 h-4" />}
            disableAutoValidation
          />
          {isOpen && filteredCompanies.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredCompanies.map((item, index) => (
                <button 
                  key={item.id} 
                  type="button" 
                  onClick={() => { 
                    onChange({ type: 'company', id: item.id, name: item.name });
                    onCompanySelected?.(item.id);
                    setSearch(''); 
                    setIsOpen(false);
                    resetHighlight();
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    index === highlightedIndex 
                      ? 'bg-slate-100 dark:bg-slate-700' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter contacts by company if companyId is set
  const filteredContacts = useMemo(() => {
    let contactList = contacts;
    
    // If company is selected, only show contacts from that company
    if (companyId) {
      contactList = contacts.filter(c => c.companyId === companyId);
    }
    
    const items = contactList.map(c => {
      const company = companies.find(comp => comp.id === c.companyId);
      return { 
        type: 'contact' as const, 
        id: c.id, 
        name: `${c.firstName} ${c.lastName}`.trim() || 'Unnamed',
        companyId: c.companyId,
        companyName: company?.name || '',
      };
    });
    
    if (!search.trim()) return items.slice(0, 10);
    return items
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, contacts, companies, companyId]);

  const { highlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: filteredContacts,
    isOpen,
    onSelect: (item) => {
      if (item) {
        onChange({ type: 'contact', id: item.id, name: item.name });
        onContactSelected?.({ id: item.id, companyId: item.companyId, name: item.name });
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

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Contact {companyId && <span className="text-xs text-slate-400">(filtered by company)</span>}
      </label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <User className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-sm text-slate-900 dark:text-white truncate">{value.name}</span>
          <button 
            type="button" 
            onClick={() => {
              onChange(null);
              onContactSelected?.(null);
            }} 
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); resetHighlight(); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={companyId ? "Search contacts from this company..." : "Search all contacts..."}
            leftIcon={<Search className="w-4 h-4" />}
            disableAutoValidation
          />
          {isOpen && filteredContacts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredContacts.map((item, index) => (
                <button 
                  key={item.id} 
                  type="button" 
                  onClick={() => { 
                    onChange({ type: 'contact', id: item.id, name: item.name });
                    onContactSelected?.({ id: item.id, companyId: item.companyId, name: item.name });
                    setSearch(''); 
                    setIsOpen(false);
                    resetHighlight();
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    index === highlightedIndex 
                      ? 'bg-slate-100 dark:bg-slate-700' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-900 dark:text-white truncate block">{item.name}</span>
                    {item.companyName && !companyId && (
                      <span className="text-xs text-slate-400 truncate block">{item.companyName}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {isOpen && filteredContacts.length === 0 && search && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-3 text-center text-sm text-slate-500">
              No contacts found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Day Schedule Sidebar Component
// =============================================================================

function DayScheduleSidebar({ 
  date,
  tasks,
}: { 
  date: string;
  tasks: Task[];
}) {
  // Filter tasks for this date
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

  // Generate time slots from 6 AM to 9 PM
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 21; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      slots.push(`${displayHour} ${ampm}`);
    }
    return slots;
  }, []);

  if (!date) {
    return (
      <div className="w-64 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col items-center justify-center text-center">
        <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a due date to see your schedule</p>
      </div>
    );
  }

  const dateObj = parseLocalDate(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="w-64 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{dayName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{monthDay}</p>
      </div>
      
      {/* Schedule */}
      <div className="flex-1 overflow-y-auto">
        {/* All-day / no-time tasks */}
        {dayTasks.filter(t => !t.dueTime).length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700">
              All Day
            </div>
            {dayTasks.filter(t => !t.dueTime).map(task => (
              <div 
                key={task.id}
                className="mx-2 my-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300 truncate"
              >
                {task.title}
              </div>
            ))}
          </div>
        )}
        
        {/* Time slots */}
        <div className="relative">
          {timeSlots.map((slot, index) => {
            const tasksForHour = dayTasks.filter(t => {
              if (!t.dueTime) return false;
              const taskHour = parseInt(t.dueTime.split(':')[0] || '0', 10);
              return taskHour === index + 6;
            });
            
            return (
              <div key={slot} className="flex border-b border-slate-100 dark:border-slate-700/50">
                <div className="w-12 py-2 text-right pr-2 text-xs text-slate-400 flex-shrink-0">
                  {slot}
                </div>
                <div className="flex-1 py-1 min-h-[40px]">
                  {tasksForHour.map(task => (
                    <div 
                      key={task.id}
                      className="mx-1 px-2 py-1 bg-blue-500 text-white rounded text-xs truncate mb-0.5"
                      title={task.title}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center">
        Calendar sync coming soon
      </div>
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
  
  const taskTypes = useMemo(() => getActiveTaskTypes(), [getActiveTaskTypes]);

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
        
        {/* Panel - wider to accommodate sidebar */}
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl flex animate-slide-in-right">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
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
              className="text-xl font-medium"
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
            
            {/* Due Date & Time - Row 1 */}
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
            
            {/* Priority & Assigned To - Row 2 */}
            <div className="grid grid-cols-2 gap-4">
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
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all', 
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
              <SelectFilter
                label="Assigned To"
                value={formData.assignedUserId}
                onChange={(value) => setFormData(d => ({ ...d, assignedUserId: value }))}
                options={userOptions}
                placeholder="Select user..."
                showAllOption={false}
                size="md"
                className="w-full"
              />
            </div>
            
            {/* Company & Contact - Row 3 (linked) */}
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
            
            {/* Link to Item - Row 4 */}
            <ItemSearch 
              value={formData.linkedItem || null} 
              onChange={v => setFormData(d => ({ ...d, linkedItem: v }))} 
            />
            
            {/* Notes */}
            <Textarea
              label="Notes"
              value={formData.notes || ''}
              onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
              rows={3}
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
          
          {/* Day Schedule Sidebar */}
          <DayScheduleSidebar 
            date={formData.dueDate || ''} 
            tasks={allTasks} 
          />
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
    if (x + 280 > window.innerWidth - 20) x = position.x - 280;
    if (y + 200 > window.innerHeight - 20) y = position.y - 200;
    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  return createPortal(
    <div 
      ref={popoverRef} 
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }} 
      className="fixed z-[60] w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        {taskType && (
          <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
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
      <div className="px-4 py-3 space-y-2 text-sm">
        {task.assignedUserName && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <User className="w-4 h-4 text-slate-400" />
            <span>{task.assignedUserName}</span>
          </div>
        )}
        {task.linkedContact && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {(() => { 
              const Icon = ENTITY_ICONS[task.linkedContact.type]; 
              return <Icon className="w-4 h-4 text-slate-400" />; 
            })()}
            <span className="truncate">{task.linkedContact.name}</span>
          </div>
        )}
        {task.priority && (
          <div className="flex items-center gap-2">
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

  // Build filter options based on tasks data
  const taskTypeOptions = useMemo(() => {
    const typeCounts = new Map<string, number>();
    tasks.forEach(t => { 
      if (t.type) typeCounts.set(t.type, (typeCounts.get(t.type) || 0) + 1); 
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

  const userFilterOptions = useMemo(() => {
    const userCounts = new Map<string, number>();
    tasks.forEach(t => { 
      if (t.assignedUserId) userCounts.set(t.assignedUserId, (userCounts.get(t.assignedUserId) || 0) + 1); 
    });
    return users
      .filter(u => userCounts.has(u.id))
      .map(u => ({ 
        value: u.id, 
        label: u.name, 
        count: userCounts.get(u.id) || 0 
      }));
  }, [users, tasks]);

  // Time filter logic
  const matchesTime = (dueDate?: string): boolean => {
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
  };

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

  // Button styles - A2 Design: Bordered with Blue Accents
  const timeBtn = (active: boolean, danger?: boolean) => clsx(
    "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
    active
      ? (danger
          ? "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800"
          : "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800"
        )
      : (danger
          ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        )
  );

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
        {/* Filters Bar - A2 Design: Bordered with Blue Accents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-3 shadow-sm mb-4 flex-shrink-0">
        {/* View Mode Toggle - Blue accent, matches dropdown height */}
        <div className="flex border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden h-[34px]">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              "flex items-center gap-1.5 px-3 text-sm font-medium transition-all border-r border-slate-200 dark:border-slate-600",
              viewMode === 'list'
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={clsx(
              "flex items-center gap-1.5 px-3 text-sm font-medium transition-all",
              viewMode === 'calendar'
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendar
          </button>
        </div>

        {/* Search - matching height */}
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
            icon={<User className="w-3.5 h-3.5" />}
          />
        )}

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-600" />

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setTimeFilter('all')} className={timeBtn(timeFilter === 'all')}>
            All
          </button>
          <button onClick={() => setTimeFilter('overdue')} className={timeBtn(timeFilter === 'overdue', true)}>
            {overdueCount > 0 ? `Overdue (${overdueCount})` : 'Overdue'}
          </button>
          <button onClick={() => setTimeFilter('today')} className={timeBtn(timeFilter === 'today')}>
            Today
          </button>
          <button onClick={() => setTimeFilter('tomorrow')} className={timeBtn(timeFilter === 'tomorrow')}>
            Tomorrow
          </button>
          <button onClick={() => setTimeFilter('this-week')} className={timeBtn(timeFilter === 'this-week')}>
            This week
          </button>
          <button onClick={() => setTimeFilter('next-week')} className={timeBtn(timeFilter === 'next-week')}>
            Next week
          </button>
        </div>

        {/* Task Count */}
        <span className="ml-auto text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {filteredTasks.length} tasks
        </span>
      </div>

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