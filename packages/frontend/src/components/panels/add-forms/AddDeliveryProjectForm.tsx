// ============================================================================
// AddDeliveryProjectForm
// Location: src/components/panels/add-forms/AddDeliveryProjectForm.tsx
//
// Slide-panel form for creating delivery project estimates.
// Matches the AddLeadForm / AddDealForm pattern exactly.
// Supports pre-filling from a linked lead or deal.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, Building2, User, DollarSign, MapPin, Calendar, TrendingUp } from 'lucide-react';
import {
  Input,
  Textarea,
  SelectFilter,
  EntitySearchDropdown,
  AddressInput,
  type EntitySearchItem,
} from '@/components/common';
import { ModalPanel, ModalPanelFooter } from './ModalPanel';
import {
  useEstimatingStore,
  useUsersStore,
  useClientsStore,
  useSalesStore,
  useToast,
  useFieldsStore,
  type DeliveryProject,
} from '@/contexts';
import { useTaskStore } from '@/contexts/taskStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddDeliveryProjectFormData {
  name: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  status: string;
  value: string;
  deliveryDate: string;
  ownerId: string;
  ownerName: string;
  linkedDealId: string;
  linkedDealName: string;
  jobsiteStreet: string;
  jobsiteSuite: string;
  jobsiteCity: string;
  jobsiteState: string;
  jobsiteZip: string;
  notes: string;
}

const INITIAL: AddDeliveryProjectFormData = {
  name: '', companyId: '', companyName: '', contactId: '', contactName: '',
  status: '', value: '', deliveryDate: '',
  ownerId: '', ownerName: '',
  linkedDealId: '', linkedDealName: '',
  jobsiteStreet: '', jobsiteSuite: '', jobsiteCity: '', jobsiteState: '', jobsiteZip: '',
  notes: '',
};

