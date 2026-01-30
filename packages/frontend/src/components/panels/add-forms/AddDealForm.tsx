// ============================================================================
// AddDealForm Component
// Location: src/components/panels/add-forms/AddDealForm.tsx
// 
// Standalone form for creating/editing deals.
// Can be used in ModalPanel for overlay creation or in DealsPage.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Building2, User, DollarSign, MapPin, Megaphone } from 'lucide-react';
import {
  Input,
  Textarea,
  SelectFilter,
  EntitySearchDropdown,
  AddressInput,
  DatePicker,
  type EntitySearchItem,
} from '@/components/common';
import { ModalPanel, ModalPanelFooter } from './ModalPanel';
import {
  useSalesStore,
  useFieldsStore,
  useUsersStore,
  useClientsStore,
  useToast,
  type Deal,
} from '@/contexts';

// ============================================================================
// Types
// ============================================================================

export interface AddDealFormData {
  name: string;
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
  stage: string;
  label: string;
  source: string;
  ownerId: string;
  ownerName: string;
  value: string;
  commission: string;
  units: string;
  expectedCloseDate: string;
  notes: string;
  jobsiteStreet: string;
  jobsiteSuite: string;
  jobsiteCity: string;
  jobsiteState: string;
  jobsiteZip: string;
}

const initialFormData: AddDealFormData = {
  name: '',
  companyId: '',
  companyName: '',
  contactId: '',
  contactName: '',
  stage: '',
  label: '',
  source: '',
  ownerId: '',
  ownerName: '',
  value: '',
  commission: '',
  units: '',
  expectedCloseDate: '',
  notes: '',
  jobsiteStreet: '',
  jobsiteSuite: '',
  jobsiteCity: '',
  jobsiteState: '',
  jobsiteZip: '',
};

