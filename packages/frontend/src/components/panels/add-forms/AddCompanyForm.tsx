// ============================================================================
// AddCompanyForm Component
// Location: src/components/panels/add-forms/AddCompanyForm.tsx
// 
// Standalone form for creating companies.
// Can be used in ModalPanel for overlay creation or in CompaniesPage.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Building2, Phone, Globe, MapPin, Plus, Trash2 } from 'lucide-react';
import {
  Input,
  Textarea,
  AddressInput,
  MultiSelectUsers,
} from '@/components/common';
import { ModalPanel, ModalPanelFooter } from './ModalPanel';
import {
  useClientsStore,
  useToast,
  type Company,
} from '@/contexts';
import { formatPhoneNumber, validatePhone } from '@/utils/validation';

// ============================================================================
// Types
// ============================================================================

interface SecondaryAddress {
  id: string;
  label: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddCompanyFormData {
  name: string;
  phone: string;
  website: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  salesRepIds: string[];
  secondaryAddresses: SecondaryAddress[];
}

const initialFormData: AddCompanyFormData = {
  name: '',
  phone: '',
  website: '',
  street: '',
  suite: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
  salesRepIds: [],
  secondaryAddresses: [],
};

export interface AddCompanyFormProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when company is created successfully */
  onCreated?: (company: Company) => void;
  /** Pre-fill name */
  defaultName?: string;
  /** Stack level for z-index (default: 0) */
  stackLevel?: number;
}

// ============================================================================
// Component
// ============================================================================