export interface AddDeliveryProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (project: DeliveryProject) => void;
  /** Pre-fill defaults */
  defaultName?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
  defaultLinkedDealId?: string;
  defaultLinkedDealName?: string;
  stackLevel?: number;
  onAddCompany?: (searchTerm: string, callback: (c: { id: string; name: string }) => void) => void;
  onAddContact?: (searchTerm: string, companyId: string, companyName: string, callback: (c: { id: string; name: string }) => void) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddDeliveryProjectForm({
  isOpen, onClose, onCreated,
  defaultName, defaultCompanyId, defaultCompanyName,
  defaultContactId, defaultContactName,
  defaultLinkedDealId, defaultLinkedDealName,
  stackLevel = 0, onAddCompany, onAddContact,
}: AddDeliveryProjectFormProps) {
  const { createDeliveryProject } = useEstimatingStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { deals } = useSalesStore();
  const { estimateStatuses } = useFieldsStore();
  const { createTask } = useTaskStore();
  const toast = useToast();

  const [form, setForm] = useState<AddDeliveryProjectFormData>(INITIAL);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL,
        name: defaultName || '',
        companyId: defaultCompanyId || '',
        companyName: defaultCompanyName || '',
        contactId: defaultContactId || '',
        contactName: defaultContactName || '',
        linkedDealId: defaultLinkedDealId || '',
        linkedDealName: defaultLinkedDealName || '',
      });
    }
  }, [isOpen, defaultName, defaultCompanyId, defaultCompanyName, defaultContactId, defaultContactName, defaultLinkedDealId, defaultLinkedDealName]);

  const update = useCallback(<K extends keyof AddDeliveryProjectFormData>(k: K, v: AddDeliveryProjectFormData[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  // Options
  const userOptions = useMemo(() => users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })), [users]);
  const companyItems: EntitySearchItem[] = useMemo(() => companies.map(c => ({ id: c.id, name: c.name })), [companies]);
  const contactItems: EntitySearchItem[] = useMemo(() => {
    let list = contacts;
    if (form.companyId) list = contacts.filter(c => c.companyId === form.companyId);
    return list.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: !form.companyId ? companies.find(co => co.id === c.companyId)?.name : undefined,
    }));
  }, [contacts, companies, form.companyId]);

  const dealItems: EntitySearchItem[] = useMemo(() =>
    deals.filter(d => !d.deletedAt && d.status === 'active').map(d => ({
      id: d.id, name: d.name, subtitle: d.companyName || 'Deal',
    })), [deals]);

  // Handlers
  const handleCompanyChange = (item: EntitySearchItem | null) => {
    setForm(prev => ({ ...prev,
      companyId: item?.id || '', companyName: item?.name || '',
      contactId: '', contactName: '',
    }));
  };

  const handleContactChange = (item: EntitySearchItem | null) => {
    setForm(prev => ({ ...prev, contactId: item?.id || '', contactName: item?.name || '' }));
    if (item && !form.companyId) {
      const contact = contacts.find(c => c.id === item.id);
      if (contact) {
        const company = companies.find(c => c.id === contact.companyId);
        if (company) setForm(prev => ({ ...prev, companyId: company.id, companyName: company.name }));
      }
    }
  };

  const handleDealChange = (item: EntitySearchItem | null) => {
    setForm(prev => ({ ...prev, linkedDealId: item?.id || '', linkedDealName: item?.name || '' }));
    if (item && !form.companyId) {
      const deal = deals.find(d => d.id === item.id);
      if (deal?.companyId) setForm(prev => ({ ...prev, companyId: deal.companyId!, companyName: deal.companyName || '' }));
    }
  };

  const handleOwnerChange = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    setForm(prev => ({ ...prev, ownerId, ownerName: owner?.name || '' }));
  };

  const isValid = form.name.trim() !== '';

  const handleSave = async () => {
    if (!isValid) { toast.error('Required Fields', 'Please enter a project name'); return; }
    setIsSaving(true);
    try {
      const project = createDeliveryProject({
        name: form.name.trim(),
        companyId: form.companyId || undefined,
        companyName: form.companyName || undefined,
        contactId: form.contactId || undefined,
        contactName: form.contactName || undefined,
        status: (form.status as never) || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        deliveryDate: form.deliveryDate || undefined,
        ownerId: form.ownerId || undefined,
        ownerName: form.ownerName || undefined,
        linkedDealId: form.linkedDealId || undefined,
        linkedDealName: form.linkedDealName || undefined,
        jobsiteAddress: (form.jobsiteStreet || form.jobsiteCity) ? {
          street: form.jobsiteStreet,
          suite: form.jobsiteSuite,
          city: form.jobsiteCity,
          state: form.jobsiteState,
          zip: form.jobsiteZip,
        } : undefined,
        notes: form.notes || undefined,
      });
      toast.success('Project Created', `"${project.name}" has been added`);

      // Auto-create a due-date task if a date was set
      if (form.deliveryDate && form.ownerId) {
        try {
          await createTask({
            title: `Estimate Due: ${project.name}`,
            dueDate: form.deliveryDate,
            assignedUserId: form.ownerId,
            assignedUserName: form.ownerName || '',
            linkedItem: { type: 'estimate', id: project.id, name: project.name },
          });
        } catch {
          // Non-fatal — project was still created
        }
      }

      onCreated?.(project);
      onClose();
    } catch {
      toast.error('Error', 'Failed to create project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPanel
      isOpen={isOpen} onClose={onClose}
      title="New Delivery Project"
      icon={<Truck className="w-5 h-5" />}
      width={650} stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose} onSave={handleSave}
          saveText="Create Project" saveDisabled={!isValid} saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {/* Project Name */}
        <Input
          label="Project Name" required
          value={form.name} onChange={e => update('name', e.target.value)}
          placeholder="e.g. CBD Office Fitout – Level 4"
          leftIcon={<Truck className="w-4 h-4" />}
        />

        {/* Status & Value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <SelectFilter label="Select status" value={form.status} onChange={v => update('status', v)}
              options={[...estimateStatuses].sort((a, b) => a.order - b.order).map(s => ({ value: s.id, label: s.name }))} showAllOption={false} className="w-full" />
          </div>
          <Input label="Estimate Value" type="number" value={form.value}
            onChange={e => update('value', e.target.value)} placeholder="0"
            leftIcon={<DollarSign className="w-4 h-4" />} />
        </div>

        {/* Company & Contact */}
        <div className="grid grid-cols-2 gap-3">
          <EntitySearchDropdown
            label="Company" icon={Building2}
            value={form.companyId ? { id: form.companyId, name: form.companyName } : null}
            onChange={handleCompanyChange} items={companyItems}
            placeholder="Search companies…"
            allowCreate={!!onAddCompany}
            onCreateNew={t => onAddCompany?.(t, c => setForm(p => ({ ...p, companyId: c.id, companyName: c.name })))}
            createLabel="Add new company"
          />
          <EntitySearchDropdown
            label="Contact" icon={User}
            value={form.contactId ? { id: form.contactId, name: form.contactName } : null}
            onChange={handleContactChange} items={contactItems}
            placeholder="Search contacts…"
            labelSuffix={form.companyId ? '(filtered)' : undefined}
            allowCreate={!!onAddContact && !!form.companyId}
            onCreateNew={t => onAddContact?.(t, form.companyId, form.companyName, c => setForm(p => ({ ...p, contactId: c.id, contactName: c.name })))}
            createLabel="Add new contact"
          />
        </div>

        {/* Owner & Delivery Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
            <SelectFilter label="Select owner" value={form.ownerId} onChange={handleOwnerChange}
              options={userOptions} showAllOption={false} icon={User} className="w-full" />
          </div>
          <Input label="Due Date" type="date" value={form.deliveryDate}
            onChange={e => update('deliveryDate', e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />} />
        </div>

        {/* Sales Links */}
        <EntitySearchDropdown
          label="Linked Deal" icon={TrendingUp}
          value={form.linkedDealId ? { id: form.linkedDealId, name: form.linkedDealName } : null}
          onChange={handleDealChange} items={dealItems}
          placeholder="Search deals…"
        />

        {/* Jobsite Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />Jobsite Address</span>
          </label>
          <AddressInput
            street={form.jobsiteStreet} suite={form.jobsiteSuite}
            city={form.jobsiteCity} state={form.jobsiteState} zip={form.jobsiteZip}
            autoSave
            onSave={addr => setForm(prev => ({
              ...prev, jobsiteStreet: addr.street || '',
              jobsiteSuite: addr.suite || '', jobsiteCity: addr.city || '',
              jobsiteState: addr.state || '', jobsiteZip: addr.zip || '',
            }))}
          />
        </div>

        {/* Notes */}
        <Textarea label="Notes" value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Scope notes, inclusions, exclusions…" rows={3} />
      </div>
    </ModalPanel>
  );
}

export default AddDeliveryProjectForm;