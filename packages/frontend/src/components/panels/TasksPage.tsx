// ===========================================================================
// TasksPage - Pipedrive-inspired Task Management
// Location: packages/frontend/src/components/panels/TasksPage.tsx
// 
// UPDATED: Now uses AddCompanyForm, AddContactForm, AddLeadForm, AddDealForm
// from add-forms via useFormStack instead of inline QuickAdd modals
// ===========================================================================

import { useDocumentTitle, useDropdownKeyboard } from '@/hooks';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, 
  Clock, X, User, Building2, FileText, Check, Trash2, Search,
  Target, TrendingUp
} from 'lucide-react';
import { Page } from '@/components/layout';
import { 
  Card, CardContent, Button, SelectFilter, Textarea, SearchInput,
  DataTable, type DataTableColumn, DatePicker, TimePicker, UnsavedChangesModal,
  Input, Toggle, TaskTypeIcon, EntitySearchDropdown, type EntitySearchItem,
  FilterBar, FilterCount, FilterToggle, QuickFilters, type QuickFilterOption,
  QuickViewModal, type QuickViewField
} from '@/components/common';
import { AddItemPanel } from '@/components/panels/AddItemPanel';
import { DayScheduleSidebar } from '@/components/panels/DayScheduleSidebar';
import { useFormStack } from '@/components/panels/add-forms';
import { useUsersStore, useClientsStore, useToast, useSalesStore } from '@/contexts';
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

