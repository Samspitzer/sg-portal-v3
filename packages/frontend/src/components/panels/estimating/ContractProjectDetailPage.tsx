// ============================================================================
// ContractProjectDetailPage
// Location: src/components/panels/estimating/ContractProjectDetailPage.tsx
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileSignature, ArrowLeft, Building2, User, MapPin, Trash2,
  DollarSign, Calendar as CalendarIcon, Target, TrendingUp, FileText,
  Info, Tag,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button, ConfirmModal, SectionHeader,
  InlineEditField, InlineSelectField, CollapsibleSection,
  AddressInput, Textarea, EntityTasksSection,
  QuickViewModal, TaskTypeIcon,
  type QuickViewField,
} from '@/components/common';
import { PricingStepsPanel, type StepFormState } from './PricingSteps';
import {
  useEstimatingStore,
  useUsersStore,
  useClientsStore,
  useSalesStore,
  useToast,
  useFieldsStore,
  useAuthStore,
  type PricingStep,
  type ContractProject,
} from '@/contexts';
import { useTaskStore, type Task } from '@/contexts/taskStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { useFormStack } from '@/components/panels/add-forms';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_OPTIONS = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'retainer', label: 'Retainer' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function ContractProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser } = useAuthStore();

  const { contractProjects, updateContractProject, deleteContractProject, addPricingStep, updatePricingStep, deletePricingStep } = useEstimatingStore();
  const { users } = useUsersStore();
  const { tasks, completeTask, deleteTask: deleteTaskById, createTask, updateTask } = useTaskStore();
  const { taskTypes } = useTaskTypesStore();
  const { openAddTask } = useFormStack();
  const { companies, contacts } = useClientsStore();
  const { leads, deals } = useSalesStore();
  const { estimateStatuses } = useFieldsStore();

  const project = useMemo(() => {
    if (!id) return undefined;
    return contractProjects.find((p: ContractProject) => p.id === id);
  }, [contractProjects, id]);

  useDocumentTitle(project ? project.name : 'Contract Project');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);

  const company = useMemo(() => project?.companyId ? companies.find(c => c.id === project.companyId) : null, [project, companies]);
  const contact = useMemo(() => project?.contactId ? contacts.find(c => c.id === project.contactId) : null, [project, contacts]);
  const owner = useMemo(() => project?.ownerId ? users.find(u => u.id === project.ownerId) : null, [project, users]);
  const linkedLead = useMemo(() => project?.linkedLeadId ? leads.find(l => l.id === project.linkedLeadId) : null, [project, leads]);
  const linkedDeal = useMemo(() => project?.linkedDealId ? deals.find(d => d.id === project.linkedDealId) : null, [project, deals]);

  const sortedSteps = useMemo(() =>
    project ? [...project.pricingSteps].sort((a, b) => a.sortOrder - b.sortOrder) : [],
    [project]);
  const totalEstimate = useMemo(() => sortedSteps.reduce((sum, s) => sum + s.total, 0), [sortedSteps]);

  const ownerOptions = useMemo(() => users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })), [users]);

  const handleFieldSave = useCallback(async (field: string, value: string) => {
    if (!project) return;
    const v = field === 'contractValue' ? (parseFloat(value) || undefined) : value;
    updateContractProject(project.id, { [field]: v });
    toast.success('Updated', 'Project saved');

    // Sync due-date task when end date changes
    if (field === 'endDate') {
      const linkedDueTask = tasks.find(
        t => t.linkedItem?.type === 'estimate' &&
             t.linkedItem?.id === project.id &&
             t.title.startsWith('Estimate Due:')
      );
      if (linkedDueTask) {
        try { await updateTask(linkedDueTask.id, { dueDate: value || undefined }); } catch { /* non-fatal */ }
      } else if (value) {
        const assigneeId = project.ownerId || currentUser?.id || '';
        const assigneeName = project.ownerName || currentUser?.name || '';
        if (assigneeId) {
          try {
            await createTask({
              title: `Estimate Due: ${project.name}`,
              dueDate: value,
              assignedUserId: assigneeId,
              assignedUserName: assigneeName,
              linkedItem: { type: 'estimate', id: project.id, name: project.name },
            });
          } catch { /* non-fatal */ }
        }
      }
    }
  }, [project, updateContractProject, toast, tasks, updateTask, createTask, currentUser]);

  const handleDelete = useCallback(async () => {
    if (!project) return;
    deleteContractProject(project.id);
    toast.success('Deleted', `"${project.name}" has been deleted`);
    navigate('/estimates/contracts');
  }, [project, deleteContractProject, toast, navigate]);

  const handleAddTask = useCallback(() => {
    if (!project) return;
    openAddTask({
      defaultLinkedItemType: 'estimate',
      defaultLinkedItemId: project.id,
      defaultLinkedItemName: project.name,
      defaultCompanyId: project.companyId,
      defaultCompanyName: project.companyName,
      defaultContactId: project.contactId,
      defaultContactName: project.contactName,
      defaultDueDate: project.endDate,
    });
  }, [project, openAddTask]);

  const handleMarkTaskDone = useCallback(async () => {
    if (!quickViewTask) return;
    await completeTask(quickViewTask.id);
    toast.success('Task Completed', 'Task has been marked as done');
    setQuickViewTask(null);
  }, [quickViewTask, completeTask, toast]);

  const handleDeleteTask = useCallback(async () => {
    if (!quickViewTask) return;
    await deleteTaskById(quickViewTask.id);
    toast.success('Task Deleted', 'Task has been removed');
    setQuickViewTask(null);
  }, [quickViewTask, deleteTaskById, toast]);

  const handleAddStep = useCallback((form: StepFormState) => {
    if (!project) return;
    addPricingStep('contract', project.id, {
      title: form.title,
      description: form.description || undefined,
      laborHours: parseFloat(form.laborHours) || undefined,
      laborRate: parseFloat(form.laborRate) || undefined,
      materialsCost: parseFloat(form.materialsCost) || undefined,
      otherCost: parseFloat(form.otherCost) || undefined,
      sortOrder: sortedSteps.length,
    });
    toast.success('Step Added', form.title);
    setShowAddStep(false);
  }, [project, addPricingStep, sortedSteps.length, toast]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<Omit<PricingStep, 'id' | 'createdAt'>>) => {
    if (!project) return;
    updatePricingStep('contract', project.id, stepId, updates);
    toast.success('Updated', 'Step saved');
    setEditingStepId(null);
  }, [project, updatePricingStep, toast]);

  const handleDeleteStep = useCallback((stepId: string) => {
    if (!project) return;
    deletePricingStep('contract', project.id, stepId);
    toast.success('Removed', 'Pricing step removed');
    setDeleteStepId(null);
  }, [project, deletePricingStep, toast]);

  if (!project) {
    return (
      <Page title="Not Found">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center bg-white dark:bg-slate-900">
          <FileSignature className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Project not found</h3>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/estimates/contracts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Contract Projects
          </Button>
        </div>
      </Page>
    );
  }

  const currentStatus = estimateStatuses.find(s => s.id === project.status);
  const statusColor = currentStatus?.color ?? '#64748b';
  const statusName = currentStatus?.name ?? project.status;
  const contractTypeLabel = CONTRACT_TYPE_OPTIONS.find(t => t.value === project.contractType)?.label ?? project.contractType;

  return (
    <Page
      title={project.name}
      description={project.projectNumber}
      actions={
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {contractTypeLabel}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}
          >
            {statusName}
          </span>
          <Button variant="secondary" size="sm" onClick={() => navigate('/estimates/contracts')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />Delete
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project Details */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <FileSignature className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Contract Details</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InlineEditField label="Project Name" value={project.name}
                  onSave={v => handleFieldSave('name', v)} placeholder="Project name" />
                <InlineSelectField label="Contract Type" value={project.contractType}
                  options={CONTRACT_TYPE_OPTIONS} onSave={v => handleFieldSave('contractType', v)} icon={Tag} />
                <InlineSelectField label="Status" value={project.status}
                  options={[...estimateStatuses].sort((a, b) => a.order - b.order).map(s => ({ value: s.id, label: s.name }))} onSave={v => handleFieldSave('status', v)} icon={Info} />
                <InlineEditField label="Contract Value ($)" value={project.contractValue?.toString() || ''}
                  onSave={v => handleFieldSave('contractValue', v)} placeholder="Enter value" icon={DollarSign} />
                <InlineSelectField label="Owner" value={project.ownerId || ''}
                  options={ownerOptions} onSave={v => {
                    const u = users.find(u => u.id === v);
                    handleFieldSave('ownerId', v);
                    if (u) handleFieldSave('ownerName', u.name);
                  }} placeholder="Select owner" icon={User} />
                <div className="grid grid-cols-2 gap-2 col-span-1">
                  <InlineEditField label="Start Date" value={project.startDate || ''}
                    onSave={v => handleFieldSave('startDate', v)} placeholder="YYYY-MM-DD" icon={CalendarIcon} />
                  <InlineEditField label="End Date" value={project.endDate || ''}
                    onSave={v => handleFieldSave('endDate', v)} placeholder="YYYY-MM-DD" icon={CalendarIcon} />
                </div>

                {/* Company */}
                <div data-inline-field="true" className="group">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Company</div>
                  {company ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <button onClick={() => navigate(`/clients/companies/${company.slug || company.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{company.name}</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-400 italic">No company linked</span>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div data-inline-field="true" className="group">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Contact</div>
                  {contact ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <button onClick={() => navigate(`/clients/contacts/${contact.slug || contact.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
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

          {/* Sales Links */}
          {(linkedLead || linkedDeal) && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Sales Links</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg grid grid-cols-2 gap-3">
                {linkedLead && (
                  <div data-inline-field="true">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Linked Lead</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      <button onClick={() => navigate(`/sales/leads/${linkedLead.slug || linkedLead.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{linkedLead.name}</button>
                    </div>
                  </div>
                )}
                {linkedDeal && (
                  <div data-inline-field="true">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Linked Deal</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      <button onClick={() => navigate(`/sales/deals/${linkedDeal.slug || linkedDeal.id}`)}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{linkedDeal.name}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Steps */}
          <PricingStepsPanel
            steps={sortedSteps}
            totalEstimate={totalEstimate}
            contractValue={project.contractValue}
            showAddStep={showAddStep}
            editingStepId={editingStepId}
            onShowAdd={() => setShowAddStep(true)}
            onHideAdd={() => setShowAddStep(false)}
            onAdd={handleAddStep}
            onEdit={id => setEditingStepId(id)}
            onSave={(id, updates) => handleUpdateStep(id, updates)}
            onCancelEdit={() => setEditingStepId(null)}
            onDelete={id => setDeleteStepId(id)}
          />

          {/* Jobsite Address */}
          <CollapsibleSection title="Jobsite Address" icon={MapPin} defaultOpen={!!project.jobsiteAddress?.street}>
            <AddressInput
              street={project.jobsiteAddress?.street || ''} suite={project.jobsiteAddress?.suite || ''}
              city={project.jobsiteAddress?.city || ''} state={project.jobsiteAddress?.state || ''}
              zip={project.jobsiteAddress?.zip || ''}
              autoSave
              onSave={addr => {
                updateContractProject(project.id, {
                  jobsiteAddress: { street: addr.street, suite: addr.suite || '', city: addr.city, state: addr.state, zip: addr.zip },
                });
                toast.success('Updated', 'Jobsite address saved');
              }}
            />
          </CollapsibleSection>

          {/* Notes */}
          <CollapsibleSection title="Notes" icon={FileText} defaultOpen={!!project.notes}>
            <Textarea
              value={project.notes || ''}
              onChange={() => {}}
              onBlur={e => {
                if (e.target.value !== (project.notes || '')) {
                  updateContractProject(project.id, { notes: e.target.value });
                  toast.success('Updated', 'Notes saved');
                }
              }}
              placeholder="Contract terms, scope, inclusions, exclusions…"
              rows={4} className="w-full"
            />
          </CollapsibleSection>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader title="Quick Info" icon={Info} />
            <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Project #</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{project.projectNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Contract Value</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {project.contractValue ? `$${project.contractValue.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Step Total</span>
                <span className="font-medium text-accent-600 dark:text-accent-400">
                  ${totalEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {project.contractValue && totalEstimate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Variance</span>
                  <span className={`font-medium ${totalEstimate > project.contractValue ? 'text-red-500' : 'text-green-600'}`}>
                    {totalEstimate > project.contractValue ? '+' : ''}${(totalEstimate - project.contractValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Contract Type</span>
                <span className="font-medium text-slate-900 dark:text-white">{contractTypeLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Owner</span>
                <span className="font-medium text-slate-900 dark:text-white">{owner?.name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Period</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {project.startDate ? formatDate(project.startDate, 'short') : '—'} → {project.endDate ? formatDate(project.endDate, 'short') : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Steps</span>
                <span className="font-medium text-slate-900 dark:text-white">{sortedSteps.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatDate(project.createdAt, 'short')}</span>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <EntityTasksSection
            entityType="estimate"
            entityId={project.id}
            entityName={project.name}
            onAddTask={handleAddTask}
            onTaskClick={setQuickViewTask}
            defaultCollapsed={false}
          />
        </div>
      </div>

      {quickViewTask && (() => {
        const taskType = taskTypes.find(tt => tt.value === quickViewTask.type);
        return (
          <QuickViewModal
            isOpen={!!quickViewTask}
            onClose={() => setQuickViewTask(null)}
            title={quickViewTask.title}
            icon={taskType ? <TaskTypeIcon icon={taskType.icon} className="w-5 h-5 text-teal-600 dark:text-teal-400" /> : undefined}
            fields={[
              ...(quickViewTask.dueDate ? [{ label: 'Due Date', value: formatDate(quickViewTask.dueDate, 'long') }] : []),
              ...(taskType ? [{ label: 'Type', value: taskType.label }] : []),
              { label: 'Assigned', value: quickViewTask.assignedUserName || '—' },
              { label: 'Status', value: quickViewTask.completedAt ? 'Completed' : 'Open' },
            ] as QuickViewField[]}
            leftActions={[{ label: 'Delete', variant: 'danger', onClick: handleDeleteTask }]}
            primaryAction={{ label: 'Mark Done', variant: 'primary', onClick: handleMarkTaskDone, disabled: !!quickViewTask.completedAt }}
          />
        );
      })()}

      <ConfirmModal
        isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete} title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmText="Delete" variant="danger"
      />
      <ConfirmModal
        isOpen={!!deleteStepId} onClose={() => setDeleteStepId(null)}
        onConfirm={() => deleteStepId && handleDeleteStep(deleteStepId)}
        title="Remove Step" message="Are you sure you want to remove this pricing step?"
        confirmText="Remove" variant="danger"
      />
    </Page>
  );
}

export default ContractProjectDetailPage;