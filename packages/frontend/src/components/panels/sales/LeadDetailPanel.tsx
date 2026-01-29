// ============================================================================
// LeadDetailPanel Component
// Location: src/components/panels/sales/LeadDetailPanel.tsx
// 
// Slide-over panel for creating and editing leads.
// Follows TaskDetailPanel pattern with company/contact linking.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  X,
  Target,
  Building2,
  User,
  MapPin,
  DollarSign,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  SelectFilter,
  UnsavedChangesModal,
  EntitySearchDropdown,
  type EntitySearchItem,
} from '@/components/common';
import {
  useClientsStore,
  useUsersStore,
  useFieldsStore,
  useToast,
  type Lead,
  type LeadInput,
  type JobsiteAddress,
} from '@/contexts';

// ============================================================================
// Types
// ============================================================================

interface LeadDetailPanelProps {
  /** Lead to edit (null for new lead) */
  lead: Lead | null;
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (data: LeadInput) => Promise<void>;
  /** Delete handler */
  onDelete?: (leadId: string) => Promise<void>;
  /** Convert to deal handler */
  onConvert?: (leadId: string) => void;
  /** Default stage for new leads */
  defaultStage?: string;
  /** Pre-selected company */
  defaultCompanyId?: string;
  /** Pre-selected contact */
  defaultContactId?: string;
}

interface FormData {
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
  notes: string;
  jobsiteStreet: string;
  jobsiteSuite: string;
  jobsiteCity: string;
  jobsiteState: string;
  jobsiteZip: string;
}

// ============================================================================
// Component
// ============================================================================

