// ============================================================================
// EditTaskForm Component
// Location: src/components/panels/add-forms/EditTaskForm.tsx
// 
// Side panel for editing existing tasks with calendar sidebar.
// Uses SlidePanel for the slide-out behavior.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Clock, Building2, User, Target, TrendingUp, X, Check, Trash2,
  ExternalLink
} from 'lucide-react';
import {
  Input,
  Textarea,
  SelectFilter,
  DatePicker,
  TimePicker,
  EntitySearchDropdown,
  TaskTypeIcon,
  UnsavedChangesModal,
  Button,
  type EntitySearchItem,
} from '@/components/common';
import { SlidePanel } from '@/components/layout';
import { DayScheduleSidebar } from '@/components/panels/DayScheduleSidebar';
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
  type TaskInput,
  type LinkedEntity,
  type LinkedEntityType,
} from '@/contexts';
import { type TaskTypeConfig } from '@/contexts/taskTypesStore';

// ============================================================================
// Types
// ============================================================================

export interface EditTaskFormProps {
  /** The task to edit */
  task: Task;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when task is updated */
  onUpdated?: (task: Task) => void;
  /** Called when task is deleted */
  onDeleted?: (taskId: string) => void;
  /** Stack level for z-index (default: 0) */
  stackLevel?: number;
  /** Callback to open AddCompanyForm */
  onAddCompany?: (searchTerm: string, callback: (company: { id: string; name: string }) => void) => void;
  /** Callback to open AddContactForm */
  onAddContact?: (searchTerm: string, companyId: string, companyName: string, callback: (contact: { id: string; name: string }) => void) => void;
}

// Priority options
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

// ============================================================================
// Task Type Button Group
// ============================================================================

interface TaskTypeButtonGroupProps {
  value: TaskType | undefined;
  onChange: (value: TaskType | undefined) => void;
  taskTypes: TaskTypeConfig[];
}