export interface AddDealFormProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when deal is created successfully */
  onCreated?: (deal: Deal) => void;
  /** Pre-fill company */
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  /** Pre-fill contact */
  defaultContactId?: string;
  defaultContactName?: string;
  /** Pre-fill name */
  defaultName?: string;
  /** Pre-fill stage */
  defaultStage?: string;
  /** Stack level for z-index (default: 0) */
  stackLevel?: number;
  /** Callback to open AddCompanyForm */
  onAddCompany?: (searchTerm: string, callback: (company: { id: string; name: string }) => void) => void;
  /** Callback to open AddContactForm */
  onAddContact?: (searchTerm: string, companyId: string, companyName: string, callback: (contact: { id: string; name: string }) => void) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AddDealForm({
  isOpen,
  onClose,
  onCreated,
  defaultCompanyId,
  defaultCompanyName,
  defaultContactId,
  defaultContactName,
  defaultName,
  defaultStage,
  stackLevel = 0,
  onAddCompany,
  onAddContact,
}: AddDealFormProps) {
  const { createDeal } = useSalesStore();
  const { dealStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const toast = useToast();

  const [formData, setFormData] = useState<AddDealFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultOwner = users.find(u => u.isActive) || users[0];
      setFormData({
        ...initialFormData,
        name: defaultName || '',
        companyId: defaultCompanyId || '',
        companyName: defaultCompanyName || '',
        contactId: defaultContactId || '',
        contactName: defaultContactName || '',
        stage: defaultStage || dealStages[0]?.name || '',
        ownerId: defaultOwner?.id || '',
        ownerName: defaultOwner?.name || '',
      });
    }
  }, [isOpen, defaultName, defaultCompanyId, defaultCompanyName, defaultContactId, defaultContactName, defaultStage, dealStages, users]);

  // Update field helper
  const updateField = useCallback(<K extends keyof AddDealFormData>(field: K, value: AddDealFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Options for select fields
  const stageOptions = useMemo(() => 
    dealStages.map(s => ({ value: s.name, label: s.name })),
    [dealStages]
  );

  const labelOptions = useMemo(() => 
    leadLabels.map(l => ({ value: l.name, label: l.name })),
    [leadLabels]
  );

  const sourceOptions = useMemo(() => 
    leadSources.map(s => ({ value: s.name, label: s.name })),
    [leadSources]
  );

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
    }));
  }, [contacts, companies, formData.companyId]);

  // Handle company change
  const handleCompanyChange = (item: EntitySearchItem | null) => {
    if (item) {
      setFormData(prev => ({
        ...prev,
        companyId: item.id,
        companyName: item.name,
        contactId: '',
        contactName: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        companyId: '',
        companyName: '',
        contactId: '',
        contactName: '',
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
      if (!formData.companyId) {
        const contact = contacts.find(c => c.id === item.id);
        if (contact) {
          const company = companies.find(c => c.id === contact.companyId);
          if (company) {
            setFormData(prev => ({
              ...prev,
              companyId: company.id,
              companyName: company.name,
            }));
          }
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

  // Handle owner change
  const handleOwnerChange = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    setFormData(prev => ({
      ...prev,
      ownerId,
      ownerName: owner?.name || '',
    }));
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

  // Validate form
  const isValid = formData.name.trim() && formData.stage && formData.ownerId;

  // Handle save
  const handleSave = async () => {
    if (!isValid) {
      toast.error('Required Fields', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const newDeal = createDeal({
        name: formData.name.trim(),
        companyId: formData.companyId || undefined,
        companyName: formData.companyName || undefined,
        contactId: formData.contactId || undefined,
        contactName: formData.contactName || undefined,
        stage: formData.stage,
        label: formData.label || undefined,
        source: formData.source || undefined,
        ownerId: formData.ownerId,
        ownerName: formData.ownerName,
        value: formData.value ? parseFloat(formData.value) : undefined,
        commission: formData.commission ? parseFloat(formData.commission) : undefined,
        units: formData.units ? parseInt(formData.units, 10) : undefined,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        notes: formData.notes || undefined,
        jobsiteAddress: (formData.jobsiteStreet || formData.jobsiteCity) ? {
          street: formData.jobsiteStreet,
          suite: formData.jobsiteSuite,
          city: formData.jobsiteCity,
          state: formData.jobsiteState,
          zip: formData.jobsiteZip,
        } : undefined,
      });

      toast.success('Deal Created', `"${newDeal.name}" has been added`);
      onCreated?.(newDeal);
      onClose();
    } catch (error) {
      toast.error('Error', 'Failed to create deal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Deal"
      icon={<TrendingUp className="w-5 h-5" />}
      width={650}
      stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose}
          onSave={handleSave}
          saveText="Create Deal"
          saveDisabled={!isValid}
          saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {/* Deal Name */}
        <Input
          label="Deal Name"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., ABC Construction - Main Street Project"
          leftIcon={<TrendingUp className="w-4 h-4" />}
          required
        />

        {/* Stage and Label Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Stage <span className="text-red-500">*</span>
            </label>
            <SelectFilter
              label="Select stage"
              value={formData.stage}
              onChange={(value) => updateField('stage', value)}
              options={stageOptions}
              showAllOption={false}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Label
            </label>
            <SelectFilter
              label="Select label"
              value={formData.label}
              onChange={(value) => updateField('label', value)}
              options={labelOptions}
              allLabel="No label"
              className="w-full"
            />
          </div>
        </div>

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

        {/* Owner and Source Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Owner <span className="text-red-500">*</span>
            </label>
            <SelectFilter
              label="Select owner"
              value={formData.ownerId}
              onChange={handleOwnerChange}
              options={userOptions}
              showAllOption={false}
              icon={User}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Source
            </label>
            <SelectFilter
              label="Select source"
              value={formData.source}
              onChange={(value) => updateField('source', value)}
              options={sourceOptions}
              allLabel="No source"
              icon={Megaphone}
              className="w-full"
            />
          </div>
        </div>

        {/* Value, Commission, Units Row */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Deal Value"
            type="number"
            value={formData.value}
            onChange={(e) => updateField('value', e.target.value)}
            placeholder="0"
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
          <Input
            label="Commission"
            type="number"
            value={formData.commission}
            onChange={(e) => updateField('commission', e.target.value)}
            placeholder="0"
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
          <Input
            label="Units"
            type="number"
            value={formData.units}
            onChange={(e) => updateField('units', e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Expected Close Date */}
        <DatePicker
          label="Expected Close Date"
          value={formData.expectedCloseDate}
          onChange={(value) => updateField('expectedCloseDate', value)}
        />

        {/* Jobsite Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Jobsite Address
            </span>
          </label>
          <AddressInput
            street={formData.jobsiteStreet}
            suite={formData.jobsiteSuite}
            city={formData.jobsiteCity}
            state={formData.jobsiteState}
            zip={formData.jobsiteZip}
            autoSave
            onSave={(address) => {
              setFormData(prev => ({
                ...prev,
                jobsiteStreet: address.street || '',
                jobsiteSuite: address.suite || '',
                jobsiteCity: address.city || '',
                jobsiteState: address.state || '',
                jobsiteZip: address.zip || '',
              }));
            }}
          />
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Add any notes about this deal..."
          rows={3}
        />
      </div>
    </ModalPanel>
  );
}

export default AddDealForm;