export function AddCompanyForm({
  isOpen,
  onClose,
  onCreated,
  defaultName,
  stackLevel = 0,
}: AddCompanyFormProps) {
  const { addCompany, companies } = useClientsStore();
  const toast = useToast();

  const [formData, setFormData] = useState<AddCompanyFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  
  // Secondary address modal state
  const [showSecondaryModal, setShowSecondaryModal] = useState(false);
  const [secondaryLabel, setSecondaryLabel] = useState('');
  const [secondaryAddress, setSecondaryAddress] = useState({
    street: '', suite: '', city: '', state: '', zip: ''
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialFormData,
        name: defaultName || '',
      });
      setPhoneError('');
      setDuplicateWarning('');
      setShowSecondaryModal(false);
    }
  }, [isOpen, defaultName]);

  // Check for duplicate company names
  useEffect(() => {
    if (formData.name.trim()) {
      const normalizedName = formData.name.trim().toLowerCase();
      const duplicate = companies.find(c => 
        c.name.toLowerCase() === normalizedName
      );
      if (duplicate) {
        setDuplicateWarning(`A company named "${duplicate.name}" already exists`);
      } else {
        setDuplicateWarning('');
      }
    } else {
      setDuplicateWarning('');
    }
  }, [formData.name, companies]);

  // Update field helper
  const updateField = useCallback(<K extends keyof AddCompanyFormData>(field: K, value: AddCompanyFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle phone change with formatting
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    updateField('phone', formatted);
    
    if (formatted && !validatePhone(formatted)) {
      setPhoneError('Invalid phone number');
    } else {
      setPhoneError('');
    }
  };

  // Add secondary address
  const handleAddSecondaryAddress = () => {
    if (!secondaryLabel.trim()) {
      toast.error('Required', 'Please enter a label for the address');
      return;
    }
    if (!secondaryAddress.street.trim() && !secondaryAddress.city.trim()) {
      toast.error('Required', 'Please enter at least a street or city');
      return;
    }

    const newAddress: SecondaryAddress = {
      id: crypto.randomUUID(),
      label: secondaryLabel.trim(),
      ...secondaryAddress,
    };

    setFormData(prev => ({
      ...prev,
      secondaryAddresses: [...prev.secondaryAddresses, newAddress],
    }));

    // Reset and close modal
    setSecondaryLabel('');
    setSecondaryAddress({ street: '', suite: '', city: '', state: '', zip: '' });
    setShowSecondaryModal(false);
  };

  // Remove secondary address
  const handleRemoveSecondaryAddress = (id: string) => {
    setFormData(prev => ({
      ...prev,
      secondaryAddresses: prev.secondaryAddresses.filter(a => a.id !== id),
    }));
  };

  // Validate form
  const isValid = formData.name.trim() && !phoneError;

  // Handle save
  const handleSave = async () => {
    if (!isValid) {
      toast.error('Required Fields', 'Please fill in the company name');
      return;
    }

    setIsSaving(true);
    try {
      const newCompany = addCompany({
        name: formData.name.trim(),
        phone: formData.phone || '',
        website: formData.website || '',
        address: {
          street: formData.street || '',
          suite: formData.suite || '',
          city: formData.city || '',
          state: formData.state || '',
          zip: formData.zip || '',
        },
        addresses: formData.secondaryAddresses.map(addr => ({
          id: addr.id,
          label: addr.label,
          street: addr.street,
          suite: addr.suite,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
        })),
        notes: formData.notes || '',
        salesRepId: formData.salesRepIds[0] || undefined,
        salesRepIds: formData.salesRepIds,
      });

      toast.success('Company Created', `"${newCompany.name}" has been added`);
      onCreated?.(newCompany);
      onClose();
    } catch (error) {
      toast.error('Error', 'Failed to create company');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPanel
      isOpen={isOpen}
      onClose={() => {
        if (showSecondaryModal) return; // Don't close if sub-modal is open
        onClose();
      }}
      title="Add New Company"
      icon={<Building2 className="w-5 h-5" />}
      width={600}
      stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose}
          onSave={handleSave}
          saveText="Create Company"
          saveDisabled={!isValid}
          saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {/* Company Name */}
        <div>
          <Input
            label="Company Name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter company name..."
            leftIcon={<Building2 className="w-4 h-4" />}
            required
            autoFocus
          />
          {duplicateWarning && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ {duplicateWarning}
            </p>
          )}
        </div>

        {/* Sales Reps */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sales Reps
          </label>
          <MultiSelectUsers
            value={formData.salesRepIds}
            onChange={(ids) => updateField('salesRepIds', ids)}
            placeholder="Select sales reps..."
            activeOnly={false}
          />
        </div>

        {/* Phone and Website Row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
            leftIcon={<Phone className="w-4 h-4" />}
            error={phoneError}
          />
          <Input
            label="Website"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="www.example.com"
            leftIcon={<Globe className="w-4 h-4" />}
          />
        </div>

        {/* Main Office Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Main Office Address
          </label>
          <AddressInput
            street={formData.street}
            suite={formData.suite}
            city={formData.city}
            state={formData.state}
            zip={formData.zip}
            autoSave
            onSave={(address) => {
              setFormData(prev => ({
                ...prev,
                street: address.street || '',
                suite: address.suite || '',
                city: address.city || '',
                state: address.state || '',
                zip: address.zip || '',
              }));
            }}
          />
        </div>

        {/* Secondary Addresses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Additional Offices
            </label>
            <button
              type="button"
              onClick={() => setShowSecondaryModal(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Office
            </button>
          </div>

          {formData.secondaryAddresses.length > 0 ? (
            <div className="space-y-2">
              {formData.secondaryAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{addr.label}</span>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSecondaryAddress(addr.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No additional offices</p>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Add any notes about this company..."
          rows={3}
        />
      </div>

      {/* Secondary Address Sub-Modal */}
      {showSecondaryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSecondaryModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Add Additional Office
            </h3>
            <div className="space-y-4">
              <Input
                label="Label"
                value={secondaryLabel}
                onChange={(e) => setSecondaryLabel(e.target.value)}
                placeholder="e.g., Warehouse, Branch Office..."
                required
                autoFocus
              />
              <AddressInput
                street={secondaryAddress.street}
                suite={secondaryAddress.suite}
                city={secondaryAddress.city}
                state={secondaryAddress.state}
                zip={secondaryAddress.zip}
                autoSave
                onSave={(address) => setSecondaryAddress({
                  street: address.street,
                  suite: address.suite || '',
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowSecondaryModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSecondaryAddress}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Office
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPanel>
  );
}

export default AddCompanyForm;