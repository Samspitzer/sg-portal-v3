// ============================================================================
// DealDetailPage - Deal Detail View
// Location: src/components/panels/sales/DealDetailPage.tsx
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  TrendingUp,
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Check,
  X,
  Target,
  Award,
  RotateCcw,
  FileText,
  Info,
  Tag,
  Megaphone,
  DollarSign,
  Hash,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  ConfirmModal,
  Modal,
  Textarea,
  SectionHeader,
  InlineEditField,
  InlineSelectField,
  CollapsibleSection,
  EntityTasksSection,
  QuickViewModal,
  AddressInput,
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
  type Deal,
} from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useTaskTypesStore, type TaskTypeConfig } from '@/contexts/taskTypesStore';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Constants
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
// Won/Lost Modal
// ============================================================================

function WonLostModal({
  isOpen,
  mode,
  deal,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  mode: 'won' | 'lost';
  deal: Deal | null;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');

  if (!deal) return null;

  const handleConfirm = () => {
    onConfirm(mode === 'lost' ? reason : undefined);
    setReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'won' ? 'Mark Deal as Won' : 'Mark Deal as Lost'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={mode === 'won' ? 'primary' : 'danger'}
            onClick={handleConfirm}
          >
            {mode === 'won' ? 'Mark as Won' : 'Mark as Lost'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          {mode === 'won'
            ? `Congratulations! You're about to mark "${deal.name}" as won.`
            : `You're about to mark "${deal.name}" as lost.`}
        </p>

        {mode === 'lost' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for losing (optional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason this deal was lost..."
              rows={3}
            />
          </div>
        )}

        {mode === 'won' && deal.value && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Deal Value</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${deal.value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { deals, updateDeal, deleteDeal, markDealWon, markDealLost, reopenDeal } = useSalesStore();
  const { dealStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const { openAddTask } = useFormStack();

  // Find deal by slug or ID
  const deal = useMemo(() => {
    if (!id) return undefined;
    return deals.find(d => d.slug === id) || deals.find(d => d.id === id);
  }, [deals, id]);

  // Document title
  useDocumentTitle(deal ? deal.name : 'Deal');

  // State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wonLostModal, setWonLostModal] = useState<{ isOpen: boolean; mode: 'won' | 'lost' }>({
    isOpen: false,
    mode: 'won',
  });
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  // Get related entities
  const company = useMemo(
    () => (deal?.companyId ? companies.find(c => c.id === deal.companyId) : null),
    [deal, companies]
  );
  const contact = useMemo(
    () => (deal?.contactId ? contacts.find(c => c.id === deal.contactId) : null),
    [deal, contacts]
  );
  const owner = useMemo(
    () => (deal?.ownerId ? users.find(u => u.id === deal.ownerId) : null),
    [deal, users]
  );

  // Tasks linked to this deal
  const linkedTasks = useMemo(() => {
    if (!deal) return [];
    return tasks.filter(
      task => task.linkedItem?.type === 'deal' && task.linkedItem?.id === deal.id
    );
  }, [tasks, deal]);

  const openTasksCount = useMemo(() => {
    return linkedTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  }, [linkedTasks]);

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/sales/deals');
  }, [navigate]);

  const handleDelete = useCallback(async () => {
    if (!deal) return;
    try {
      await deleteDeal(deal.id);
      toast.success('Deal Deleted', `"${deal.name}" has been deleted`);
      navigate('/sales/deals');
    } catch {
      toast.error('Error', 'Failed to delete deal');
    }
  }, [deal, deleteDeal, toast, navigate]);

  const handleWonLost = useCallback(
    async (reason?: string) => {
      if (!deal) return;
      try {
        if (wonLostModal.mode === 'won') {
          await markDealWon(deal.id);
          toast.success('Deal Won! 🎉', `"${deal.name}" has been marked as won`);
        } else {
          await markDealLost(deal.id, reason || '');
          toast.success('Deal Lost', `"${deal.name}" has been marked as lost`);
        }
        setWonLostModal({ isOpen: false, mode: 'won' });
      } catch {
        toast.error('Error', `Failed to mark deal as ${wonLostModal.mode}`);
      }
    },
    [deal, wonLostModal.mode, markDealWon, markDealLost, toast]
  );

  const handleReopen = useCallback(async () => {
    if (!deal) return;
    try {
      await reopenDeal(deal.id);
      toast.success('Deal Reopened', `"${deal.name}" is now active again`);
    } catch {
      toast.error('Error', 'Failed to reopen deal');
    }
  }, [deal, reopenDeal, toast]);

  const handleFieldSave = useCallback(
    (field: string, value: string) => {
      if (!deal) return;
      let updateValue: string | number = value;
      if (field === 'value' || field === 'commission') {
        updateValue = parseFloat(value) || 0;
      } else if (field === 'units') {
        updateValue = parseInt(value) || 0;
      }
      updateDeal(deal.id, { [field]: updateValue });
      toast.success('Updated', 'Deal information saved');
    },
    [deal, updateDeal, toast]
  );

  const handleAddTask = useCallback(() => {
    if (!deal) return;
    openAddTask({
      defaultLinkedItemType: 'deal',
      defaultLinkedItemId: deal.id,
      defaultLinkedItemName: deal.name,
      defaultCompanyId: deal.companyId,
      defaultCompanyName: deal.companyName,
      defaultContactId: deal.contactId,
      defaultContactName: deal.contactName,
    });
  }, [deal, openAddTask]);

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

  // Options
  const stageOptions = useMemo(
    () => dealStages.map(s => ({ value: s.name, label: s.name })),
    [dealStages]
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
  if (!deal) {
    return (
      <Page title="Deal Not Found" description="The requested deal could not be found.">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center bg-white dark:bg-slate-900">
          <TrendingUp className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Deal not found</h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">This deal may have been deleted.</p>
          <Button variant="primary" className="mt-4" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
        </div>
      </Page>
    );
  }

  // Status helpers
  const isWon = deal.status === 'won';
  const isLost = deal.status === 'lost';
  const isClosed = isWon || isLost;

  // Label color
  const labelConfig = leadLabels.find(l => l.name === deal.label);
  const labelColor = labelConfig?.color || 'slate';

  return (
    <Page
      title={deal.name}
      description={isClosed ? `${deal.status.toUpperCase()} - ${deal.stage}` : deal.stage}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {!isClosed && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setWonLostModal({ isOpen: true, mode: 'won' })}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Won
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWonLostModal({ isOpen: true, mode: 'lost' })}
              >
                <X className="w-4 h-4 mr-1" />
                Lost
              </Button>
            </>
          )}
          {isClosed && (
            <Button variant="secondary" size="sm" onClick={handleReopen}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reopen
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      }
    >
      {/* Won/Lost Banner */}
      {isClosed && (
        <div
          className={clsx(
            'mb-4 p-4 border rounded-lg',
            isWon
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isWon ? (
                <Award className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={clsx('font-medium', isWon ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300')}>
                  {isWon ? 'This deal was won!' : 'This deal was lost'}
                </p>
                {deal.lostReason && (
                  <p className="text-sm text-red-600 dark:text-red-400">Reason: {deal.lostReason}</p>
                )}
                <p className={clsx('text-sm', isWon ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  Closed on {formatDate(deal.updatedAt, 'long')}
                </p>
              </div>
            </div>
            {deal.value && isWon && (
              <div className="text-right">
                <p className="text-sm text-green-600 dark:text-green-400">Deal Value</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${deal.value.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Deal Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Deal Details */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Deal Details</span>
              {deal.label && (
                <span
                  className={clsx(
                    'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                    `bg-${labelColor}-100 text-${labelColor}-700 dark:bg-${labelColor}-900/30 dark:text-${labelColor}-400`
                  )}
                >
                  {deal.label}
                </span>
              )}
              {isClosed && (
                <span
                  className={clsx(
                    'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
                    isWon
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {isWon ? 'WON' : 'LOST'}
                </span>
              )}
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InlineEditField
                  label="Deal Name"
                  value={deal.name}
                  onSave={(v) => handleFieldSave('name', v)}
                  placeholder="Deal name"
                />
                <InlineSelectField
                  label="Stage"
                  value={deal.stage}
                  options={stageOptions}
                  onSave={(v) => handleFieldSave('stage', v)}
                  icon={TrendingUp}
                />
                <InlineSelectField
                  label="Label"
                  value={deal.label || ''}
                  options={labelOptions}
                  onSave={(v) => handleFieldSave('label', v)}
                  placeholder="Select label"
                  icon={Tag}
                />
                <InlineSelectField
                  label="Source"
                  value={deal.source || ''}
                  options={sourceOptions}
                  onSave={(v) => handleFieldSave('source', v)}
                  placeholder="Select source"
                  icon={Megaphone}
                />
                <InlineSelectField
                  label="Owner"
                  value={deal.ownerId}
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
                  value={deal.value?.toString() || ''}
                  onSave={(v) => handleFieldSave('value', v)}
                  placeholder="Enter value"
                  icon={DollarSign}
                />
                <InlineEditField
                  label="Expected Close"
                  value={deal.expectedCloseDate || ''}
                  onSave={(v) => handleFieldSave('expectedCloseDate', v)}
                  placeholder="YYYY-MM-DD"
                  icon={CalendarIcon}
                />
                <InlineEditField
                  label="Commission"
                  value={deal.commission?.toString() || ''}
                  onSave={(v) => handleFieldSave('commission', v)}
                  placeholder="Enter commission"
                  icon={DollarSign}
                />
                <InlineEditField
                  label="Units"
                  value={deal.units?.toString() || ''}
                  onSave={(v) => handleFieldSave('units', v)}
                  placeholder="Enter units"
                  icon={Hash}
                />
                
                {/* Company link */}
                <div data-inline-field="true" className="group">
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
                <div data-inline-field="true" className="group">
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
            defaultOpen={!!deal.jobsiteAddress?.street}
          >
            <AddressInput
              street={deal.jobsiteAddress?.street || ''}
              suite={deal.jobsiteAddress?.suite || ''}
              city={deal.jobsiteAddress?.city || ''}
              state={deal.jobsiteAddress?.state || ''}
              zip={deal.jobsiteAddress?.zip || ''}
              autoSave
              onSave={(address) => {
                updateDeal(deal.id, {
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
            defaultOpen={!!deal.notes}
          >
            <Textarea
              value={deal.notes || ''}
              onChange={() => {
                // Update on change for real-time editing
              }}
              onBlur={(e) => {
                if (e.target.value !== (deal.notes || '')) {
                  updateDeal(deal.id, { notes: e.target.value });
                  toast.success('Updated', 'Notes saved');
                }
              }}
              placeholder="Add notes about this deal..."
              rows={4}
              className="w-full"
            />
          </CollapsibleSection>
        </div>

        {/* Right Column - Quick Info & Tasks */}
        <div className="space-y-4">
          {/* Quick Info */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader title="Quick Info" icon={Info} />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Value</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {deal.value ? `$${deal.value.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Commission</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {deal.commission ? `$${deal.commission.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Units</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {deal.units || '—'}
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
                    {Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatDate(deal.createdAt, 'short')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Converted From Lead */}
          {deal.convertedFromLeadId && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <SectionHeader title="Converted From" icon={Target} />
              <div className="p-4 bg-white dark:bg-slate-900">
                <button
                  onClick={() => navigate(`/sales/leads/${deal.convertedFromLeadId}`)}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Original Lead</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">View lead details</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Tasks Section */}
          <EntityTasksSection
            entityType="deal"
            entityId={deal.id}
            entityName={deal.name}
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
        title="Delete Deal"
        message={`Are you sure you want to delete "${deal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Won/Lost Modal */}
      <WonLostModal
        isOpen={wonLostModal.isOpen}
        mode={wonLostModal.mode}
        deal={deal}
        onClose={() => setWonLostModal({ isOpen: false, mode: 'won' })}
        onConfirm={handleWonLost}
      />
    </Page>
  );
}

export default DealDetailPage;