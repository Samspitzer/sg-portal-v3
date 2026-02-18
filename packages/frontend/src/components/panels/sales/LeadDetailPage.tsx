// ============================================================================
// LeadDetailPage - Lead Detail View
// Location: src/components/panels/sales/LeadDetailPage.tsx
// 
// Matches ContactDetailPage design pattern with:
// - 3-column grid (2 left, 1 right)
// - Section headers with icons
// - CollapsibleSection for expandable areas
// - InlineEditField/InlineSelectField for editing
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Target,
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Check,
  TrendingUp,
  ArrowRightLeft,
  FileText,
  Info,
  Tag,
  Megaphone,
  DollarSign,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  ConfirmModal,
  SectionHeader,
  InlineEditField,
  InlineSelectField,
  CollapsibleSection,
  EntityTasksSection,
  QuickViewModal,
  AddressInput,
  Textarea,
  type QuickViewField,
  TaskTypeIcon,
} from '@/components/common';
import { useFormStack } from '@/components/panels/add-forms';
import {
  useSalesStore,
  useFieldsStore,
  useUsersStore,
  useClientsStore,
  useToast,
} from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useTaskTypesStore, type TaskTypeConfig } from '@/contexts/taskTypesStore';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

const TASK_PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

// ============================================================================
// Task Quick View Component
// ============================================================================

