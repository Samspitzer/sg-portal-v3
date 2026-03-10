// ============================================================================
// PricingSteps — shared components for Delivery & Contract detail pages
// Location: src/components/panels/estimating/PricingSteps.tsx
// ============================================================================

import { useState } from 'react';
import { GripVertical, Pencil, X, Check, Plus } from 'lucide-react';
import { Button } from '@/components/common';
import type { PricingStep } from '@/contexts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StepFormState {
  title: string;
  description: string;
  laborHours: string;
  laborRate: string;
  materialsCost: string;
  otherCost: string;
}

export const EMPTY_STEP: StepFormState = {
  title: '', description: '', laborHours: '', laborRate: '',
  materialsCost: '', otherCost: '',
};

export function calcPreview(f: StepFormState): number {
  const labor = (parseFloat(f.laborHours) || 0) * (parseFloat(f.laborRate) || 0);
  return labor + (parseFloat(f.materialsCost) || 0) + (parseFloat(f.otherCost) || 0);
}

// ── Shared number input grid ──────────────────────────────────────────────────

const COST_FIELDS = [
  { key: 'laborHours' as const,    label: 'Labour Hrs',  placeholder: '0' },
  { key: 'laborRate' as const,     label: 'Rate ($/hr)', placeholder: '0.00' },
  { key: 'materialsCost' as const, label: 'Materials $', placeholder: '0.00' },
  { key: 'otherCost' as const,     label: 'Other $',     placeholder: '0.00' },
] as const;

// ── PricingStepRow ────────────────────────────────────────────────────────────

interface PricingStepRowProps {
  step: PricingStep;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (u: Partial<Omit<PricingStep, 'id' | 'createdAt'>>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function PricingStepRow({ step, isEditing, onEdit, onSave, onCancel, onDelete }: PricingStepRowProps) {
  const [form, setForm] = useState<StepFormState>({
    title: step.title,
    description: step.description || '',
    laborHours: step.laborHours?.toString() || '',
    laborRate: step.laborRate?.toString() || '',
    materialsCost: step.materialsCost?.toString() || '',
    otherCost: step.otherCost?.toString() || '',
  });

  const update = (k: keyof StepFormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      description: form.description || undefined,
      laborHours: parseFloat(form.laborHours) || undefined,
      laborRate: parseFloat(form.laborRate) || undefined,
      materialsCost: parseFloat(form.materialsCost) || undefined,
      otherCost: parseFloat(form.otherCost) || undefined,
      sortOrder: step.sortOrder,
    });
  };

  if (isEditing) {
    return (
      <div className="border border-accent-500/30 rounded-lg p-4 bg-teal-50/50 dark:bg-teal-900/10 space-y-3">
        <input
          className="w-full text-sm font-medium border-b border-slate-200 dark:border-slate-700 bg-transparent pb-1 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
          placeholder="Step title *" value={form.title} onChange={e => update('title', e.target.value)}
        />
        <textarea
          className="w-full text-sm text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-accent-500"
          placeholder="Description (optional)" rows={2} value={form.description} onChange={e => update('description', e.target.value)}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COST_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
              <input type="number"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
                placeholder={placeholder} value={form[key]} onChange={e => update(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subtotal: <span className="text-accent-600 dark:text-accent-400">
              ${calcPreview(form).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
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
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Labour: {step.laborHours ?? 0} hrs @ ${step.laborRate ?? 0}/hr
            </span>
          )}
          {(step.materialsCost ?? 0) > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Materials: ${step.materialsCost!.toLocaleString()}</span>
          )}
          {(step.otherCost ?? 0) > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Other: ${step.otherCost!.toLocaleString()}</span>
          )}
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

// ── AddStepForm ───────────────────────────────────────────────────────────────

interface AddStepFormProps {
  onAdd: (s: StepFormState) => void;
  onCancel: () => void;
}

export function AddStepForm({ onAdd, onCancel }: AddStepFormProps) {
  const [form, setForm] = useState<StepFormState>(EMPTY_STEP);
  const update = (k: keyof StepFormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="border-2 border-dashed border-accent-300 dark:border-accent-700 rounded-lg p-4 space-y-3 bg-teal-50/30 dark:bg-teal-900/10">
      <input
        autoFocus
        className="w-full text-sm font-medium border-b border-slate-200 dark:border-slate-700 bg-transparent pb-1 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
        placeholder="Step title *" value={form.title} onChange={e => update('title', e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && form.title.trim()) onAdd(form);
          if (e.key === 'Escape') onCancel();
        }}
      />
      <textarea
        className="w-full text-sm text-slate-600 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-accent-500"
        placeholder="Description (optional)" rows={2} value={form.description} onChange={e => update('description', e.target.value)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {COST_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
            <input type="number"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:border-accent-500 text-slate-900 dark:text-white"
              placeholder={placeholder} value={form[key]} onChange={e => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Preview: <span className="text-accent-600 dark:text-accent-400">
            ${calcPreview(form).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
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

// ── PricingStepsPanel ─────────────────────────────────────────────────────────
// Full pricing steps card that both detail pages can drop in.

interface PricingStepsPanelProps {
  steps: PricingStep[];
  totalEstimate: number;
  contractValue?: number;
  showAddStep: boolean;
  editingStepId: string | null;
  onShowAdd: () => void;
  onHideAdd: () => void;
  onAdd: (form: StepFormState) => void;
  onEdit: (id: string) => void;
  onSave: (id: string, updates: Partial<Omit<PricingStep, 'id' | 'createdAt'>>) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export function PricingStepsPanel({
  steps, totalEstimate, contractValue,
  showAddStep, editingStepId,
  onShowAdd, onHideAdd, onAdd, onEdit, onSave, onCancelEdit, onDelete,
}: PricingStepsPanelProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Pricing Steps</span>
          {steps.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
              {steps.length}
            </span>
          )}
        </div>
        {!showAddStep && (
          <Button variant="ghost" size="sm" onClick={onShowAdd}>
            <Plus className="w-4 h-4 mr-1" />Add Step
          </Button>
        )}
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg space-y-1">
        {steps.length === 0 && !showAddStep && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">No pricing steps yet</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onShowAdd}>
              <Plus className="w-4 h-4 mr-1" />Add First Step
            </Button>
          </div>
        )}

        {steps.map(step => (
          <PricingStepRow
            key={step.id}
            step={step}
            isEditing={editingStepId === step.id}
            onEdit={() => onEdit(step.id)}
            onSave={updates => onSave(step.id, updates)}
            onCancel={onCancelEdit}
            onDelete={() => onDelete(step.id)}
          />
        ))}

        {showAddStep && <AddStepForm onAdd={onAdd} onCancel={onHideAdd} />}

        {steps.length > 0 && (
          <div className="flex justify-end pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-right space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Estimate</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ${totalEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {contractValue && totalEstimate > 0 && (
                <div className={`text-sm font-medium ${totalEstimate > contractValue ? 'text-red-500' : 'text-green-600'}`}>
                  Variance: {totalEstimate > contractValue ? '+' : ''}
                  ${(totalEstimate - contractValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}