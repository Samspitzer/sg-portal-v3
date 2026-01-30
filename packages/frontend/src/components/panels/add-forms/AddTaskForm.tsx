// ============================================================================
// AddTaskForm Component
// Location: src/components/panels/add-forms/AddTaskForm.tsx
// 
// Standalone form for creating tasks.
// Can be used in ModalPanel for overlay creation or anywhere in the app.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Building2, User, Target, TrendingUp, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import {
  Input,
  Textarea,
  SelectFilter,
  DatePicker,
  TimePicker,
  EntitySearchDropdown,
  TaskTypeIcon,
  type EntitySearchItem,
} from '@/components/common';
import { ModalPanel, ModalPanelFooter } from './ModalPanel';
import {
  useTaskStore,
  useTaskTypesStore,
  useUsersStore,
  useClientsStore,
  useSalesStore,
  useToast,
  type Task,
  type TaskType,
  type TaskPriority,
  type LinkedEntity,
  type LinkedEntityType,
} from '@/contexts';

// ============================================================================
// Types
// ============================================================================

export interface AddTaskFormData {
  title: string;
  type: TaskType | undefined;
  priority: TaskPriority | undefined;
  dueDate: string;
  dueTime: string;
  assignedUserId: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  linkedItemType: LinkedEntityType | '';
  linkedItemId: string;
  linkedItemName: string;
  notes: string;
}

const initialFormData: AddTaskFormData = {
  title: '',
  type: undefined,
  priority: undefined,
  dueDate: '',
  dueTime: '',
  assignedUserId: '',
  companyId: '',
  companyName: '',
  contactId: '',
  contactName: '',
  linkedItemType: '',
  linkedItemId: '',
  linkedItemName: '',
  notes: '',
};

// Priority options
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

export interface AddTaskFormProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when task is created successfully */
  onCreated?: (task: Task) => void;
  /** Pre-fill company */
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  /** Pre-fill contact */
  defaultContactId?: string;
  defaultContactName?: string;
  /** Pre-fill linked item (lead/deal) */
  defaultLinkedItemType?: LinkedEntityType;
  defaultLinkedItemId?: string;
  defaultLinkedItemName?: string;
  /** Pre-fill due date */
  defaultDueDate?: string;
  /** Stack level for z-index (default: 0) */
  stackLevel?: number;
  /** Callback to open AddCompanyForm */
  onAddCompany?: (searchTerm: string, callback: (company: { id: string; name: string }) => void) => void;
  /** Callback to open AddContactForm */
  onAddContact?: (searchTerm: string, companyId: string, companyName: string, callback: (contact: { id: string; name: string }) => void) => void;
  /** Callback to open AddLeadForm */
  onAddLead?: (searchTerm: string, companyId: string, companyName: string, contactId: string | undefined, contactName: string | undefined, callback: (lead: { id: string; name: string }) => void) => void;
  /** Callback to open AddDealForm */
  onAddDeal?: (searchTerm: string, companyId: string, companyName: string, contactId: string | undefined, contactName: string | undefined, callback: (deal: { id: string; name: string }) => void) => void;
}

import { type TaskTypeIconName } from '@/contexts/taskTypesStore';

// ============================================================================
// Task Type Button Group (inline component)
// ============================================================================

interface TaskTypeButtonGroupProps {
  value: TaskType | undefined;
  onChange: (value: TaskType | undefined) => void;
  taskTypes: { value: string; label: string; icon: TaskTypeIconName }[];
}

function TaskTypeButtonGroup({ value, onChange, taskTypes }: TaskTypeButtonGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {taskTypes.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(value === t.value ? undefined : t.value as TaskType)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            value === t.value
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          )}
        >
          <TaskTypeIcon icon={t.icon} className="w-4 h-4" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Linked Item Search Item Type
// ============================================================================

