// ============================================================================
// AddContactForm Component
// Location: src/components/panels/add-forms/AddContactForm.tsx
// 
// Standalone form for creating contacts.
// Can be used in ModalPanel for overlay creation or in ContactsPage.
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Building2, Mail, Phone, Smartphone, Plus, Trash2, Printer } from 'lucide-react';
import {
  Input,
  Textarea,
  Select,
  EntitySearchDropdown,
  type EntitySearchItem,
} from '@/components/common';
import { ModalPanel, ModalPanelFooter } from './ModalPanel';
import {
  useClientsStore,
  useFieldsStore,
  useToast,
  type Contact,
  type ContactRole,
} from '@/contexts';
import { formatPhoneNumber, validatePhone, validateEmail } from '@/utils/validation';

// ============================================================================
// Types
// ============================================================================

interface AdditionalContactMethod {
  id: string;
  type: 'phone' | 'fax' | 'email';
  label: string;
  value: string;
}

export interface AddContactFormData {
  firstName: string;
  lastName: string;
  companyId: string;
  companyName: string;
  email: string;
  phoneOffice: string;
  phoneMobile: string;
  role: ContactRole | '';
  notes: string;
  additionalContacts: AdditionalContactMethod[];
}

const initialFormData: AddContactFormData = {
  firstName: '',
  lastName: '',
  companyId: '',
  companyName: '',
  email: '',
  phoneOffice: '',
  phoneMobile: '',
  role: '',
  notes: '',
  additionalContacts: [],
};