function TaskTypeButtonGroup({ value, onChange, taskTypes }: TaskTypeButtonGroupProps) {
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

// ============================================================================
// Priority Button Group
// ============================================================================

interface PriorityButtonGroupProps {
  value: TaskPriority | undefined;
  onChange: (value: TaskPriority | undefined) => void;
}

function PriorityButtonGroup({ value, onChange }: PriorityButtonGroupProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PRIORITIES.map(p => (
        <button 
          key={p.value} 
          type="button" 
          onClick={() => onChange(value === p.value ? undefined : p.value)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            value === p.value 
              ? `${p.color} ring-2 ring-offset-1 ring-current` 
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Clickable Entity Link
// ============================================================================

interface EntityLinkProps {
  entity: LinkedEntity | null;
  onClear: () => void;
  icon: React.ElementType;
}

function EntityLink({ entity, onClear, icon: Icon }: EntityLinkProps) {
  const navigate = useNavigate();
  
  if (!entity) return null;
  
  const getEntityUrl = (type: LinkedEntityType, id: string) => {
    const routes: Record<LinkedEntityType, string> = {
      contact: `/clients/contacts/${id}`,
      company: `/clients/companies/${id}`,
      project: `/projects/${id}`,
      estimate: `/estimates/${id}`,
      invoice: `/accounting/invoices/${id}`,
      deal: `/sales/deals/${id}`,
      lead: `/sales/leads/${id}`,
    };
    return routes[type] || '/';
  };
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <button
        type="button"
        onClick={() => navigate(getEntityUrl(entity.type, entity.id))}
        className="flex-1 text-left text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
      >
        <span className="truncate">{entity.name}</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
      <span className="text-xs text-slate-400 capitalize flex-shrink-0">{entity.type}</span>
      <button 
        type="button" 
        onClick={onClear}
        className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EditTaskForm({
  task,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  onAddCompany,
  onAddContact,
}: EditTaskFormProps) {
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { leads, deals } = useSalesStore();
  const { tasks: allTasks, updateTask, deleteTask, completeTask, reopenTask } = useTaskStore();
  const { getActiveTaskTypes } = useTaskTypesStore();
  const toast = useToast();

  // Form state
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
    dueTime: '',
  });
  const [initialData, setInitialData] = useState<TaskInput | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Separate company selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [linkedCompany, setLinkedCompany] = useState<LinkedEntity | null>(null);

  const taskTypes = useMemo(() => getActiveTaskTypes(), [getActiveTaskTypes]);

  // Initialize form data when task changes
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
        notes: task.notes || '',
      };
      setFormData(data);
      setInitialData(data);

      // Set company state
      if (task.linkedContact?.type === 'company') {
        setLinkedCompany(task.linkedContact);
        setSelectedCompanyId(task.linkedContact.id);
      } else if (task.linkedContact?.type === 'contact') {
        const contact = contacts.find(c => c.id === task.linkedContact?.id);
        if (contact?.companyId) {
          const company = companies.find(c => c.id === contact.companyId);
          if (company) {
            setLinkedCompany({ type: 'company', id: company.id, name: company.name });
            setSelectedCompanyId(company.id);
          }
        }
      }
    }
  }, [isOpen, task, contacts, companies]);

  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // User options
  const userOptions = useMemo(() =>
    users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  // Company items
  const companyItems: EntitySearchItem[] = useMemo(() =>
    companies.map(c => ({ id: c.id, name: c.name })),
    [companies]
  );

  // Contact items (filtered by company)
  const contactItems: EntitySearchItem[] = useMemo(() => {
    let filtered = contacts;
    if (selectedCompanyId) {
      filtered = contacts.filter(c => c.companyId === selectedCompanyId);
    }
    return filtered.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim() || 'Unnamed',
      subtitle: !selectedCompanyId ? companies.find(comp => comp.id === c.companyId)?.name : undefined,
      metadata: { companyId: c.companyId }
    }));
  }, [contacts, companies, selectedCompanyId]);

  // Lead/Deal items (filtered by company/contact)
  const linkedItemOptions = useMemo(() => {
    const items: EntitySearchItem[] = [];

    // Add leads
    leads.forEach(lead => {
      if (lead.convertedToDealId) return;
      if (selectedCompanyId && lead.companyId !== selectedCompanyId) return;
      items.push({
        id: lead.id,
        name: lead.name,
        subtitle: `Lead${lead.companyName ? ` • ${lead.companyName}` : ''}`,
        metadata: { type: 'lead' }
      });
    });

    // Add deals
    deals.filter(d => !d.deletedAt && d.status === 'active').forEach(deal => {
      if (selectedCompanyId && deal.companyId !== selectedCompanyId) return;
      items.push({
        id: deal.id,
        name: deal.name,
        subtitle: `Deal${deal.companyName ? ` • ${deal.companyName}` : ''}`,
        metadata: { type: 'deal' }
      });
    });

    return items;
  }, [leads, deals, selectedCompanyId]);

  // Handlers
  const handleCompanyChange = useCallback((item: EntitySearchItem | null) => {
    if (item) {
      setLinkedCompany({ type: 'company', id: item.id, name: item.name });
      setSelectedCompanyId(item.id);
    } else {
      setLinkedCompany(null);
      setSelectedCompanyId(null);
      setFormData(prev => ({ ...prev, linkedContact: null, linkedItem: null }));
    }
  }, []);

  const handleContactChange = useCallback((item: EntitySearchItem | null) => {
    if (item) {
      setFormData(prev => ({
        ...prev,
        linkedContact: { type: 'contact', id: item.id, name: item.name }
      }));
      // Auto-set company
      const contact = contacts.find(c => c.id === item.id);
      if (contact?.companyId && !selectedCompanyId) {
        const company = companies.find(c => c.id === contact.companyId);
        if (company) {
          setLinkedCompany({ type: 'company', id: company.id, name: company.name });
          setSelectedCompanyId(company.id);
        }
      }
    } else {
      setFormData(prev => ({ ...prev, linkedContact: null }));
    }
  }, [contacts, companies, selectedCompanyId]);

  const handleLinkedItemChange = useCallback((item: EntitySearchItem | null) => {
    if (item) {
      const itemType = item.metadata?.type as LinkedEntityType;
      setFormData(prev => ({
        ...prev,
        linkedItem: { type: itemType, id: item.id, name: item.name }
      }));
    } else {
      setFormData(prev => ({ ...prev, linkedItem: null }));
    }
  }, []);

  const handleAddCompany = useCallback((searchTerm: string) => {
    if (onAddCompany) {
      onAddCompany(searchTerm, (company) => {
        setLinkedCompany({ type: 'company', id: company.id, name: company.name });
        setSelectedCompanyId(company.id);
      });
    }
  }, [onAddCompany]);

  const handleAddContact = useCallback((searchTerm: string) => {
    if (onAddContact && selectedCompanyId && linkedCompany) {
      onAddContact(searchTerm, selectedCompanyId, linkedCompany.name, (contact) => {
        setFormData(prev => ({
          ...prev,
          linkedContact: { type: 'contact', id: contact.id, name: contact.name }
        }));
      });
    }
  }, [onAddContact, selectedCompanyId, linkedCompany]);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      toast.error('Required', 'Task title is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateTask(task.id, formData);
      toast.success('Task Updated', 'Your changes have been saved');
      setInitialData(formData);
      onUpdated?.(task);
      onClose();
    } catch (err) {
      toast.error('Error', 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  }, [formData, task, updateTask, toast, onUpdated, onClose]);

  const handleMarkDone = useCallback(async () => {
    try {
      if (task.status === 'completed') {
        await reopenTask(task.id);
        toast.success('Task Reopened', 'Task has been reopened');
      } else {
        await completeTask(task.id);
        toast.success('Task Completed', 'Task has been marked as done');
      }
      onClose();
    } catch (err) {
      toast.error('Error', 'Failed to update task status');
    }
  }, [task, completeTask, reopenTask, toast, onClose]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(task.id);
      toast.success('Task Deleted', 'Task has been removed');
      onDeleted?.(task.id);
      onClose();
    } catch (err) {
      toast.error('Error', 'Failed to delete task');
    }
  }, [task, deleteTask, toast, onDeleted, onClose]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  const handleDiscard = useCallback(() => {
    setShowDiscardModal(false);
    onClose();
  }, [onClose]);

  // Current task type for icon
  const currentTaskType = taskTypes.find(t => t.value === formData.type);

  if (!isOpen) return null;

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={handleClose}
        title={formData.title || 'Untitled Task'}
        subtitle={task.status === 'completed' ? 'Completed' : undefined}
        icon={currentTaskType ? (
          <TaskTypeIcon icon={currentTaskType.icon} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
        size="xl"
        resizable
        initialWidth={900}
        minWidth={700}
        maxWidth={1200}
        scrollable
        footer={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={task.status === 'completed' ? 'secondary' : 'primary'}
                onClick={handleMarkDone}
              >
                <Check className="w-4 h-4 mr-1.5" />
                {task.status === 'completed' ? 'Reopen' : 'Mark Done'}
              </Button>
              <Button variant="ghost" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
        sidebar={
          <DayScheduleSidebar
            date={formData.dueDate || ''}
            tasks={allTasks}
            onDateChange={(newDate) => setFormData(d => ({ ...d, dueDate: newDate }))}
          />
        }
        sidebarWidth={280}
      >
        <div className="space-y-5">
          {/* Task Title */}
          <Input
            value={formData.title}
            onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
            placeholder="Task title..."
            className="text-lg font-medium [&_input]:py-3"
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

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <PriorityButtonGroup
              value={formData.priority}
              onChange={v => setFormData(d => ({ ...d, priority: v }))}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Due Date, Time, Assigned To */}
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
                className="w-full"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Company & Contact */}
          <div className="grid grid-cols-2 gap-4">
            {linkedCompany ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Company
                </label>
                <EntityLink
                  entity={linkedCompany}
                  onClear={() => handleCompanyChange(null)}
                  icon={Building2}
                />
              </div>
            ) : (
              <EntitySearchDropdown
                label="Company"
                value={null}
                onChange={handleCompanyChange}
                items={companyItems}
                placeholder="Search companies..."
                icon={Building2}
                allowCreate={!!onAddCompany}
                onCreateNew={handleAddCompany}
                createLabel="Add new company"
              />
            )}

            {formData.linkedContact ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact
                </label>
                <EntityLink
                  entity={formData.linkedContact}
                  onClear={() => handleContactChange(null)}
                  icon={User}
                />
              </div>
            ) : (
              <EntitySearchDropdown
                label="Contact"
                value={null}
                onChange={handleContactChange}
                items={contactItems}
                placeholder={selectedCompanyId ? "Search contacts..." : "Select company first..."}
                icon={User}
                labelSuffix={selectedCompanyId ? "(filtered)" : undefined}
                allowCreate={!!onAddContact && !!selectedCompanyId}
                onCreateNew={handleAddContact}
                createLabel="Add new contact"
              />
            )}
          </div>

          {/* Linked Lead/Deal */}
          <div>
            {formData.linkedItem ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Linked {formData.linkedItem.type === 'lead' ? 'Lead' : 'Deal'}
                </label>
                <EntityLink
                  entity={formData.linkedItem}
                  onClear={() => handleLinkedItemChange(null)}
                  icon={formData.linkedItem.type === 'lead' ? Target : TrendingUp}
                />
              </div>
            ) : (
              <EntitySearchDropdown
                label="Link to Lead or Deal"
                value={null}
                onChange={handleLinkedItemChange}
                items={linkedItemOptions}
                placeholder="Search leads or deals..."
                icon={Target}
                emptyMessage={selectedCompanyId ? "No leads or deals found" : "Select a company to filter"}
              />
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Description */}
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
            placeholder="Add description..."
            rows={3}
          />

          {/* Notes */}
          <Textarea
            label="Notes"
            value={formData.notes || ''}
            onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
            placeholder="Add notes..."
            rows={2}
          />

          {/* Created info */}
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            Created: {new Date(task.createdAt).toLocaleString()}
            {task.createdByName && ` by ${task.createdByName}`}
          </div>
        </div>
      </SlidePanel>

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

export default EditTaskForm;