interface LinkedSearchItem {
  type: LinkedEntityType;
  id: string;
  name: string;
  subtitle?: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AddTaskForm({
  isOpen,
  onClose,
  onCreated,
  defaultCompanyId,
  defaultCompanyName,
  defaultContactId,
  defaultContactName,
  defaultLinkedItemType,
  defaultLinkedItemId,
  defaultLinkedItemName,
  defaultDueDate,
  stackLevel = 0,
  onAddCompany,
  onAddContact,
  onAddLead,
  onAddDeal,
}: AddTaskFormProps) {
  const { createTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { leads, deals } = useSalesStore();
  const toast = useToast();

  const [formData, setFormData] = useState<AddTaskFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedItemSearch, setLinkedItemSearch] = useState('');
  const [linkedItemDropdownOpen, setLinkedItemDropdownOpen] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultOwner = users.find(u => u.isActive) || users[0];
      setFormData({
        ...initialFormData,
        companyId: defaultCompanyId || '',
        companyName: defaultCompanyName || '',
        contactId: defaultContactId || '',
        contactName: defaultContactName || '',
        linkedItemType: defaultLinkedItemType || '',
        linkedItemId: defaultLinkedItemId || '',
        linkedItemName: defaultLinkedItemName || '',
        dueDate: defaultDueDate || '',
        assignedUserId: defaultOwner?.id || '',
      });
      setLinkedItemSearch('');
      setLinkedItemDropdownOpen(false);
    }
  }, [isOpen, defaultCompanyId, defaultCompanyName, defaultContactId, defaultContactName, defaultLinkedItemType, defaultLinkedItemId, defaultLinkedItemName, defaultDueDate, users]);

  // Update field helper
  const updateField = useCallback(<K extends keyof AddTaskFormData>(field: K, value: AddTaskFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Task type options for the button group
  const taskTypeOptions = useMemo(() =>
    taskTypes.map(t => ({ value: t.value, label: t.label, icon: t.icon })),
    [taskTypes]
  );

  // User options for dropdown
  const userOptions = useMemo(() =>
    users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  // Company items for dropdown
  const companyItems: EntitySearchItem[] = useMemo(() =>
    companies.map(c => ({ id: c.id, name: c.name })),
    [companies]
  );

  // Contact items filtered by company
  const contactItems: EntitySearchItem[] = useMemo(() => {
    let contactList = contacts;
    if (formData.companyId) {
      contactList = contacts.filter(c => c.companyId === formData.companyId);
    }
    return contactList.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: !formData.companyId ? companies.find(comp => comp.id === c.companyId)?.name : undefined,
      metadata: { companyId: c.companyId },
    }));
  }, [contacts, companies, formData.companyId]);

  // Linked items (leads/deals) filtered by company/contact
  const linkedItems: LinkedSearchItem[] = useMemo(() => {
    const items: LinkedSearchItem[] = [];

    // Add leads
    leads.forEach(lead => {
      if (lead.convertedToDealId) return;
      if (formData.companyId && lead.companyId !== formData.companyId) return;
      if (formData.contactId && lead.contactId !== formData.contactId) return;

      const contact = lead.contactId ? contacts.find(c => c.id === lead.contactId) : null;
      items.push({
        type: 'lead',
        id: lead.id,
        name: lead.name,
        subtitle: lead.companyName || 'Lead',
        companyId: lead.companyId,
        companyName: lead.companyName,
        contactId: lead.contactId,
        contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined,
      });
    });

    // Add deals
    deals.filter(d => !d.deletedAt && d.status === 'active').forEach(deal => {
      if (formData.companyId && deal.companyId !== formData.companyId) return;
      if (formData.contactId && deal.contactId !== formData.contactId) return;

      const contact = deal.contactId ? contacts.find(c => c.id === deal.contactId) : null;
      items.push({
        type: 'deal',
        id: deal.id,
        name: deal.name,
        subtitle: deal.companyName || 'Deal',
        companyId: deal.companyId,
        companyName: deal.companyName,
        contactId: deal.contactId,
        contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined,
      });
    });

    return items;
  }, [leads, deals, contacts, formData.companyId, formData.contactId]);

  // Filtered linked items based on search
  const filteredLinkedItems = useMemo(() => {
    if (!linkedItemSearch.trim()) return linkedItems.slice(0, 10);
    return linkedItems
      .filter(item => item.name.toLowerCase().includes(linkedItemSearch.toLowerCase()))
      .slice(0, 10);
  }, [linkedItems, linkedItemSearch]);

  // Handle company change
  const handleCompanyChange = (item: EntitySearchItem | null) => {
    if (item) {
      setFormData(prev => ({
        ...prev,
        companyId: item.id,
        companyName: item.name,
        contactId: '',
        contactName: '',
        linkedItemType: '',
        linkedItemId: '',
        linkedItemName: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        companyId: '',
        companyName: '',
        contactId: '',
        contactName: '',
        linkedItemType: '',
        linkedItemId: '',
        linkedItemName: '',
      }));
    }
  };

  // Handle contact change
  const handleContactChange = (item: EntitySearchItem | null) => {
    if (item) {
      setFormData(prev => ({
        ...prev,
        contactId: item.id,
        contactName: item.name,
      }));
      // Auto-select company if not set
      if (!formData.companyId && item.metadata?.companyId) {
        const company = companies.find(c => c.id === item.metadata?.companyId);
        if (company) {
          setFormData(prev => ({
            ...prev,
            companyId: company.id,
            companyName: company.name,
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        contactId: '',
        contactName: '',
      }));
    }
  };

  // Handle linked item selection
  const handleLinkedItemSelect = (item: LinkedSearchItem) => {
    setFormData(prev => ({
      ...prev,
      linkedItemType: item.type,
      linkedItemId: item.id,
      linkedItemName: item.name,
    }));
    setLinkedItemSearch('');
    setLinkedItemDropdownOpen(false);

    // Auto-fill company and contact if not set
    if (!formData.companyId && item.companyId && item.companyName) {
      setFormData(prev => ({
        ...prev,
        companyId: item.companyId!,
        companyName: item.companyName!,
      }));
    }
    if (!formData.contactId && item.contactId && item.contactName) {
      setFormData(prev => ({
        ...prev,
        contactId: item.contactId!,
        contactName: item.contactName!,
      }));
    }
  };

  // Handle add new company
  const handleAddCompany = (searchTerm: string) => {
    if (onAddCompany) {
      onAddCompany(searchTerm, (company) => {
        setFormData(prev => ({
          ...prev,
          companyId: company.id,
          companyName: company.name,
        }));
      });
    }
  };

  // Handle add new contact
  const handleAddContact = (searchTerm: string) => {
    if (onAddContact && formData.companyId) {
      onAddContact(searchTerm, formData.companyId, formData.companyName, (contact) => {
        setFormData(prev => ({
          ...prev,
          contactId: contact.id,
          contactName: contact.name,
        }));
      });
    }
  };

  // Handle add new lead
  const handleAddLead = () => {
    if (onAddLead && formData.companyId) {
      onAddLead(
        linkedItemSearch,
        formData.companyId,
        formData.companyName,
        formData.contactId || undefined,
        formData.contactName || undefined,
        (lead) => {
          setFormData(prev => ({
            ...prev,
            linkedItemType: 'lead',
            linkedItemId: lead.id,
            linkedItemName: lead.name,
          }));
          setLinkedItemSearch('');
          setLinkedItemDropdownOpen(false);
        }
      );
    }
  };

  // Handle add new deal
  const handleAddDeal = () => {
    if (onAddDeal && formData.companyId) {
      onAddDeal(
        linkedItemSearch,
        formData.companyId,
        formData.companyName,
        formData.contactId || undefined,
        formData.contactName || undefined,
        (deal) => {
          setFormData(prev => ({
            ...prev,
            linkedItemType: 'deal',
            linkedItemId: deal.id,
            linkedItemName: deal.name,
          }));
          setLinkedItemSearch('');
          setLinkedItemDropdownOpen(false);
        }
      );
    }
  };

  // Clear linked item
  const clearLinkedItem = () => {
    setFormData(prev => ({
      ...prev,
      linkedItemType: '',
      linkedItemId: '',
      linkedItemName: '',
    }));
  };

  // Get icon for entity type
  const getEntityIcon = (type: LinkedEntityType) => {
    switch (type) {
      case 'lead': return Target;
      case 'deal': return TrendingUp;
      default: return FileText;
    }
  };

  // Validate form
  const isValid = formData.title.trim() && formData.assignedUserId;

  // Handle save
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Required', 'Task title is required');
      return;
    }
    if (!formData.assignedUserId) {
      toast.error('Required', 'Please assign the task to someone');
      return;
    }

    setIsSaving(true);
    try {
      // Build linkedContact (company or contact)
      let linkedContact: LinkedEntity | null = null;
      if (formData.contactId) {
        linkedContact = { type: 'contact', id: formData.contactId, name: formData.contactName };
      } else if (formData.companyId) {
        linkedContact = { type: 'company', id: formData.companyId, name: formData.companyName };
      }

      // Build linkedItem (lead or deal)
      let linkedItem: LinkedEntity | null = null;
      if (formData.linkedItemType && formData.linkedItemId) {
        linkedItem = { 
          type: formData.linkedItemType as LinkedEntityType, 
          id: formData.linkedItemId, 
          name: formData.linkedItemName 
        };
      }

      const newTask = await createTask({
        title: formData.title.trim(),
        type: formData.type,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined,
        assignedUserId: formData.assignedUserId,
        linkedContact,
        linkedItem,
        notes: formData.notes || undefined,
      });

      toast.success('Task Created', `"${newTask.title}" has been added`);
      onCreated?.(newTask);
      onClose();
    } catch (error) {
      toast.error('Error', 'Failed to create task');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if we can create new leads/deals
  const canCreateLeadDeal = !!formData.companyId && linkedItemSearch.trim().length > 0;

  return (
    <ModalPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Task"
      icon={<Clock className="w-5 h-5" />}
      width={650}
      stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose}
          onSave={handleSave}
          saveText="Create Task"
          saveDisabled={!isValid}
          saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {/* Task Title */}
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="What needs to be done?"
          required
          autoFocus
        />

        {/* Activity Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Activity Type
          </label>
          <TaskTypeButtonGroup
            value={formData.type}
            onChange={(v) => updateField('type', v)}
            taskTypes={taskTypeOptions}
          />
        </div>

        {/* Due Date, Time, Assigned To Row */}
        <div className="grid grid-cols-3 gap-3">
          <DatePicker
            label="Due Date"
            value={formData.dueDate}
            onChange={(v) => updateField('dueDate', v)}
          />
          <TimePicker
            label="Due Time"
            value={formData.dueTime}
            onChange={(v) => updateField('dueTime', v)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned To <span className="text-red-500">*</span>
            </label>
            <SelectFilter
              label="Select user"
              value={formData.assignedUserId}
              onChange={(value) => updateField('assignedUserId', value)}
              options={userOptions}
              showAllOption={false}
              icon={User}
              className="w-full"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Priority
          </label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateField('priority', formData.priority === p.value ? undefined : p.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  formData.priority === p.value
                    ? `${p.color} ring-1 ring-current`
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700" />

        {/* Company and Contact Row */}
        <div className="grid grid-cols-2 gap-3">
          <EntitySearchDropdown
            label="Company"
            value={formData.companyId ? { id: formData.companyId, name: formData.companyName } : null}
            onChange={handleCompanyChange}
            items={companyItems}
            placeholder="Search companies..."
            icon={Building2}
            allowCreate={!!onAddCompany}
            onCreateNew={handleAddCompany}
            createLabel="Add new company"
          />

          <EntitySearchDropdown
            label="Contact"
            value={formData.contactId ? { id: formData.contactId, name: formData.contactName } : null}
            onChange={handleContactChange}
            items={contactItems}
            placeholder="Search contacts..."
            icon={User}
            labelSuffix={formData.companyId ? "(filtered)" : undefined}
            allowCreate={!!onAddContact && !!formData.companyId}
            onCreateNew={handleAddContact}
            createLabel="Add new contact"
          />
        </div>

        {/* Link to Lead/Deal */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Link to Lead or Deal
            {(formData.companyId || formData.contactId) && (
              <span className="ml-1 text-xs font-normal text-slate-400">(filtered)</span>
            )}
          </label>

          {formData.linkedItemId ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              {(() => {
                const Icon = getEntityIcon(formData.linkedItemType as LinkedEntityType);
                return <Icon className="w-4 h-4 text-slate-400" />;
              })()}
              <span className="flex-1 text-sm text-slate-900 dark:text-white">{formData.linkedItemName}</span>
              <span className="text-xs text-slate-400 capitalize">{formData.linkedItemType}</span>
              <button
                type="button"
                onClick={clearLinkedItem}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <span className="sr-only">Remove</span>
                ×
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={linkedItemSearch}
                onChange={(e) => {
                  setLinkedItemSearch(e.target.value);
                  setLinkedItemDropdownOpen(true);
                }}
                onFocus={() => setLinkedItemDropdownOpen(true)}
                placeholder="Search leads, deals..."
                leftIcon={<Target className="w-4 h-4" />}
              />

              {linkedItemDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Create new options */}
                  {canCreateLeadDeal && (
                    <div className="border-b border-slate-200 dark:border-slate-700">
                      {onAddLead && (
                        <button
                          type="button"
                          onClick={handleAddLead}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        >
                          <Target className="w-4 h-4" />
                          <span className="text-sm">Add "{linkedItemSearch}" as new Lead</span>
                        </button>
                      )}
                      {onAddDeal && (
                        <button
                          type="button"
                          onClick={handleAddDeal}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm">Add "{linkedItemSearch}" as new Deal</span>
                        </button>
                      )}
                    </div>
                  )}

                  {filteredLinkedItems.length > 0 ? (
                    filteredLinkedItems.map((item) => {
                      const Icon = getEntityIcon(item.type);
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() => handleLinkedItemSelect(item)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
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
                      {linkedItems.length === 0
                        ? (formData.companyId || formData.contactId
                          ? 'No leads or deals for this selection'
                          : 'No leads or deals available')
                        : 'No matching items found'}
                      {!formData.companyId && (
                        <p className="mt-1 text-slate-500">Select a company to create new leads/deals</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Add any notes about this task..."
          rows={3}
        />
      </div>
    </ModalPanel>
  );
}

export default AddTaskForm;