export interface AddContactFormProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when contact is created successfully */
  onCreated?: (contact: Contact) => void;
  /** Pre-fill name (will be split into first/last) */
  defaultName?: string;
  /** Pre-fill company */
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  /** Stack level for z-index (default: 0) */
  stackLevel?: number;
  /** Callback to open AddCompanyForm */
  onAddCompany?: (searchTerm: string, callback: (company: { id: string; name: string }) => void) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AddContactForm({
  isOpen,
  onClose,
  onCreated,
  defaultName,
  defaultCompanyId,
  defaultCompanyName,
  stackLevel = 0,
  onAddCompany,
}: AddContactFormProps) {
  const { addContact, companies } = useClientsStore();
  const { contactRoles } = useFieldsStore();
  const toast = useToast();

  const [formData, setFormData] = useState<AddContactFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [officePhoneError, setOfficePhoneError] = useState('');
  const [mobilePhoneError, setMobilePhoneError] = useState('');
  
  // Additional method modal state
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'phone' | 'fax' | 'email'>('phone');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newMethodValue, setNewMethodValue] = useState('');
  const [methodValidationError, setMethodValidationError] = useState<string | null>(null);

  // Role options from store
  const roleOptions = useMemo(() => 
    contactRoles.map(role => ({ value: role, label: role })),
    [contactRoles]
  );

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Split default name into first/last
      let firstName = '';
      let lastName = '';
      if (defaultName) {
        const parts = defaultName.trim().split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      setFormData({
        ...initialFormData,
        firstName,
        lastName,
        companyId: defaultCompanyId || '',
        companyName: defaultCompanyName || '',
      });
      setEmailError('');
      setOfficePhoneError('');
      setMobilePhoneError('');
      setShowAddMethodModal(false);
    }
  }, [isOpen, defaultName, defaultCompanyId, defaultCompanyName]);

  // Update field helper
  const updateField = useCallback(<K extends keyof AddContactFormData>(field: K, value: AddContactFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Company items for dropdown
  const companyItems: EntitySearchItem[] = useMemo(() =>
    companies.map(c => ({ id: c.id, name: c.name })),
    [companies]
  );

  // Handle company change
  const handleCompanyChange = (item: EntitySearchItem | null) => {
    if (item) {
      setFormData(prev => ({
        ...prev,
        companyId: item.id,
        companyName: item.name,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        companyId: '',
        companyName: '',
      }));
    }
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

  // Handle email change with validation
  const handleEmailChange = (value: string) => {
    updateField('email', value);
    if (value && !validateEmail(value)) {
      setEmailError('Invalid email address');
    } else {
      setEmailError('');
    }
  };

  // Handle phone changes with formatting
  const handleOfficePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    updateField('phoneOffice', formatted);
    if (formatted && !validatePhone(formatted)) {
      setOfficePhoneError('Invalid phone number');
    } else {
      setOfficePhoneError('');
    }
  };

  const handleMobilePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    updateField('phoneMobile', formatted);
    if (formatted && !validatePhone(formatted)) {
      setMobilePhoneError('Invalid phone number');
    } else {
      setMobilePhoneError('');
    }
  };

  // Additional contact method handlers
  const handleNewMethodValueChange = (value: string) => {
    let formattedValue = value;
    if (newMethodType !== 'email') {
      formattedValue = formatPhoneNumber(value);
    }
    setNewMethodValue(formattedValue);
    
    // Validate
    if (formattedValue) {
      if (newMethodType === 'email') {
        setMethodValidationError(validateEmail(formattedValue) ? null : 'Invalid email address');
      } else {
        setMethodValidationError(validatePhone(formattedValue) ? null : 'Invalid phone number');
      }
    } else {
      setMethodValidationError(null);
    }
  };

  const handleAddMethod = () => {
    if (!newMethodLabel.trim()) {
      toast.error('Required', 'Label is required');
      return;
    }
    if (!newMethodValue.trim()) {
      toast.error('Required', 'Value is required');
      return;
    }
    if (methodValidationError) {
      return;
    }

    const newMethod: AdditionalContactMethod = {
      id: crypto.randomUUID(),
      type: newMethodType,
      label: newMethodLabel.trim(),
      value: newMethodValue.trim(),
    };

    setFormData(prev => ({
      ...prev,
      additionalContacts: [...prev.additionalContacts, newMethod],
    }));

    // Reset and close modal
    setShowAddMethodModal(false);
    setNewMethodType('phone');
    setNewMethodLabel('');
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  const handleRemoveMethod = (methodId: string) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: prev.additionalContacts.filter(m => m.id !== methodId),
    }));
  };

  // Get icon for contact method type
  const getMethodIcon = (type: 'phone' | 'fax' | 'email') => {
    switch (type) {
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'fax': return <Printer className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
    }
  };

  // Validate form
  const isValid = 
    formData.firstName.trim() && 
    formData.companyId && 
    !emailError && 
    !officePhoneError && 
    !mobilePhoneError;

  // Handle save
  const handleSave = async () => {
    if (!formData.firstName.trim()) {
      toast.error('Required', 'First name is required');
      return;
    }
    if (!formData.companyId) {
      toast.error('Required', 'Please select a company');
      return;
    }

    setIsSaving(true);
    try {
      const newContact = addContact({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        companyId: formData.companyId,
        email: formData.email || undefined,
        phoneOffice: formData.phoneOffice || undefined,
        phoneMobile: formData.phoneMobile || undefined,
        role: formData.role || undefined,
        notes: formData.notes || undefined,
        additionalContacts: formData.additionalContacts.length > 0 ? formData.additionalContacts : undefined,
      });

      const fullName = `${newContact.firstName} ${newContact.lastName}`.trim();
      toast.success('Contact Created', `"${fullName}" has been added`);
      onCreated?.(newContact);
      onClose();
    } catch (error) {
      toast.error('Error', 'Failed to create contact');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPanel
      isOpen={isOpen}
      onClose={() => {
        if (showAddMethodModal) return; // Don't close if sub-modal is open
        onClose();
      }}
      title="Add New Contact"
      icon={<User className="w-5 h-5" />}
      width={600}
      stackLevel={stackLevel}
      footer={
        <ModalPanelFooter
          onCancel={onClose}
          onSave={handleSave}
          saveText="Create Contact"
          saveDisabled={!isValid}
          saving={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {/* Company */}
        <EntitySearchDropdown
          label="Company *"
          value={formData.companyId ? { id: formData.companyId, name: formData.companyName } : null}
          onChange={handleCompanyChange}
          items={companyItems}
          placeholder="Search companies..."
          icon={Building2}
          allowCreate={!!onAddCompany}
          onCreateNew={handleAddCompany}
          createLabel="Add new company"
        />
        {!formData.companyId && (
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Company is required for all contacts
          </p>
        )}

        {/* First and Last Name Row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="First name..."
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Last name..."
          />
        </div>

        {/* Role */}
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => updateField('role', e.target.value as ContactRole | '')}
          options={roleOptions}
          placeholder="Select a role..."
        />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="email@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={emailError}
        />

        {/* Phone Numbers Row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone (Office)"
            value={formData.phoneOffice}
            onChange={(e) => handleOfficePhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
            leftIcon={<Phone className="w-4 h-4" />}
            error={officePhoneError}
          />
          <Input
            label="Phone (Mobile)"
            value={formData.phoneMobile}
            onChange={(e) => handleMobilePhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
            leftIcon={<Smartphone className="w-4 h-4" />}
            error={mobilePhoneError}
          />
        </div>

        {/* Additional Contact Methods */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Additional Contact Methods
            </label>
            <button
              type="button"
              onClick={() => setShowAddMethodModal(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {formData.additionalContacts.length > 0 ? (
            <div className="space-y-2">
              {formData.additionalContacts.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{getMethodIcon(method.type)}</span>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{method.label}</span>
                      <p className="text-sm text-slate-900 dark:text-white">{method.value}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMethod(method.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No additional contact methods</p>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Add any notes about this contact..."
          rows={3}
        />
      </div>

      {/* Additional Contact Method Sub-Modal */}
      {showAddMethodModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddMethodModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Add Contact Method
            </h3>
            <div className="space-y-4">
              {/* Type selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Type
                </label>
                <div className="flex gap-2">
                  {(['phone', 'fax', 'email'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewMethodType(type);
                        setNewMethodValue('');
                        setMethodValidationError(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        newMethodType === type
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {getMethodIcon(type)}
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <Input
                label="Label"
                value={newMethodLabel}
                onChange={(e) => setNewMethodLabel(e.target.value)}
                placeholder={newMethodType === 'email' ? 'e.g., Personal Email' : 'e.g., Direct Line'}
                required
                autoFocus
              />
              
              <Input
                label={newMethodType === 'email' ? 'Email Address' : 'Phone Number'}
                type={newMethodType === 'email' ? 'email' : 'tel'}
                value={newMethodValue}
                onChange={(e) => handleNewMethodValueChange(e.target.value)}
                placeholder={newMethodType === 'email' ? 'email@example.com' : '(555) 123-4567'}
                error={methodValidationError || undefined}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddMethodModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMethod}
                disabled={!!methodValidationError}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Add Method
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPanel>
  );
}

export default AddContactForm;