function CompanySearch({ 
  value, 
  onChange,
  onCompanySelected,
  onAddCompany,
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  onCompanySelected?: (companyId: string | null) => void;
  onAddCompany?: (name: string, callback: (company: { id: string; name: string }) => void) => void;
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

  const handleAddNew = (name: string) => {
    if (onAddCompany) {
      onAddCompany(name, (company) => {
        onChange({ type: 'company', id: company.id, name: company.name });
        onCompanySelected?.(company.id);
      });
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
      allowCreate={!!onAddCompany}
      onCreateNew={handleAddNew}
      createLabel="Add new company"
    />
  );
}

// =============================================================================
// Contact Search Component (filtered by company, with add new option)
// =============================================================================

function ContactSearch({ 
  value, 
  onChange,
  companyId,
  companyName,
  onContactSelected,
  onAddContact,
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  companyId: string | null;
  companyName?: string;
  onContactSelected?: (contact: { id: string; companyId: string; name: string } | null) => void;
  onAddContact?: (name: string, companyId: string, companyName: string, callback: (contact: { id: string; name: string }) => void) => void;
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

  const handleAddNew = (name: string) => {
    if (onAddContact && companyId) {
      const resolvedCompanyName = companyName || companies.find(c => c.id === companyId)?.name || '';
      onAddContact(name, companyId, resolvedCompanyName, (contact) => {
        onChange({ type: 'contact', id: contact.id, name: contact.name });
        onContactSelected?.({ id: contact.id, companyId, name: contact.name });
      });
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
      allowCreate={!!companyId && !!onAddContact}
      onCreateNew={handleAddNew}
      createLabel="Add new contact"
    />
  );
}

// =============================================================================
// Item Search Component (Leads, Deals - filtered by company/contact)
// =============================================================================

interface SearchItem { 
  type: LinkedEntityType; 
  id: string; 
  name: string; 
  subtitle?: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
}

function ItemSearch({ 
  value, 
  onChange,
  companyId,
  companyName,
  contactId,
  contactName,
  onItemSelected,
  onAddLead,
  onAddDeal,
}: { 
  value: LinkedEntity | null; 
  onChange: (v: LinkedEntity | null) => void;
  companyId?: string | null;
  companyName?: string;
  contactId?: string | null;
  contactName?: string;
  onItemSelected?: (item: { 
    companyId?: string; 
    companyName?: string; 
    contactId?: string; 
    contactName?: string;
  } | null) => void;
  onAddLead?: (name: string, companyId: string, companyName: string, contactId: string | undefined, contactName: string | undefined, callback: (lead: { id: string; name: string }) => void) => void;
  onAddDeal?: (name: string, companyId: string, companyName: string, contactId: string | undefined, contactName: string | undefined, callback: (deal: { id: string; name: string }) => void) => void;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get leads and deals from sales store
  const { leads, deals } = useSalesStore();
  const { contacts, companies } = useClientsStore();

  // Build all linkable items from leads and deals (filtered by company/contact)
  const allItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    
    // Add leads (filtered)
    leads.forEach(lead => {
      if (lead.convertedToDealId) return; // Skip converted leads
      
      // Filter by company if selected
      if (companyId && lead.companyId !== companyId) return;
      
      // Filter by contact if selected
      if (contactId && lead.contactId !== contactId) return;
      
      // Get contact name if available
      const contact = lead.contactId ? contacts.find(c => c.id === lead.contactId) : null;
      const leadContactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined;
      
      items.push({
        type: 'lead' as LinkedEntityType,
        id: lead.id,
        name: lead.name,
        subtitle: lead.companyName || 'Lead',
        companyId: lead.companyId,
        companyName: lead.companyName,
        contactId: lead.contactId,
        contactName: leadContactName,
      });
    });
    
    // Add active deals (filtered)
    deals.filter(d => !d.deletedAt && d.status === 'active').forEach(deal => {
      // Filter by company if selected
      if (companyId && deal.companyId !== companyId) return;
      
      // Filter by contact if selected
      if (contactId && deal.contactId !== contactId) return;
      
      // Get contact name if available
      const contact = deal.contactId ? contacts.find(c => c.id === deal.contactId) : null;
      const dealContactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined;
      
      items.push({
        type: 'deal' as LinkedEntityType,
        id: deal.id,
        name: deal.name,
        subtitle: deal.companyName || 'Deal',
        companyId: deal.companyId,
        companyName: deal.companyName,
        contactId: deal.contactId,
        contactName: dealContactName,
      });
    });
    
    return items;
  }, [leads, deals, contacts, companyId, contactId]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems.slice(0, 10);
    return allItems
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, allItems]);

  const handleSelectItem = (item: SearchItem) => {
    onChange({ type: item.type, id: item.id, name: item.name });
    setSearch('');
    setIsOpen(false);
    resetHighlight();
    
    // Notify parent about company/contact from selected lead/deal
    if (onItemSelected) {
      onItemSelected({
        companyId: item.companyId,
        companyName: item.companyName,
        contactId: item.contactId,
        contactName: item.contactName,
      });
    }
  };

  // Keyboard navigation using the hook
  const { highlightedIndex, handleKeyDown, resetHighlight } = useDropdownKeyboard({
    items: filteredItems,
    isOpen,
    onSelect: (item) => {
      if (item) {
        handleSelectItem(item);
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

  // Get icon for entity type
  const getEntityIcon = (type: LinkedEntityType) => {
    switch (type) {
      case 'lead': return Target;
      case 'deal': return TrendingUp;
      default: return ENTITY_ICONS[type] || FileText;
    }
  };

  // Check if we can create new items (need company to be selected)
  const canCreateNew = !!companyId && search.trim().length > 0;
  const searchTerm = search.trim();

  const handleCreateLead = () => {
    if (!companyId || !searchTerm || !onAddLead) return;
    const resolvedCompanyName = companyName || companies.find(c => c.id === companyId)?.name || '';
    onAddLead(searchTerm, companyId, resolvedCompanyName, contactId || undefined, contactName, (lead) => {
      onChange({ type: 'lead', id: lead.id, name: lead.name });
      setSearch('');
    });
    setIsOpen(false);
  };

  const handleCreateDeal = () => {
    if (!companyId || !searchTerm || !onAddDeal) return;
    const resolvedCompanyName = companyName || companies.find(c => c.id === companyId)?.name || '';
    onAddDeal(searchTerm, companyId, resolvedCompanyName, contactId || undefined, contactName, (deal) => {
      onChange({ type: 'deal', id: deal.id, name: deal.name });
      setSearch('');
    });
    setIsOpen(false);
  };

  // Build filter label
  const filterLabel = companyId || contactId 
    ? `(filtered${companyId ? ' by company' : ''}${contactId ? ' by contact' : ''})`
    : undefined;

  return (
    <>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Link to Lead or Deal
          {filterLabel && (
            <span className="ml-1 text-xs font-normal text-slate-400">{filterLabel}</span>
          )}
        </label>
        {value ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            {(() => { 
              const Icon = getEntityIcon(value.type); 
              return <Icon className="w-4 h-4 text-slate-400" />; 
            })()}
            <span className="flex-1 text-sm text-slate-900 dark:text-white">{value.name}</span>
            <span className="text-xs text-slate-400 capitalize">{value.type}</span>
            <button 
              type="button" 
              onClick={() => { onChange(null); onItemSelected?.(null); }}
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
              placeholder="Search leads, deals..."
              leftIcon={<Search className="w-4 h-4" />}
              disableAutoValidation
            />
            {isOpen && (
              <div 
                ref={dropdownRef} 
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
              >
                {/* Create new options */}
                {canCreateNew && (
                  <div className="border-b border-slate-200 dark:border-slate-700">
                    <button 
                      type="button" 
                      onClick={handleCreateLead}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Add "{searchTerm}" as new Lead</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCreateDeal}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Add "{searchTerm}" as new Deal</span>
                    </button>
                  </div>
                )}
                
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => {
                    const Icon = getEntityIcon(item.type);
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <button 
                        key={`${item.type}-${item.id}`} 
                        type="button" 
                        onClick={() => handleSelectItem(item)}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                          isHighlighted 
                            ? 'bg-slate-100 dark:bg-slate-700' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                        )}
                      >
                        <Icon className="w-4 h-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-900 dark:text-white truncate block">
                            {item.name}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-slate-400 truncate block">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 capitalize flex-shrink-0">{item.type}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    {allItems.length === 0 
                      ? (companyId || contactId 
                          ? 'No leads or deals for this selection' 
                          : 'No leads or deals available yet')
                      : 'No matching items found'
                    }
                    {!companyId && (
                      <p className="mt-1 text-slate-500">Select a company to create new leads/deals</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
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
// Task Detail Panel (Slide-out with Calendar Sidebar)
// =============================================================================

export function TaskDetailPanel({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  defaultLinkedContact,
  defaultLinkedItem,
  defaultCompany,
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
  /** Pre-fill company when creating new task (for contact pages) */
  defaultCompany?: LinkedEntity | null;
}) {
  const { users } = useUsersStore();
  const { companies } = useClientsStore();
  const { tasks: allTasks } = useTaskStore();
  const { getActiveTaskTypes } = useTaskTypesStore();
  const toast = useToast();
  const { openAddCompany, openAddContact, openAddLead, openAddDeal } = useFormStack();
  
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
      } else if (defaultCompany) {
        // Use explicit defaultCompany prop (from contact detail page)
        setLinkedCompany(defaultCompany);
        setSelectedCompanyId(defaultCompany.id);
      } else {
        setLinkedCompany(null);
        setSelectedCompanyId(null);
      }
    }
  }, [task, isOpen, defaultLinkedContact, defaultLinkedItem, defaultCompany]);

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

  // Footer content
  const panelFooter = (
    <div className="flex items-center justify-between">
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
  );

  return (
    <>
      <AddItemPanel
        isOpen={isOpen}
        onClose={handleClose}
        title={task ? (formData.title || 'Untitled Task') : 'New Task'}
        subtitle={formData.dueDate ? formatDate(formData.dueDate, 'long') : undefined}
        icon={currentTaskType ? (
          <TaskTypeIcon icon={currentTaskType.icon} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
        footer={panelFooter}
        initialWidth={900}
        minWidth={700}
        maxWidth={1200}
        sidebar={
          <DayScheduleSidebar 
            date={formData.dueDate || ''} 
            tasks={allTasks}
            onDateChange={(newDate) => setFormData(d => ({ ...d, dueDate: newDate }))}
          />
        }
        sidebarWidth={280}
        scrollable
      >
        <div className="space-y-5">
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
                // If clearing company, also clear contact and linked item
                if (!companyId) {
                  setFormData(d => ({ ...d, linkedContact: null, linkedItem: null }));
                }
              }}
              onAddCompany={(name, callback) => {
                openAddCompany({
                  defaultName: name,
                  onCreated: (company) => callback({ id: company.id, name: company.name }),
                });
              }}
            />
            <ContactSearch 
              value={formData.linkedContact?.type === 'contact' ? formData.linkedContact : null} 
              onChange={v => setFormData(d => ({ ...d, linkedContact: v }))}
              companyId={selectedCompanyId}
              companyName={linkedCompany?.name}
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
              onAddContact={(name, companyId, companyName, callback) => {
                openAddContact({
                  defaultCompanyId: companyId,
                  defaultCompanyName: companyName,
                  defaultName: name,
                  onCreated: (contact) => callback({ id: contact.id, name: `${contact.firstName} ${contact.lastName}`.trim() }),
                });
              }}
            />
          </div>
          
          {/* Link to Item */}
          <ItemSearch 
            value={formData.linkedItem || null} 
            onChange={v => setFormData(d => ({ ...d, linkedItem: v }))}
            companyId={selectedCompanyId}
            companyName={linkedCompany?.name}
            contactId={formData.linkedContact?.type === 'contact' ? formData.linkedContact.id : null}
            contactName={formData.linkedContact?.type === 'contact' ? formData.linkedContact.name : undefined}
            onItemSelected={(item) => {
              if (item) {
                // Auto-fill company from lead/deal if not already set
                if (item.companyId && item.companyName && !selectedCompanyId) {
                  setLinkedCompany({ type: 'company', id: item.companyId, name: item.companyName });
                  setSelectedCompanyId(item.companyId);
                }
                
                // Auto-fill contact from lead/deal if not already set and only one contact
                if (item.contactId && item.contactName && !formData.linkedContact) {
                  setFormData(d => ({ 
                    ...d, 
                    linkedContact: { type: 'contact', id: item.contactId!, name: item.contactName! }
                  }));
                }
              }
            }}
            onAddLead={(name, companyId, companyName, contactId, contactName, callback) => {
              openAddLead({
                defaultName: name,
                defaultCompanyId: companyId,
                defaultCompanyName: companyName,
                defaultContactId: contactId,
                defaultContactName: contactName,
                onCreated: (lead) => callback({ id: lead.id, name: lead.name }),
              });
            }}
            onAddDeal={(name, companyId, companyName, contactId, contactName, callback) => {
              openAddDeal({
                defaultName: name,
                defaultCompanyId: companyId,
                defaultCompanyName: companyName,
                defaultContactId: contactId,
                defaultContactName: contactName,
                onCreated: (deal) => callback({ id: deal.id, name: deal.name }),
              });
            }}
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
      </AddItemPanel>
      
      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />
    </>
  );
}

// =============================================================================
// Task Quick View (uses generic QuickViewModal)
// =============================================================================

function TaskQuickView({ 
  task, 
  isOpen,
  onClose, 
  onEdit, 
  onMarkDone,
  onDelete,
}: { 
  task: Task | null;
  isOpen: boolean;
  onClose: () => void; 
  onEdit: () => void; 
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const { taskTypes } = useTaskTypesStore();
  const { contacts, companies } = useClientsStore();
  const { users } = useUsersStore();
  const navigate = useNavigate();

  if (!task) return null;

  const taskType = taskTypes.find(t => t.value === task.type);
  const assignedUser = users.find(u => u.id === task.assignedUserId);
  const priority = PRIORITIES.find(p => p.value === task.priority);

  // Get company from contact if linked
  const linkedContact = task.linkedContact?.type === 'contact' 
    ? contacts.find(c => c.id === task.linkedContact!.id) 
    : null;
  const linkedCompany = task.linkedContact?.type === 'company'
    ? companies.find(c => c.id === task.linkedContact!.id)
    : linkedContact 
      ? companies.find(c => c.id === linkedContact.companyId)
      : null;

  const handleEntityClick = (type: string, id: string) => {
    let url: string | null = null;
    if (type === 'contact') url = `/clients/contacts/${id}`;
    else if (type === 'company') url = `/clients/companies/${id}`;
    else if (type === 'project') url = `/projects/${id}`;
    else if (type === 'deal') url = `/sales/deals/${id}`;
    else if (type === 'lead') url = `/sales/leads/${id}`;
    else if (type === 'estimate') url = `/estimates/${id}`;
    else if (type === 'invoice') url = `/accounting/invoices/${id}`;
    
    if (url) {
      onClose();
      navigate(url);
    }
  };

  // Build badges
  const badges: { label: string; className?: string }[] = [
    {
      label: task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending',
      className: task.status === 'completed' 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : task.status === 'in_progress'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    }
  ];
  if (priority) {
    badges.push({ label: `${priority.label} Priority`, className: priority.color });
  }

  // Build fields
  const fields: QuickViewField[] = [];
  
  if (assignedUser) {
    fields.push({
      label: 'Assigned To',
      value: assignedUser.name,
      icon: <User className="w-4 h-4" />,
    });
  }
  
  if (taskType) {
    fields.push({
      label: 'Type',
      value: taskType.label,
      icon: <TaskTypeIcon icon={taskType.icon} className="w-4 h-4" />,
    });
  }

  if (linkedCompany) {
    fields.push({
      label: 'Company',
      value: linkedCompany.name,
      icon: <Building2 className="w-4 h-4" />,
      onClick: () => handleEntityClick('company', linkedCompany.id),
    });
  }

  if (linkedContact) {
    fields.push({
      label: 'Contact',
      value: `${linkedContact.firstName} ${linkedContact.lastName}`,
      icon: <User className="w-4 h-4" />,
      onClick: () => handleEntityClick('contact', linkedContact.id),
    });
  }

  if (task.linkedItem) {
    const Icon = task.linkedItem.type === 'lead' ? Target
      : task.linkedItem.type === 'deal' ? TrendingUp
      : ENTITY_ICONS[task.linkedItem.type] || FileText;
    fields.push({
      label: `Linked ${task.linkedItem.type}`,
      value: task.linkedItem.name,
      icon: <Icon className="w-4 h-4" />,
      onClick: () => handleEntityClick(task.linkedItem!.type, task.linkedItem!.id),
      fullWidth: true,
    });
  }

  // Build subtitle
  const subtitle = (
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
  );

  return (
    <QuickViewModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={subtitle}
      icon={taskType ? (
        <TaskTypeIcon icon={taskType.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      ) : (
        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      )}
      badges={badges}
      fields={fields}
      notes={task.notes}
      footerMeta={
        <>
          Created {new Date(task.createdAt).toLocaleString()}
          {task.createdByName && ` by ${task.createdByName}`}
        </>
      }
      leftActions={[
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: onDelete,
          variant: 'danger',
        },
        ...(task.status !== 'completed' ? [{
          label: 'Mark as done',
          icon: <Check className="w-4 h-4" />,
          onClick: onMarkDone,
        }] : []),
      ]}
      primaryAction={{
        label: 'Edit Task',
        onClick: onEdit,
      }}
    />
  );
}

// =============================================================================
// Follow-Up Task Modal (appears after marking task done if linked to lead/deal)
// =============================================================================

function FollowUpTaskModal({
  isOpen,
  onClose,
  onCreateFollowUp,
  linkedItem,
  linkedContact,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateFollowUp: () => void;
  linkedItem?: LinkedEntity | null;
  linkedContact?: LinkedEntity | null;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onClose(); 
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const entityName = linkedItem?.name || linkedContact?.name || 'this item';
  const entityType = linkedItem?.type || linkedContact?.type || 'item';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Task Completed!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Great work!</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Would you like to schedule a follow-up task for{' '}
            <span className="font-medium text-slate-900 dark:text-white">{entityName}</span>?
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Keeping track of your {entityType}s with regular follow-ups helps close more deals.
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Not now
          </Button>
          <Button size="sm" onClick={onCreateFollowUp}>
            <Plus className="w-4 h-4 mr-1" />
            Create Follow-up
          </Button>
        </div>
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
  const { tasks, updateTask, deleteTask, completeTask, reopenTask } = useTaskStore();
  const { getActiveTaskTypes, taskTypes } = useTaskTypesStore();
  const toast = useToast();
  const { openAddTask } = useFormStack();
  
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
  
  // Panel state (for editing existing tasks only)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Quick View Modal state (for list and calendar view)
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);
  
  // Follow-up Modal state (appears after marking done)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [completedTask, setCompletedTask] = useState<Task | null>(null);

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
      lead: `/sales/leads/${id}`,
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
    // 3. Lead/Deal/Project (linked item - clickable)
    { 
      key: 'linkedItem', 
      header: 'Lead / Deal / Project', 
      sortable: true,
      width: 180,
      minWidth: 120,
      render: (task) => {
        const entity = task.linkedItem;
        if (!entity) return <span className="text-slate-400">—</span>;
        // Use appropriate icon for leads/deals
        const Icon = entity.type === 'lead' ? Target 
          : entity.type === 'deal' ? TrendingUp 
          : ENTITY_ICONS[entity.type] || FileText;
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
      setIsPanelOpen(false); 
      setSelectedTask(null);
    }
  };

  const handleDelete = async (taskId: string) => { 
    await deleteTask(taskId); 
    toast.success('Task Deleted', 'The task has been removed');
    setQuickViewTask(null);
  };
  
  // Open quick view modal (for list clicks)
  const openQuickView = (task: Task) => {
    setQuickViewTask(task);
  };
  
  // Open edit panel (from quick view)
  const openEditPanel = (task: Task) => { 
    setSelectedTask(task); 
    setIsPanelOpen(true); 
    setQuickViewTask(null);
  };
  
  const openNewPanel = () => { 
    openAddTask({});
  };
  
  // Open new panel with pre-filled linked item (for follow-up)
  const openFollowUpPanel = () => {
    if (completedTask) {
      // Pass the linked item/contact from completed task to new task
      openAddTask({
        defaultContactId: completedTask.linkedContact?.id,
        defaultContactName: completedTask.linkedContact?.name,
        defaultLinkedItemType: completedTask.linkedItem?.type === 'lead' || completedTask.linkedItem?.type === 'deal' 
          ? completedTask.linkedItem.type 
          : undefined,
        defaultLinkedItemId: completedTask.linkedItem?.id,
        defaultLinkedItemName: completedTask.linkedItem?.name,
      });
    }
    setShowFollowUpModal(false);
  };
  
  const handleCalendarTaskClick = (task: Task, event: React.MouseEvent) => { 
    event.stopPropagation();
    // Use the same quick view modal as list view
    setQuickViewTask(task);
  };
  
  // Mark task as done (from quick view modal - used by both list and calendar)
  const handleQuickViewMarkDone = async () => {
    if (quickViewTask) {
      await updateTask(quickViewTask.id, { status: 'completed' } as Partial<TaskInput>);
      toast.success('Task Completed', 'Task has been marked as done');
      
      // Check if task is linked to lead/deal and show follow-up modal
      if (quickViewTask.linkedItem?.type === 'lead' || quickViewTask.linkedItem?.type === 'deal') {
        setCompletedTask(quickViewTask);
        setShowFollowUpModal(true);
      }
      setQuickViewTask(null);
    }
  };
  
  // Delete task from quick view
  const handleQuickViewDelete = async () => {
    if (quickViewTask) {
      await deleteTask(quickViewTask.id);
      toast.success('Task Deleted', 'The task has been removed');
      setQuickViewTask(null);
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
            onRowClick={(task) => openQuickView(task)}
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

      {/* Task Detail Panel (for editing existing tasks) */}
      <TaskDetailPanel 
        task={selectedTask} 
        isOpen={isPanelOpen && selectedTask !== null} 
        onClose={() => { setIsPanelOpen(false); setSelectedTask(null); }} 
        onSave={handleSave} 
        onDelete={handleDelete}
      />
      
      {/* Quick View Modal (List & Calendar View) */}
      <TaskQuickView
        task={quickViewTask}
        isOpen={!!quickViewTask}
        onClose={() => setQuickViewTask(null)}
        onEdit={() => quickViewTask && openEditPanel(quickViewTask)}
        onMarkDone={handleQuickViewMarkDone}
        onDelete={handleQuickViewDelete}
      />
      
      {/* Follow-Up Task Modal */}
      <FollowUpTaskModal
        isOpen={showFollowUpModal}
        onClose={() => { setShowFollowUpModal(false); setCompletedTask(null); }}
        onCreateFollowUp={openFollowUpPanel}
        linkedItem={completedTask?.linkedItem}
        linkedContact={completedTask?.linkedContact}
      />
      
      {/* Animation Styles */}
      <style>{`
        @keyframes slide-in-right { 
          from { transform: translateX(100%); } 
          to { transform: translateX(0); } 
        }
        .animate-slide-in-right { 
          animation: slide-in-right 0.2s ease-out; 
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </Page>
  );
}

export default TasksPage;