function TaskQuickViewComponent({
  task,
  isOpen,
  taskTypes,
  users,
  onClose,
  onEdit,
  onMarkDone,
  onDelete,
}: {
  task: Task | null;
  isOpen: boolean;
  taskTypes: TaskTypeConfig[];
  users: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  if (!task) return null;

  const taskType = taskTypes.find(t => t.value === task.type);
  const assignedUser = users.find(u => u.id === task.assignedUserId);
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority);

  const badges: { label: string; className?: string }[] = [
    {
      label: task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending',
      className: task.status === 'completed'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : task.status === 'in_progress'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    },
  ];

  if (priority) {
    badges.push({ label: priority.label, className: priority.color });
  }

  const fields: QuickViewField[] = [];

  if (taskType) {
    fields.push({
      label: 'Type',
      value: (
        <span className="flex items-center gap-1.5">
          <TaskTypeIcon icon={taskType.icon} className="w-4 h-4" />
          {taskType.label}
        </span>
      ),
    });
  }

  if (assignedUser) {
    fields.push({
      label: 'Assigned To',
      value: assignedUser.name,
      icon: <User className="w-4 h-4 text-slate-400" />,
    });
  }

  if (task.description) {
    fields.push({ label: 'Description', value: task.description });
  }

  return (
    <QuickViewModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={
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
      }
      icon={
        taskType ? (
          <TaskTypeIcon icon={taskType.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        )
      }
      badges={badges}
      fields={fields}
      notes={task.notes}
      footerMeta={<>Created {new Date(task.createdAt).toLocaleString()}</>}
      leftActions={[
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: onDelete,
          variant: 'danger',
        },
        ...(task.status !== 'completed'
          ? [{ label: 'Mark as done', icon: <Check className="w-4 h-4" />, onClick: onMarkDone }]
          : []),
      ]}
      primaryAction={{ label: 'Edit Task', onClick: onEdit }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { leads, updateLead, deleteLead, convertLeadToDeal } = useSalesStore();
  const { leadStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const { openAddTask } = useFormStack();

  // Find lead by slug or ID
  const lead = useMemo(() => {
    if (!id) return undefined;
    return leads.find(l => l.slug === id) || leads.find(l => l.id === id);
  }, [leads, id]);

  // Document title
  useDocumentTitle(lead ? lead.name : 'Lead');

  // State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  // Get related entities
  const company = useMemo(
    () => (lead?.companyId ? companies.find(c => c.id === lead.companyId) : null),
    [lead, companies]
  );
  const contact = useMemo(
    () => (lead?.contactId ? contacts.find(c => c.id === lead.contactId) : null),
    [lead, contacts]
  );
  const owner = useMemo(
    () => (lead?.ownerId ? users.find(u => u.id === lead.ownerId) : null),
    [lead, users]
  );

  // Tasks linked to this lead
  const linkedTasks = useMemo(() => {
    if (!lead) return [];
    return tasks.filter(
      task => task.linkedItem?.type === 'lead' && task.linkedItem?.id === lead.id
    );
  }, [tasks, lead]);

  const openTasksCount = useMemo(() => {
    return linkedTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [linkedTasks]);

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/sales/leads');
  }, [navigate]);

  const handleDelete = useCallback(async () => {
    if (!lead) return;
    try {
      await deleteLead(lead.id);
      toast.success('Lead Deleted', `"${lead.name}" has been deleted`);
      navigate('/sales/leads');
    } catch {
      toast.error('Error', 'Failed to delete lead');
    }
  }, [lead, deleteLead, toast, navigate]);

  const handleConvert = useCallback(async () => {
    if (!lead) return;
    try {
      const deal = await convertLeadToDeal(lead.id, {
        name: lead.name,
        companyId: lead.companyId,
        companyName: lead.companyName,
        contactId: lead.contactId,
        contactName: lead.contactName,
        stage: 'By Estimation',
        label: lead.label,
        source: lead.source,
        ownerId: lead.ownerId,
        ownerName: lead.ownerName,
        value: lead.value,
        notes: lead.notes,
        jobsiteAddress: lead.jobsiteAddress,
      });
      toast.success('Lead Converted', `"${lead.name}" has been converted to a deal`);
      navigate(`/sales/deals/${deal.id}`);
    } catch {
      toast.error('Error', 'Failed to convert lead to deal');
    }
  }, [lead, convertLeadToDeal, toast, navigate]);

  const handleFieldSave = useCallback(
    (field: string, value: string) => {
      if (!lead) return;
      const updateValue = field === 'value' ? (parseFloat(value) || 0) : value;
      updateLead(lead.id, { [field]: updateValue });
      toast.success('Updated', 'Lead information saved');
    },
    [lead, updateLead, toast]
  );

  const handleAddTask = useCallback(() => {
    if (!lead) return;
    openAddTask({
      defaultLinkedItemType: 'lead',
      defaultLinkedItemId: lead.id,
      defaultLinkedItemName: lead.name,
      defaultCompanyId: lead.companyId,
      defaultCompanyName: lead.companyName,
      defaultContactId: lead.contactId,
      defaultContactName: lead.contactName,
    });
  }, [lead, openAddTask]);

  const handleEditTask = useCallback(
    (_task: Task) => {
      navigate('/tasks');
      setQuickViewTask(null);
    },
    [navigate]
  );

  const handleMarkTaskDone = useCallback(async () => {
    if (!quickViewTask) return;
    try {
      await updateTask(quickViewTask.id, { status: 'completed' } as Partial<TaskInput>);
      toast.success('Task Completed', 'Task has been marked as done');
      setQuickViewTask(null);
    } catch {
      toast.error('Error', 'Failed to complete task');
    }
  }, [quickViewTask, updateTask, toast]);

  const handleDeleteTask = useCallback(async () => {
    if (!quickViewTask) return;
    try {
      await deleteTask(quickViewTask.id);
      toast.success('Task Deleted', 'Task has been removed');
      setQuickViewTask(null);
    } catch {
      toast.error('Error', 'Failed to delete task');
    }
  }, [quickViewTask, deleteTask, toast]);

  // Stage/Label options
  const stageOptions = useMemo(
    () => leadStages.map(s => ({ value: s.name, label: s.name })),
    [leadStages]
  );
  const labelOptions = useMemo(
    () => leadLabels.map(l => ({ value: l.name, label: l.name })),
    [leadLabels]
  );
  const sourceOptions = useMemo(
    () => leadSources.map(s => ({ value: s.name, label: s.name })),
    [leadSources]
  );
  const ownerOptions = useMemo(
    () => users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  // Not found state
  if (!lead) {
    return (
      <Page title="Lead Not Found" description="The requested lead could not be found.">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center bg-white dark:bg-slate-900">
          <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Lead not found</h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">This lead may have been deleted.</p>
          <Button variant="primary" className="mt-4" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </Page>
    );
  }

  // Get label color
  const labelConfig = leadLabels.find(l => l.name === lead.label);
  const labelColor = labelConfig?.color || 'slate';

  // Check if converted
  const isConverted = !!lead.convertedToDealId;

  return (
    <Page
      title={lead.name}
      description={isConverted ? 'Converted to Deal' : lead.stage}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {!isConverted && (
            <Button variant="primary" size="sm" onClick={() => setShowConvertModal(true)}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Convert to Deal
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      }
    >
      {/* Converted Banner */}
      {isConverted && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">
                  This lead has been converted to a deal
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Converted on {formatDate(lead.updatedAt, 'long')}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/sales/deals/${lead.convertedToDealId}`)}
            >
              View Deal
              <ArrowRightLeft className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lead Details - Non-collapsible */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Lead Details</span>
              {lead.label && (
                <span
                  className={clsx(
                    'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
                    `bg-${labelColor}-100 text-${labelColor}-700 dark:bg-${labelColor}-900/30 dark:text-${labelColor}-400`
                  )}
                >
                  {lead.label}
                </span>
              )}
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InlineEditField
                  label="Lead Name"
                  value={lead.name}
                  onSave={(v) => handleFieldSave('name', v)}
                  placeholder="Lead name"
                />
                <InlineSelectField
                  label="Stage"
                  value={lead.stage}
                  options={stageOptions}
                  onSave={(v) => handleFieldSave('stage', v)}
                  icon={Target}
                />
                <InlineSelectField
                  label="Label"
                  value={lead.label || ''}
                  options={labelOptions}
                  onSave={(v) => handleFieldSave('label', v)}
                  placeholder="Select label"
                  icon={Tag}
                />
                <InlineSelectField
                  label="Source"
                  value={lead.source || ''}
                  options={sourceOptions}
                  onSave={(v) => handleFieldSave('source', v)}
                  placeholder="Select source"
                  icon={Megaphone}
                />
                <InlineSelectField
                  label="Owner"
                  value={lead.ownerId}
                  options={ownerOptions}
                  onSave={(v) => {
                    const user = users.find(u => u.id === v);
                    handleFieldSave('ownerId', v);
                    if (user) handleFieldSave('ownerName', user.name);
                  }}
                  placeholder="Select owner"
                  icon={User}
                />
                <InlineEditField
                  label="Value"
                  value={lead.value?.toString() || ''}
                  onSave={(v) => handleFieldSave('value', v)}
                  placeholder="Enter value"
                  icon={DollarSign}
                />
                
                {/* Company link */}
                <div
                  data-inline-field="true"
                  className="group"
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Company</div>
                  {company ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        onClick={() => navigate(`/clients/companies/${company.slug || company.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {company.name}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-400 italic">No company linked</span>
                    </div>
                  )}
                </div>
                
                {/* Contact link */}
                <div
                  data-inline-field="true"
                  className="group"
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Contact</div>
                  {contact ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        onClick={() => navigate(`/clients/contacts/${contact.slug || contact.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {contact.firstName} {contact.lastName}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-400 italic">No contact linked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Jobsite Address - Collapsible */}
          <CollapsibleSection
            title="Jobsite Address"
            icon={MapPin}
            defaultOpen={!!lead.jobsiteAddress?.street}
          >
            <AddressInput
              street={lead.jobsiteAddress?.street || ''}
              suite={lead.jobsiteAddress?.suite || ''}
              city={lead.jobsiteAddress?.city || ''}
              state={lead.jobsiteAddress?.state || ''}
              zip={lead.jobsiteAddress?.zip || ''}
              autoSave
              onSave={(address) => {
                updateLead(lead.id, {
                  jobsiteAddress: {
                    street: address.street,
                    suite: address.suite || '',
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                  },
                });
                toast.success('Updated', 'Jobsite address saved');
              }}
            />
          </CollapsibleSection>

          {/* Notes - Collapsible */}
          <CollapsibleSection
            title="Notes"
            icon={FileText}
            defaultOpen={!!lead.notes}
          >
            <Textarea
              value={lead.notes || ''}
              onChange={() => {
                // Update on change for real-time editing
              }}
              onBlur={(e) => {
                if (e.target.value !== (lead.notes || '')) {
                  updateLead(lead.id, { notes: e.target.value });
                  toast.success('Updated', 'Notes saved');
                }
              }}
              placeholder="Add notes about this lead..."
              rows={4}
              className="w-full"
            />
          </CollapsibleSection>
        </div>

        {/* Right Column - Quick Info & Tasks */}
        <div className="space-y-4">
          {/* Quick Info */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Quick Info"
              icon={Info}
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Value</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {lead.value ? `$${lead.value.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Owner</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {owner?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Open Tasks</span>
                  <span className="font-medium text-slate-900 dark:text-white">{openTasksCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Days Open</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatDate(lead.createdAt, 'short')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <EntityTasksSection
            entityType="lead"
            entityId={lead.id}
            entityName={lead.name}
            defaultCollapsed={true}
            onAddTask={handleAddTask}
            onTaskClick={(task) => setQuickViewTask(task)}
          />
        </div>
      </div>

      {/* Task Quick View Modal */}
      <TaskQuickViewComponent
        task={quickViewTask}
        isOpen={!!quickViewTask}
        taskTypes={taskTypes}
        users={users}
        onClose={() => setQuickViewTask(null)}
        onEdit={() => quickViewTask && handleEditTask(quickViewTask)}
        onMarkDone={handleMarkTaskDone}
        onDelete={handleDeleteTask}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Convert to Deal Modal */}
      <ConfirmModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={handleConvert}
        title="Convert to Deal"
        message={`Are you sure you want to convert "${lead.name}" to a deal? This will create a new deal with all lead information and mark this lead as converted.`}
        confirmText="Convert to Deal"
        variant="primary"
      />
    </Page>
  );
}

export default LeadDetailPage;