// ============================================================================
// ContractProjectDetailPage
// Location: src/components/panels/estimating/ContractProjectDetailPage.tsx
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileSignature, ArrowLeft, Building2, User, MapPin, Trash2,
  DollarSign, Calendar, Target, TrendingUp, FileText,
  Info, Plus, Pencil, X, Check, GripVertical, Calculator, Tag,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button, ConfirmModal, SectionHeader,
  InlineEditField, InlineSelectField, CollapsibleSection,
  AddressInput, Textarea,
} from '@/components/common';
import {
  useEstimatingStore,
  useUsersStore,
  useClientsStore,
  useSalesStore,
  useToast,
  type PricingStep,
  type ContractProject,
  type ContractStatus,
} from '@/contexts';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'signed', label: 'Signed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'retainer', label: 'Retainer' },
];

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pending_signature: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  signed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ── Pricing Step components (identical to Delivery) ────────────────────────

interface StepFormState {
  title: string;
  description: string;
  laborHours: string;
  laborRate: string;
  materialsCost: string;
  otherCost: string;
}

const EMPTY_STEP: StepFormState = {
  title: '', description: '', laborHours: '', laborRate: '',
  materialsCost: '', otherCost: '',
};

function calcPreview(f: StepFormState): number {
  const labor = (parseFloat(f.laborHours) || 0) * (parseFloat(f.laborRate) || 0);
  return labor + (parseFloat(f.materialsCost) || 0) + (parseFloat(f.otherCost) || 0);
}

