// ============================================================================
// AddContractProjectForm
// Location: src/components/panels/add-forms/AddContractProjectForm.tsx
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileSignature, Building2, User, DollarSign, MapPin, Calendar, Target, TrendingUp, Tag } from 'lucide-react';
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
  type ContractProject,
} from '@/contexts';

export interface AddContractProjectFormData {
  name: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  contractType: string;
  status: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerName: string;
  linkedLeadId: string;
  linkedLeadName: string;
  linkedDealId: string;
  linkedDealName: string;
  jobsiteStreet: string;
  jobsiteSuite: string;
  jobsiteCity: string;
  jobsiteState: string;
  jobsiteZip: string;
  notes: string;
}

const INITIAL: AddContractProjectFormData = {
  name: '', companyId: '', companyName: '', contactId: '', contactName: '',
  contractType: 'fixed_price', status: '',
  contractValue: '', startDate: '', endDate: '',
  ownerId: '', ownerName: '',
  linkedLeadId: '', linkedLeadName: '', linkedDealId: '', linkedDealName: '',
  jobsiteStreet: '', jobsiteSuite: '', jobsiteCity: '', jobsiteState: '', jobsiteZip: '',
  notes: '',
};

const CONTRACT_TYPE_OPTIONS = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'retainer', label: 'Retainer' },
];

export interface AddContractProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (project: ContractProject) => void;
  defaultName?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
  defaultLinkedLeadId?: string;
  defaultLinkedLeadName?: string;
  defaultLinkedDealId?: string;
  defaultLinkedDealName?: string;
  stackLevel?: number;
  onAddCompany?: (searchTerm: string, callback: (c: { id: string; name: string }) => void) => void;
  onAddContact?: (searchTerm: string, companyId: string, companyName: string, callback: (c: { id: string; name: string }) => void) => void;
}

