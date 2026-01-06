import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Building2,
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  User,
  Plus,
  Trash2,
  Mail,
  Smartphone,
  FileText,
  Check,
  X,
  Pencil,
  CalendarClock,
  Users,
  Info,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Button, ConfirmModal, Modal, Input, AddressInput, UnsavedChangesModal } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, CONTACT_ROLES, type Company, type ContactRole } from '@/contexts';
import {
  formatPhoneNumber,
  validatePhone,
  validateEmail,
  validateWebsite,
} from '@/utils/validation';

// Contact form data interface
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneOffice: string;
  phoneMobile: string;
  role: ContactRole | '';
  notes: string;
}

const initialContactFormData: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneOffice: '',
  phoneMobile: '',
  role: '',
  notes: '',
};

// Non-collapsible Section Header (matches CollapsibleSection style)
function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>
      {action}
    </div>
  );
}

// Compact Inline Editable Field Component
function InlineField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
  icon: Icon,
  onEditingChange,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'tel' | 'url' | 'email' | 'textarea';
  placeholder?: string;
  icon?: React.ElementType;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  // Use ref to avoid infinite loops with onEditingChange callback
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Validate a value and return error message or null
  const getValidationError = (val: string): string | null => {
    if (!val) return null;
    
    if (type === 'tel') {
      return validatePhone(val) ? null : 'Invalid phone number';
    }
    if (type === 'email') {
      return validateEmail(val) ? null : 'Invalid email address';
    }
    if (type === 'url') {
      return validateWebsite(val) ? null : 'Invalid website URL';
    }
    return null;
  };

  // Handle input change with real-time validation and phone formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Auto-format phone numbers as user types
    if (type === 'tel') {
      const currentDigits = editValue.replace(/\D/g, '').length;
      const newDigits = newValue.replace(/\D/g, '').length;
      
      // Only format when ADDING digits, not when deleting
      if (newDigits > currentDigits) {
        newValue = formatPhoneNumber(newValue);
      }
      // When deleting, just accept the raw value as-is (don't re-format)
    }
    
    setEditValue(newValue);
    // Validate in real-time
    setValidationError(getValidationError(newValue));
  };

  const moveToNextField = () => {
    const focusableElements = document.querySelectorAll('[data-inline-field="true"]');
    const currentIndex = Array.from(focusableElements).findIndex(
      (el) => el === fieldRef.current || el.contains(fieldRef.current)
    );
    const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
    if (nextElement) {
      nextElement.focus();
      nextElement.click();
    }
  };

  const handleSave = () => {
    // Validate before saving
    const error = getValidationError(editValue);
    if (error) {
      setValidationError(error);
      return;
    }
    
    onSave(editValue);
    setIsEditing(false);
    setShowModal(false);
    setValidationError(null);
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = (showDiscardToast = false) => {
    if (showDiscardToast && validationError) {
      toast.error('Not Saved', 'Changes discarded due to invalid value');
    }
    setEditValue(value);
    setIsEditing(false);
    setShowModal(false);
    setValidationError(null);
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleKeepEditing = () => {
    setShowModal(false);
    setPendingTab(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showModal) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      // If there's a validation error, discard with toast
      if (validationError) {
        handleDiscard(true);
      } else if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      // If there's a validation error, show toast and stay on field
      if (validationError) {
        toast.error('Invalid Value', validationError);
        // Refocus the input to keep cursor in field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return;
      }
      if (hasChanges) {
        setPendingTab(true);
        setShowModal(true);
      } else {
        setIsEditing(false);
        moveToNextField();
      }
    }
  };

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <>
        <div className="space-y-1" data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
          <div className="flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                autoFocus
                className={clsx(
                  "flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2",
                  validationError 
                    ? "border-danger-500 focus:ring-danger-500" 
                    : "border-brand-500 focus:ring-brand-500"
                )}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type === 'tel' ? 'text' : type}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className={clsx(
                  "flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2",
                  validationError 
                    ? "border-danger-500 focus:ring-danger-500" 
                    : "border-brand-500 focus:ring-brand-500"
                )}
              />
            )}
            <button
              onClick={handleSave}
              tabIndex={-1}
              className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg"
              title="Save (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                // If there's a validation error, just discard without asking
                if (validationError) {
                  handleDiscard(true);
                } else if (hasChanges) {
                  setShowModal(true);
                } else {
                  setIsEditing(false);
                }
              }}
              tabIndex={-1}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {validationError && (
            <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">{validationError}</p>
          )}
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={handleSave}
          onDiscard={() => handleDiscard(false)}
          onCancel={handleKeepEditing}
        />
      </>
    );
  }

  return (
    <div
      data-inline-field="true"
      ref={fieldRef}
      tabIndex={0}
      className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleViewKeyDown}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span className={clsx('text-sm', value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}>
          {value || placeholder || 'Click to add...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

// Sales Rep Selector
function SalesRepField({
  label,
  value,
  onSave,
  onEditingChange,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const { users } = useUsersStore();
  const activeUsers = users.filter((u) => u.isActive);
  const selectedUser = users.find((u) => u.id === value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  // Use ref to avoid infinite loops with onEditingChange callback
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  const moveToNextField = () => {
    const focusableElements = document.querySelectorAll('[data-inline-field="true"]');
    const currentIndex = Array.from(focusableElements).findIndex(
      (el) => el === fieldRef.current || el.contains(fieldRef.current)
    );
    const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
    if (nextElement) {
      nextElement.focus();
      nextElement.click();
    }
  };

  const handleSave = (newValue: string) => {
    onSave(newValue);
    setIsEditing(false);
    setShowModal(false);
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowModal(false);
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleKeepEditing = () => {
    setShowModal(false);
    setPendingTab(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showModal) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (hasChanges) {
        setPendingTab(true);
        setShowModal(true);
      } else {
        setIsEditing(false);
        moveToNextField();
      }
    }
  };

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <>
        <div className="space-y-1" data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
          <div className="flex items-center gap-2">
            <select
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                handleSave(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">No sales rep assigned</option>
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => (hasChanges ? setShowModal(true) : setIsEditing(false))}
              tabIndex={-1}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={() => handleSave(editValue)}
          onDiscard={handleDiscard}
          onCancel={handleKeepEditing}
        />
      </>
    );
  }

  return (
    <div
      data-inline-field="true"
      ref={fieldRef}
      tabIndex={0}
      className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleViewKeyDown}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className={clsx('text-sm', selectedUser ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}>
          {selectedUser?.name || 'Click to assign...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { companies, contacts, updateCompany, deleteCompany, addContact } = useClientsStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  
  // Add Contact Modal state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>(initialContactFormData);

  const company = companies.find((c) => c.id === id);
  const companyContacts = contacts.filter((c) => c.companyId === id);

  const hasUnsavedEdits = Array.from(editingFields.values()).some((hasChanges) => hasChanges);

  const { setGuard, clearGuard } = useNavigationGuardStore();

  useEffect(() => {
    setGuard(hasUnsavedEdits);
    return () => clearGuard();
  }, [hasUnsavedEdits, setGuard, clearGuard]);

  const handleEditingChange = useCallback((fieldName: string) => {
    return (isEditing: boolean, hasChanges: boolean) => {
      setEditingFields((prev) => {
        const next = new Map(prev);
        if (isEditing && hasChanges) {
          next.set(fieldName, true);
        } else {
          next.delete(fieldName);
        }
        return next;
      });
    };
  }, []);

  if (!company) {
    return (
      <Page title="Company Not Found" description="The requested company could not be found.">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="p-12 text-center bg-white dark:bg-slate-900">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Company not found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">This company may have been deleted.</p>
            <Button variant="primary" className="mt-4" onClick={() => navigate('/clients/companies')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Companies
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const handleFieldSave = (field: keyof Company, value: string) => {
    updateCompany(company.id, { [field]: value || undefined });
    toast.success('Updated', 'Company information saved');
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    toast.success('Deleted', company.name + ' has been removed');
    navigate('/clients/companies');
  };

  // Add Contact Modal handlers
  const openAddContactModal = () => {
    setContactFormData(initialContactFormData);
    setShowAddContactModal(true);
  };

  const closeAddContactModal = () => {
    setShowAddContactModal(false);
    setContactFormData(initialContactFormData);
  };

  // Check if form has validation errors
  const hasValidationErrors = () => {
    if (contactFormData.email && !validateEmail(contactFormData.email)) return true;
    if (contactFormData.phoneOffice && !validatePhone(contactFormData.phoneOffice)) return true;
    if (contactFormData.phoneMobile && !validatePhone(contactFormData.phoneMobile)) return true;
    return false;
  };

  const handleSaveContact = () => {
    if (!contactFormData.firstName.trim() || !contactFormData.lastName.trim()) {
      toast.error('Error', 'First name and last name are required');
      return;
    }

    // Don't save if there are validation errors (errors shown inline)
    if (hasValidationErrors()) {
      return;
    }

    addContact({
      companyId: company.id,
      firstName: contactFormData.firstName.trim(),
      lastName: contactFormData.lastName.trim(),
      email: contactFormData.email || undefined,
      phoneOffice: contactFormData.phoneOffice || undefined,
      phoneMobile: contactFormData.phoneMobile || undefined,
      role: contactFormData.role || undefined,
      notes: contactFormData.notes || undefined,
    });

    toast.success('Created', `${contactFormData.firstName} ${contactFormData.lastName} has been added`);
    closeAddContactModal();
  };

  // Only consider it having changes if there are no validation errors
  const hasContactChanges =
    (contactFormData.firstName.trim() !== '' ||
    contactFormData.lastName.trim() !== '' ||
    contactFormData.email !== '' ||
    contactFormData.phoneOffice !== '' ||
    contactFormData.phoneMobile !== '' ||
    contactFormData.role !== '' ||
    contactFormData.notes !== '') && !hasValidationErrors();

  return (
    <Page
      title={company.name}
      description="Company details"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Company Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Company Details - Non-collapsible with header */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Company Details"
              icon={<Building2 className="w-4 h-4 text-slate-500" />}
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="space-y-3">
                <InlineField
                  label="Company Name"
                  value={company.name}
                  onSave={(v) => handleFieldSave('name', v)}
                  placeholder="Enter company name"
                  onEditingChange={handleEditingChange('name')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InlineField
                    label="Phone"
                    value={company.phone || ''}
                    onSave={(v) => handleFieldSave('phone', v)}
                    type="tel"
                    placeholder="(555) 123-4567"
                    icon={Phone}
                    onEditingChange={handleEditingChange('phone')}
                  />
                  <InlineField
                    label="Website"
                    value={company.website || ''}
                    onSave={(v) => handleFieldSave('website', v)}
                    type="url"
                    placeholder="www.example.com"
                    icon={Globe}
                    onEditingChange={handleEditingChange('website')}
                  />
                  <SalesRepField
                    label="Sales Rep"
                    value={company.salesRepId || ''}
                    onSave={(v) => handleFieldSave('salesRepId', v)}
                    onEditingChange={handleEditingChange('salesRep')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Section - Collapsible with Google Places Autocomplete */}
          <CollapsibleSection
            title="Address"
            icon={<MapPin className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
          >
            <AddressInput
              street={company.address?.street || ''}
              city={company.address?.city || ''}
              state={company.address?.state || ''}
              zip={company.address?.zip || ''}
              onSave={(address) => {
                updateCompany(company.id, {
                  address: {
                    street: address.street,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                  },
                });
                toast.success('Updated', 'Address saved');
              }}
            />
          </CollapsibleSection>

          {/* Contacts Section - Collapsible */}
          <CollapsibleSection
            title="Contacts"
            icon={<Users className="w-4 h-4 text-slate-500" />}
            badge={companyContacts.length}
            defaultOpen={false}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddContactModal();
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            }
          >
            {companyContacts.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {companyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => navigate('/clients/contacts/' + contact.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-xs font-semibold text-accent-600 dark:text-accent-400">
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {contact.role && <span>{contact.role}</span>}
                        {contact.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {contact.phoneMobile && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Smartphone className="w-3 h-3" />
                        {contact.phoneMobile}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Notes Section - Collapsible, Collapsed by Default */}
          <CollapsibleSection
            title="Notes"
            icon={<FileText className="w-4 h-4 text-slate-500" />}
            defaultOpen={false}
          >
            <InlineField
              label="Notes"
              value={company.notes || ''}
              onSave={(v) => handleFieldSave('notes', v)}
              type="textarea"
              placeholder="Add notes about this company..."
              onEditingChange={handleEditingChange('notes')}
            />
          </CollapsibleSection>
        </div>

        {/* Right Column - Quick Info & Tasks */}
        <div className="space-y-4">
          {/* Quick Info - Non-collapsible, always visible */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Quick Info"
              icon={<Info className="w-4 h-4 text-slate-500" />}
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Contacts</span>
                  <span className="font-medium text-slate-900 dark:text-white">{companyContacts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Open Tasks</span>
                  <span className="font-medium text-slate-900 dark:text-white">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Projects</span>
                  <span className="font-medium text-slate-900 dark:text-white">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks - Non-collapsible with action button */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Upcoming Tasks"
              icon={<CalendarClock className="w-4 h-4 text-slate-500" />}
              action={
                <Button variant="secondary" size="sm">
                  <Plus className="w-3 h-3" />
                </Button>
              }
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="text-center py-8 text-slate-400">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming tasks</p>
                <p className="text-xs mt-1">Tasks will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={
          companyContacts.length > 0
            ? 'Are you sure you want to delete "' +
              company.name +
              '"? This will also delete ' +
              companyContacts.length +
              ' contact(s) associated with this company.'
            : 'Are you sure you want to delete "' + company.name + '"?'
        }
        confirmText="Delete"
        variant="danger"
      />

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContactModal}
        onClose={closeAddContactModal}
        title="Add Contact"
        size="lg"
        hasUnsavedChanges={hasContactChanges}
        onSaveChanges={handleSaveContact}
        onDiscardChanges={closeAddContactModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeAddContactModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveContact}>
              Add Contact
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Company (read-only, pre-selected) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400" />
              {company.name}
            </div>
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={contactFormData.firstName}
              onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={contactFormData.lastName}
              onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
              placeholder="Doe"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Role
            </label>
            <select
              value={contactFormData.role}
              onChange={(e) => setContactFormData({ ...contactFormData, role: e.target.value as ContactRole | '' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a role...</option>
              {CONTACT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <Input
            label="Email"
            type="email"
            value={contactFormData.email}
            onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
            placeholder="john.doe@example.com"
          />

          {/* Phone Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Office Phone"
              type="tel"
              value={contactFormData.phoneOffice}
              onChange={(e) => setContactFormData({ ...contactFormData, phoneOffice: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Mobile Phone"
              type="tel"
              value={contactFormData.phoneMobile}
              onChange={(e) => setContactFormData({ ...contactFormData, phoneMobile: e.target.value })}
              placeholder="(555) 987-6543"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={contactFormData.notes}
              onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Modal>
    </Page>
  );
}