export function LeadDetailPanel({
  lead,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConvert,
  defaultStage,
  defaultCompanyId,
  defaultContactId,
}: LeadDetailPanelProps) {
  const { companies, contacts } = useClientsStore();
  const { users } = useUsersStore();
  const { leadStages, leadLabels, leadSources } = useFieldsStore();
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    companyId: '',
    companyName: '',
    contactId: '',
    contactName: '',
    stage: defaultStage || leadStages[0]?.name || '',
    label: '',
    source: '',
    ownerId: '',
    ownerName: '',
    value: '',
    notes: '',
    jobsiteStreet: '',
    jobsiteSuite: '',
    jobsiteCity: '',
    jobsiteState: '',
    jobsiteZip: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when lead changes or panel opens
  useEffect(() => {
    if (isOpen) {
      if (lead) {
        setFormData({
          name: lead.name,
          companyId: lead.companyId || '',
          companyName: lead.companyName || '',
          contactId: lead.contactId || '',
          contactName: lead.contactName || '',
          stage: lead.stage,
          label: lead.label || '',
          source: lead.source || '',
          ownerId: lead.ownerId,
          ownerName: lead.ownerName,
          value: lead.value?.toString() || '',
          notes: lead.notes || '',
          jobsiteStreet: lead.jobsiteAddress?.street || '',
          jobsiteSuite: lead.jobsiteAddress?.suite || '',
          jobsiteCity: lead.jobsiteAddress?.city || '',
          jobsiteState: lead.jobsiteAddress?.state || '',
          jobsiteZip: lead.jobsiteAddress?.zip || '',
        });
      } else {
        // New lead - set defaults
        const defaultCompany = defaultCompanyId ? companies.find(c => c.id === defaultCompanyId) : null;
        const defaultContact = defaultContactId ? contacts.find(c => c.id === defaultContactId) : null;
        
        setFormData({
          name: '',
          companyId: defaultCompanyId || '',
          companyName: defaultCompany?.name || '',
          contactId: defaultContactId || '',
          contactName: defaultContact ? `${defaultContact.firstName} ${defaultContact.lastName}` : '',
          stage: defaultStage || leadStages[0]?.name || '',
          label: leadLabels[0]?.name || '',
          source: '',
          ownerId: '',
          ownerName: '',
          value: '',
          notes: '',
          jobsiteStreet: '',
          jobsiteSuite: '',
          jobsiteCity: '',
          jobsiteState: '',
          jobsiteZip: '',
        });
      }
      setHasChanges(false);
    }
  }, [isOpen, lead, defaultStage, defaultCompanyId, defaultContactId, companies, contacts, leadStages, leadLabels]);

  // Track changes
  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Company items for dropdown
  const companyItems: EntitySearchItem[] = useMemo(() =>
    companies.map(c => ({ id: c.id, name: c.name })),
    [companies]
  );

  // Contact items filtered by selected company
  const contactItems: EntitySearchItem[] = useMemo(() => {
    let filtered = contacts;
    if (formData.companyId) {
      filtered = contacts.filter(c => c.companyId === formData.companyId);
    }
    return filtered.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      subtitle: c.role || undefined,
    }));
  }, [contacts, formData.companyId]);

  // User items for owner dropdown - SelectFilter format
  const userOptions = useMemo(() => 
    users
      .filter(u => u.isActive)
      .map(u => ({ value: u.id, label: u.name })),
  [users]);

  // Stage options - SelectFilter format
  const stageOptions = useMemo(() => 
    leadStages.map(s => ({ value: s.name, label: s.name })),
  [leadStages]);

  // Label options - SelectFilter format
  const labelOptions = useMemo(() => 
    leadLabels.map(l => ({ value: l.name, label: l.name })),
  [leadLabels]);

  // Source options - SelectFilter format
  const sourceOptions = useMemo(() => 
    leadSources.map(s => ({ value: s.name, label: s.name })),
  [leadSources]);

  // Handle company selection
  const handleCompanyChange = useCallback((item: EntitySearchItem | null) => {
    if (item) {
      updateField('companyId', item.id);
      updateField('companyName', item.name);
      // Clear contact if it doesn't belong to the new company
      const contact = contacts.find(c => c.id === formData.contactId);
      if (contact && contact.companyId !== item.id) {
        updateField('contactId', '');
        updateField('contactName', '');
      }
    } else {
      updateField('companyId', '');
      updateField('companyName', '');
    }
  }, [contacts, formData.contactId, updateField]);

  // Handle contact selection
  const handleContactChange = useCallback((item: EntitySearchItem | null) => {
    if (item) {
      updateField('contactId', item.id);
      updateField('contactName', item.name);
      // Auto-select company if contact has one
      const contact = contacts.find(c => c.id === item.id);
      if (contact?.companyId && !formData.companyId) {
        const company = companies.find(c => c.id === contact.companyId);
        if (company) {
          updateField('companyId', company.id);
          updateField('companyName', company.name);
        }
      }
    } else {
      updateField('contactId', '');
      updateField('contactName', '');
    }
  }, [contacts, companies, formData.companyId, updateField]);

  // Handle owner change
  const handleOwnerChange = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    updateField('ownerId', userId);
    updateField('ownerName', user?.name || '');
  }, [users, updateField]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Error', 'Lead name is required');
      return;
    }
    if (!formData.stage) {
      toast.error('Error', 'Stage is required');
      return;
    }
    if (!formData.ownerId) {
      toast.error('Error', 'Owner is required');
      return;
    }

    setIsSaving(true);
    try {
      const jobsiteAddress: JobsiteAddress | undefined = formData.jobsiteStreet ? {
        street: formData.jobsiteStreet,
        suite: formData.jobsiteSuite || undefined,
        city: formData.jobsiteCity,
        state: formData.jobsiteState,
        zip: formData.jobsiteZip,
      } : undefined;

      const input: LeadInput = {
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
        notes: formData.notes || undefined,
        jobsiteAddress,
      };
      await onSave(input);
      setHasChanges(false);
      onClose();
    } catch (err) {
      toast.error('Error', 'Failed to save lead');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!lead || !onDelete) return;
    try {
      await onDelete(lead.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      toast.error('Error', 'Failed to delete lead');
    }
  };

  // Handle convert to deal
  const handleConvert = () => {
    if (!lead || !onConvert) return;
    onConvert(lead.id);
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  const isEditing = !!lead;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-full max-w-lg',
          'bg-white dark:bg-slate-800',
          'border-l border-slate-200 dark:border-slate-700',
          'shadow-xl z-50',
          'flex flex-col',
          'animate-slide-in-right'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Lead' : 'New Lead'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Lead Name */}
          <Input
            label="Lead Name *"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., ABC Construction - Main Street Project"
            leftIcon={<Target className="w-4 h-4" />}
          />

          {/* Stage and Label Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Stage <span className="text-danger-500">*</span>
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

          {/* Company and Contact */}
          <EntitySearchDropdown
            label="Company"
            value={formData.companyId ? { id: formData.companyId, name: formData.companyName } : null}
            onChange={handleCompanyChange}
            items={companyItems}
            placeholder="Search companies..."
            icon={Building2}
          />

          <EntitySearchDropdown
            label="Contact"
            value={formData.contactId ? { id: formData.contactId, name: formData.contactName } : null}
            onChange={handleContactChange}
            items={contactItems}
            placeholder="Search contacts..."
            icon={User}
            labelSuffix={formData.companyId ? '(filtered by company)' : undefined}
          />

          {/* Owner and Source Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Owner <span className="text-danger-500">*</span>
              </label>
              <SelectFilter
                label="Select owner"
                value={formData.ownerId}
                onChange={(value) => handleOwnerChange(value)}
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
                className="w-full"
              />
            </div>
          </div>

          {/* Value */}
          <Input
            label="Value"
            type="number"
            value={formData.value}
            onChange={(e) => updateField('value', e.target.value)}
            placeholder="0.00"
            leftIcon={<DollarSign className="w-4 h-4" />}
          />

          {/* Jobsite Address - Simple fields */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Jobsite Address
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <Input
                  placeholder="Street address"
                  value={formData.jobsiteStreet}
                  onChange={(e) => updateField('jobsiteStreet', e.target.value)}
                />
              </div>
              <Input
                placeholder="Suite"
                value={formData.jobsiteSuite}
                onChange={(e) => updateField('jobsiteSuite', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={formData.jobsiteCity}
                onChange={(e) => updateField('jobsiteCity', e.target.value)}
              />
              <Input
                placeholder="State"
                value={formData.jobsiteState}
                onChange={(e) => updateField('jobsiteState', e.target.value)}
              />
              <Input
                placeholder="ZIP"
                value={formData.jobsiteZip}
                onChange={(e) => updateField('jobsiteZip', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Add notes about this lead..."
            rows={3}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {isEditing && onConvert && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConvert}
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Convert to Deal
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Lead'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onCancel={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          setHasChanges(false);
          onClose();
        }}
        onSave={handleSave}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Delete Lead?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to delete "{lead?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default LeadDetailPanel;