export function AddContractProjectForm({
  isOpen, onClose, onCreated,
  defaultName, defaultCompanyId, defaultCompanyName,
  defaultContactId, defaultContactName,
  defaultLinkedLeadId, defaultLinkedLeadName,
  defaultLinkedDealId, defaultLinkedDealName,
  stackLevel = 0, onAddCompany, onAddContact,
}: AddContractProjectFormProps) {
  const { createContractProject } = useEstimatingStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { leads, deals } = useSalesStore();
  const toast = useToast();
  const { estimateStatuses } = useFieldsStore();

  const [form, setForm] = useState<AddContractProjectFormData>(INITIAL);
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
        linkedLeadId: defaultLinkedLeadId || '',
        linkedLeadName: defaultLinkedLeadName || '',
        linkedDealId: defaultLinkedDealId || '',
        linkedDealName: defaultLinkedDealName || '',
      });
    }
  }, [isOpen, defaultName, defaultCompanyId, defaultCompanyName, defaultContactId, defaultContactName, defaultLinkedLeadId, defaultLinkedLeadName, defaultLinkedDealId, defaultLinkedDealName]);

  const update = useCallback(<K extends keyof AddContractProjectFormData>(k: K, v: AddContractProjectFormData[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  const userOptions = useMemo(() => users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })), [users]);
  const companyItems: EntitySearchItem[] = useMemo(() => companies.map(c => ({ id: c.id, name: c.name })), [companies]);
  const contactItems: EntitySearchItem[] = useMemo(() => {
    let list = contacts;
    if (form.companyId) list = contacts.filter(c => c.companyId === form.companyId);
    return list.map(c => ({
      id: c.id, name: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: !form.companyId ? companies.find(co => co.id === c.companyId)?.name : undefined,
    }));
  }, [contacts, companies, form.companyId]);

  const leadItems: EntitySearchItem[] = useMemo(() =>
    leads.filter(l => !l.convertedToDealId).map(l => ({ id: l.id, name: l.name, subtitle: l.companyName || 'Lead' })),
    [leads]);

  const dealItems: EntitySearchItem[] = useMemo(() =>
    deals.filter(d => !d.deletedAt && d.status === 'active').map(d => ({ id: d.id, name: d.name, subtitle: d.companyName || 'Deal' })),
    [deals]);

  const handleCompanyChange = (item: EntitySearchItem | null) => {
    setForm(prev => ({ ...prev, companyId: item?.id || '', companyName: item?.name || '', contactId: '', contactName: '' }));
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

  const handleLeadChange = (item: EntitySearchItem | null) => {
    setForm(prev => ({ ...prev, linkedLeadId: item?.id || '', linkedLeadName: item?.name || '' }));
    if (item && !form.companyId) {
      const lead = leads.find(l => l.id === item.id);
      if (lead?.companyId) setForm(prev => ({ ...prev, companyId: lead.companyId!, companyName: lead.companyName || '' }));
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
      const project = createContractProject({
        name: form.name.trim(),
        companyId: form.companyId || undefined,
        companyName: form.companyName || undefined,
        contactId: form.contactId || undefined,
        contactName: form.contactName || undefined,
        contractType: form.contractType as never,
        status: form.status as never,
        contractValue: form.contractValue ? parseFloat(form.contractValue) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        ownerId: form.ownerId || undefined,
        ownerName: form.ownerName || undefined,
        linkedLeadId: form.linkedLeadId || undefined,
        linkedLeadName: form.linkedLeadName || undefined,
        linkedDealId: form.linkedDealId || undefined,
        linkedDealName: form.linkedDealName || undefined,
        jobsiteAddress: (form.jobsiteStreet || form.jobsiteCity) ? {
          street: form.jobsiteStreet, suite: form.jobsiteSuite,
          city: form.jobsiteCity, state: form.jobsiteState, zip: form.jobsiteZip,
        } : undefined,
        notes: form.notes || undefined,
      });
      toast.success('Project Created', `"${project.name}" has been added`);
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
      title="New Contract Project"
      icon={<FileSignature className="w-5 h-5" />}
      width={650} stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose} onSave={handleSave}
          saveText="Create Project" saveDisabled={!isValid} saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        <Input label="Project Name" required
          value={form.name} onChange={e => update('name', e.target.value)}
          placeholder="e.g. Annual Maintenance Contract – Westfield"
          leftIcon={<FileSignature className="w-4 h-4" />}
        />

        {/* Contract Type & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Contract Type
            </label>
            <SelectFilter label="Select type" value={form.contractType} onChange={v => update('contractType', v)}
              options={CONTRACT_TYPE_OPTIONS} showAllOption={false} icon={Tag} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <SelectFilter label="Select status" value={form.status} onChange={v => update('status', v)}
              options={[...estimateStatuses].sort((a, b) => a.order - b.order).map(s => ({ value: s.id, label: s.name }))} showAllOption={false} className="w-full" />
          </div>
        </div>

        {/* Company & Contact */}
        <div className="grid grid-cols-2 gap-3">
          <EntitySearchDropdown label="Company" icon={Building2}
            value={form.companyId ? { id: form.companyId, name: form.companyName } : null}
            onChange={handleCompanyChange} items={companyItems} placeholder="Search companies…"
            allowCreate={!!onAddCompany}
            onCreateNew={t => onAddCompany?.(t, c => setForm(p => ({ ...p, companyId: c.id, companyName: c.name })))}
            createLabel="Add new company"
          />
          <EntitySearchDropdown label="Contact" icon={User}
            value={form.contactId ? { id: form.contactId, name: form.contactName } : null}
            onChange={handleContactChange} items={contactItems} placeholder="Search contacts…"
            labelSuffix={form.companyId ? '(filtered)' : undefined}
            allowCreate={!!onAddContact && !!form.companyId}
            onCreateNew={t => onAddContact?.(t, form.companyId, form.companyName, c => setForm(p => ({ ...p, contactId: c.id, contactName: c.name })))}
            createLabel="Add new contact"
          />
        </div>

        {/* Owner & Contract Value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
            <SelectFilter label="Select owner" value={form.ownerId} onChange={handleOwnerChange}
              options={userOptions} showAllOption={false} icon={User} className="w-full" />
          </div>
          <Input label="Contract Value" type="number" value={form.contractValue}
            onChange={e => update('contractValue', e.target.value)} placeholder="0"
            leftIcon={<DollarSign className="w-4 h-4" />} />
        </div>

        {/* Start & End Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={form.startDate}
            onChange={e => update('startDate', e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />} />
          <Input label="End Date" type="date" value={form.endDate}
            onChange={e => update('endDate', e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />} />
        </div>

        {/* Sales Links */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Link to Sales Pipeline
          </label>
          <div className="grid grid-cols-2 gap-3">
            <EntitySearchDropdown label="Linked Lead" icon={Target}
              value={form.linkedLeadId ? { id: form.linkedLeadId, name: form.linkedLeadName } : null}
              onChange={handleLeadChange} items={leadItems} placeholder="Search leads…" />
            <EntitySearchDropdown label="Linked Deal" icon={TrendingUp}
              value={form.linkedDealId ? { id: form.linkedDealId, name: form.linkedDealName } : null}
              onChange={handleDealChange} items={dealItems} placeholder="Search deals…" />
          </div>
        </div>

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
              ...prev, jobsiteStreet: addr.street || '', jobsiteSuite: addr.suite || '',
              jobsiteCity: addr.city || '', jobsiteState: addr.state || '', jobsiteZip: addr.zip || '',
            }))}
          />
        </div>

        <Textarea label="Notes" value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Contract terms, scope, special conditions…" rows={3} />
      </div>
    </ModalPanel>
  );
}

export default AddContractProjectForm;