function PricingStepRow({ step, isEditing, onEdit, onSave, onCancel, onDelete }: {
  step: PricingStep; isEditing: boolean;
  onEdit: () => void;
  onSave: (u: Partial<Omit<PricingStep, 'id' | 'createdAt'>>) => void;
  onCancel: () => void; onDelete: () => void;
}) {
  const [form, setForm] = useState<StepFormState>({
    title: step.title, description: step.description || '',
    laborHours: step.laborHours?.toString() || '', laborRate: step.laborRate?.toString() || '',
    materialsCost: step.materialsCost?.toString() || '', otherCost: step.otherCost?.toString() || '',
  });
  const update = (k: keyof StepFormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(), description: form.description || undefined,
      laborHours: parseFloat(form.laborHours) || undefined, laborRate: parseFloat(form.laborRate) || undefined,
      materialsCost: parseFloat(form.materialsCost) || undefined, otherCost: parseFloat(form.otherCost) || undefined,
      sortOrder: step.sortOrder,
    });
  };

  if (isEditing) {
    return (
      <div className="border border-accent-500/30 rounded-lg p-4 bg-teal-50/50 dark:bg-teal-900/10 space-y-3">
        <input className="w-full text-sm font-medium border-b border-slate-200 dark:border-slate-700 bg-transparent pb-1 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
          placeholder="Step title *" value={form.title} onChange={e => update('title', e.target.value)} />
        <textarea className="w-full text-sm text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-accent-500"
          placeholder="Description (optional)" rows={2} value={form.description} onChange={e => update('description', e.target.value)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'laborHours' as const, label: 'Labour Hrs', placeholder: '0' },
            { key: 'laborRate' as const, label: 'Rate ($/hr)', placeholder: '0.00' },
            { key: 'materialsCost' as const, label: 'Materials $', placeholder: '0.00' },
            { key: 'otherCost' as const, label: 'Other $', placeholder: '0.00' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
              <input type="number" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
                placeholder={placeholder} value={form[key]} onChange={e => update(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subtotal: <span className="text-accent-600 dark:text-accent-400">${calcPreview(form).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>Save Step</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
      <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-1 flex-shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-900 dark:text-white">{step.title}</div>
        {step.description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.description}</div>}
        <div className="flex flex-wrap gap-3 mt-1.5">
          {(step.laborHours || step.laborRate) && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Labour: {step.laborHours ?? 0} hrs @ ${step.laborRate ?? 0}/hr</span>
          )}
          {(step.materialsCost ?? 0) > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">Materials: ${step.materialsCost!.toLocaleString()}</span>}
          {(step.otherCost ?? 0) > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">Other: ${step.otherCost!.toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          ${step.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 transition-all">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddStepForm({ onAdd, onCancel }: { onAdd: (s: StepFormState) => void; onCancel: () => void }) {
  const [form, setForm] = useState<StepFormState>(EMPTY_STEP);
  const update = (k: keyof StepFormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="border-2 border-dashed border-accent-300 dark:border-accent-700 rounded-lg p-4 space-y-3 bg-teal-50/30 dark:bg-teal-900/10">
      <input autoFocus
        className="w-full text-sm font-medium border-b border-slate-200 dark:border-slate-700 bg-transparent pb-1 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
        placeholder="Step title *" value={form.title} onChange={e => update('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && form.title.trim()) onAdd(form); if (e.key === 'Escape') onCancel(); }}
      />
      <textarea
        className="w-full text-sm text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-accent-500"
        placeholder="Description (optional)" rows={2} value={form.description} onChange={e => update('description', e.target.value)} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { key: 'laborHours' as const, label: 'Labour Hrs', placeholder: '0' },
          { key: 'laborRate' as const, label: 'Rate ($/hr)', placeholder: '0.00' },
          { key: 'materialsCost' as const, label: 'Materials $', placeholder: '0.00' },
          { key: 'otherCost' as const, label: 'Other $', placeholder: '0.00' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
            <input type="number"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
              placeholder={placeholder} value={form[key]} onChange={e => update(key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Preview: <span className="text-accent-600 dark:text-accent-400">${calcPreview(form).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={() => form.title.trim() && onAdd(form)} disabled={!form.title.trim()}>
            <Check className="w-3.5 h-3.5 mr-1" />Add Step
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContractProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { contractProjects, updateContractProject, deleteContractProject, addPricingStep, updatePricingStep, deletePricingStep } = useEstimatingStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { leads, deals } = useSalesStore();

  const project = useMemo(() => {
    if (!id) return undefined;
    return contractProjects.find((p: ContractProject) => p.id === id);
  }, [contractProjects, id]);

  useDocumentTitle(project ? project.name : 'Contract Project');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);

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

  const handleFieldSave = useCallback((field: string, value: string) => {
    if (!project) return;
    const v = field === 'contractValue' ? (parseFloat(value) || undefined) : value;
    updateContractProject(project.id, { [field]: v });
    toast.success('Updated', 'Project saved');
  }, [project, updateContractProject, toast]);

  const handleDelete = useCallback(async () => {
    if (!project) return;
    deleteContractProject(project.id);
    toast.success('Deleted', `"${project.name}" has been deleted`);
    navigate('/estimates/contracts');
  }, [project, deleteContractProject, toast, navigate]);

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

  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
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
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {STATUS_OPTIONS.find(s => s.value === project.status)?.label ?? project.status}
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
                  options={STATUS_OPTIONS} onSave={v => handleFieldSave('status', v)} icon={Info} />
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
                    onSave={v => handleFieldSave('startDate', v)} placeholder="YYYY-MM-DD" icon={Calendar} />
                  <InlineEditField label="End Date" value={project.endDate || ''}
                    onSave={v => handleFieldSave('endDate', v)} placeholder="YYYY-MM-DD" icon={Calendar} />
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
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Pricing Steps</span>
                {sortedSteps.length > 0 && (
                  <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{sortedSteps.length}</span>
                )}
              </div>
              {!showAddStep && (
                <Button variant="ghost" size="sm" onClick={() => setShowAddStep(true)}>
                  <Plus className="w-4 h-4 mr-1" />Add Step
                </Button>
              )}
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg space-y-1">
              {sortedSteps.length === 0 && !showAddStep && (
                <div className="text-center py-8">
                  <Calculator className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No pricing steps yet</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowAddStep(true)}>
                    <Plus className="w-4 h-4 mr-1" />Add First Step
                  </Button>
                </div>
              )}

              {sortedSteps.map(step => (
                <PricingStepRow
                  key={step.id} step={step}
                  isEditing={editingStepId === step.id}
                  onEdit={() => setEditingStepId(step.id)}
                  onSave={updates => handleUpdateStep(step.id, updates)}
                  onCancel={() => setEditingStepId(null)}
                  onDelete={() => setDeleteStepId(step.id)}
                />
              ))}

              {showAddStep && <AddStepForm onAdd={handleAddStep} onCancel={() => setShowAddStep(false)} />}

              {sortedSteps.length > 0 && (
                <div className="flex justify-end pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Estimate</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      ${totalEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

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
        </div>
      </div>

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