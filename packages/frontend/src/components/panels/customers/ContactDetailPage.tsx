import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  User,
  ArrowLeft,
  Phone,
  Smartphone,
  Mail,
  Building2,
  Trash2,
  FileText,
  Briefcase,
  Plus,
  AlertCircle,
  ArrowRightLeft,
  AlertTriangle,
  Printer,
  MapPin,
  Info,
  Check,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { 
  Card, CardContent, Button, ConfirmModal, Modal, Input,
  SectionHeader, InlineEditField, InlineSelectField, CollapsibleSection, 
  CompanySearchField, EntityTasksSection
} from '@/components/common';
import { TaskDetailPanel } from '@/components/panels/TasksPage';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, useFieldsStore, type Contact } from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useDocumentTitle, useContactBySlug, getCompanyUrl } from '@/hooks';
import { validateEmail, validatePhone } from '@/utils/validation';

// Company Change Warning Modal
function CompanyChangeWarningModal({
  isOpen,
  oldCompanyName,
  newCompanyName,
  onClose,
}: {
  isOpen: boolean;
  oldCompanyName: string;
  newCompanyName: string;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Contact Details"
      size="md"
      footer={
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      }
    >
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Company changed from <strong>{oldCompanyName || 'None'}</strong> to <strong>{newCompanyName}</strong>
          </p>
        </div>
      </div>
      
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Please verify that the contact details (email, phone numbers) are still correct for this person at the new company.
      </p>
    </Modal>
  );
}

export function ContactDetailPage() {
  // Use slug-based routing hook
  const { contact, company, notFound } = useContactBySlug();
  const navigate = useNavigate();
  const toast = useToast();
  const { contactRoles } = useFieldsStore();
  const { companies, updateContact, deleteContact, addContactMethod, updateContactMethod, deleteContactMethod } = useClientsStore();
  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const { users } = useUsersStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  
  // Company change review state
  const [showCompanyChangeModal, setShowCompanyChangeModal] = useState(false);
  const [companyChangeInfo, setCompanyChangeInfo] = useState<{ oldName: string; newName: string } | null>(null);
  const [showCompanyEditor, setShowCompanyEditor] = useState(false);
  
  // Add Contact Method modal state
  const [showAddContactMethodModal, setShowAddContactMethodModal] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'phone' | 'fax' | 'email'>('phone');
  const [newMethodValue, setNewMethodValue] = useState('');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [methodValidationError, setMethodValidationError] = useState<string | null>(null);

  // Task panel state
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useDocumentTitle(contact ? `${contact.firstName} ${contact.lastName}` : 'Contact');

  // Count open tasks linked to this contact
  const openTasksCount = useMemo(() => {
    if (!contact) return 0;
    return tasks.filter(task => {
      const isLinked = task.linkedContact?.type === 'contact' && task.linkedContact?.id === contact.id;
      const isOpen = task.status !== 'completed' && task.status !== 'cancelled';
      return isLinked && isOpen;
    }).length;
  }, [tasks, contact]);

  // Build list of company addresses for office location selector
  const companyAddressOptions = useMemo(() => {
    if (!company) return [];
    const options: { id: string; label: string; location: string }[] = [];
    
    // Main office
    if (company.address?.city || company.address?.state) {
      const location = [company.address.city, company.address.state].filter(Boolean).join(', ');
      options.push({ id: 'main-office', label: 'Main Office', location });
    }
    
    // Additional addresses
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        if (addr.city || addr.state) {
          const location = [addr.city, addr.state].filter(Boolean).join(', ');
          options.push({ id: addr.id, label: addr.label, location });
        }
      });
    }
    
    return options;
  }, [company]);

  // Persist fieldsNeedingReview in localStorage so it survives navigation
  const reviewStorageKey = contact ? `contact-fields-review-${contact.id}` : '';
  const [fieldsNeedingReview, setFieldsNeedingReviewState] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined' && reviewStorageKey) {
      const stored = localStorage.getItem(reviewStorageKey);
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  const setFieldsNeedingReview = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setFieldsNeedingReviewState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (newValue.size > 0) {
        localStorage.setItem(reviewStorageKey, JSON.stringify(Array.from(newValue)));
      } else {
        localStorage.removeItem(reviewStorageKey);
      }
      return newValue;
    });
  }, [reviewStorageKey]);

  // Check if any fields need review (for showing banner)
  const hasFieldsNeedingReview = fieldsNeedingReview.size > 0;

  const hasUnsavedEdits = Array.from(editingFields.values()).some((hasChanges) => hasChanges);

  const { setGuard, clearGuard } = useNavigationGuardStore();

  useEffect(() => {
    setGuard(hasUnsavedEdits);
    return () => clearGuard();
  }, [hasUnsavedEdits, setGuard, clearGuard]);

  // Clear company editing state when editor closes (component unmounts)
  useEffect(() => {
    if (!showCompanyEditor) {
      setEditingFields(prev => {
        const next = new Map(prev);
        next.delete('company');
        return next;
      });
    }
  }, [showCompanyEditor]);

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

  // Handle company change - show review modal
  const handleCompanyChange = (oldCompanyId: string, newCompanyId: string) => {
    const oldCompany = companies.find(c => c.id === oldCompanyId);
    const newCompany = companies.find(c => c.id === newCompanyId);
    setCompanyChangeInfo({
      oldName: oldCompany?.name || 'Unknown',
      newName: newCompany?.name || 'Unknown',
    });
    setShowCompanyChangeModal(true);
    
    // Set fields needing review (persisted in localStorage)
    const fields = new Set(['role', 'email', 'phoneOffice', 'phoneMobile']);
    // Also add any additional contact methods
    if (contact?.additionalContacts) {
      contact.additionalContacts.forEach(method => {
        fields.add(`additional-${method.id}`);
      });
    }
    setFieldsNeedingReview(fields);
  };

  // Handle closing the warning modal
  const handleCloseWarningModal = () => {
    setShowCompanyChangeModal(false);
    setCompanyChangeInfo(null);
    // Clear any editing state for company field so navigation guard doesn't trigger
    setEditingFields(prev => {
      const next = new Map(prev);
      next.delete('company');
      return next;
    });
  };

  // Handle field confirmation (remove from review set)
  const handleFieldConfirm = (fieldName: string) => {
    // Remove from persisted review set
    setFieldsNeedingReview(prev => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  };

  // Confirm all fields at once
  const handleConfirmAllFields = () => {
    setFieldsNeedingReview(new Set());
    toast.success('Confirmed', 'All contact information has been confirmed');
  };

  if (notFound || !contact) {
    return (
      <Page title="Contact Not Found" description="The requested contact could not be found.">
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Contact not found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">This contact may have been deleted.</p>
            <Button variant="primary" className="mt-4" onClick={() => navigate('/clients/contacts')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const fullName = contact.firstName + ' ' + contact.lastName;

  const handleFieldSave = (field: keyof Contact, value: string) => {
    updateContact(contact.id, { [field]: value || undefined });
    toast.success('Updated', 'Contact information saved');
    
    // Auto-confirm the field if it was needing review
    if (fieldsNeedingReview.has(field)) {
      handleFieldConfirm(field);
    }
  };

  const handleDelete = () => {
    deleteContact(contact.id);
    toast.success('Deleted', fullName + ' has been removed');
    navigate('/clients/contacts');
  };

  // Phone number formatting for add modal
  const formatPhoneForModal = (input: string): string => {
    const hasExtension = input.includes('#');
    let extension = '';
    let phoneDigits = input;
    
    if (hasExtension) {
      const parts = input.split('#');
      phoneDigits = parts[0] || '';
      extension = parts.slice(1).join('');
    }
    
    const digits = phoneDigits.replace(/\D/g, '');
    
    let formatted = '';
    if (digits.length > 0) {
      formatted = '(' + digits.substring(0, 3);
    }
    if (digits.length >= 3) {
      formatted += ') ' + digits.substring(3, 6);
    }
    if (digits.length >= 6) {
      formatted += '-' + digits.substring(6, 10);
    }
    
    if (hasExtension && extension) {
      formatted += ' #' + extension.replace(/\D/g, '');
    } else if (hasExtension) {
      formatted += ' #';
    }
    
    return formatted;
  };

  const handleAddContactMethod = () => {
    // Validate label first
    if (!newMethodLabel.trim()) {
      toast.error('Error', 'Please enter a label for this contact method');
      return;
    }
    
    // Validate value
    if (!newMethodValue.trim()) {
      setMethodValidationError('Please enter a value');
      toast.error('Error', 'Please enter a value');
      return;
    }
    
    if (newMethodType === 'email') {
      if (!validateEmail(newMethodValue)) {
        setMethodValidationError('Invalid email address');
        toast.error('Error', 'Please enter a valid email address');
        return;
      }
    } else {
      if (!validatePhone(newMethodValue)) {
        setMethodValidationError('Invalid phone number');
        toast.error('Error', 'Please enter a valid phone number');
        return;
      }
    }
    
    addContactMethod(contact.id, {
      type: newMethodType,
      value: newMethodValue,
      label: newMethodLabel.trim(),
    });
    
    // Reset modal state
    setShowAddContactMethodModal(false);
    setNewMethodType('phone');
    setNewMethodValue('');
    setNewMethodLabel('');
    setMethodValidationError(null);
    toast.success('Added', 'Contact method has been added');
  };

  const handleNewMethodValueChange = (value: string) => {
    let newValue = value;
    
    if (newMethodType !== 'email') {
      // Only format when adding digits, not when deleting
      const currentDigits = newMethodValue.replace(/\D/g, '').length;
      const newDigits = value.replace(/\D/g, '').length;
      
      if (newDigits > currentDigits) {
        newValue = formatPhoneForModal(value);
      } else {
        newValue = value;
      }
    }
    
    setNewMethodValue(newValue);
    
    // Real-time validation
    if (!newValue.trim()) {
      setMethodValidationError(null);
    } else if (newMethodType === 'email') {
      setMethodValidationError(validateEmail(newValue) ? null : 'Invalid email address');
    } else {
      setMethodValidationError(validatePhone(newValue) ? null : 'Invalid phone number');
    }
  };

  const handleMethodTypeChange = (type: 'phone' | 'fax' | 'email') => {
    setNewMethodType(type);
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  return (
    <Page
      title={fullName}
      description={contact.role || 'Contact details'}
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
      {/* Needs Review Warning Banner */}
      {hasFieldsNeedingReview && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Contact information needs review</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This contact was moved to a new company. Please verify the contact information is still correct, or confirm each field individually.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handleConfirmAllFields}>
              <Check className="w-4 h-4 mr-1" />
              Confirm All
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Contact Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Details - Non-collapsible but matching header style */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Contact Details</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InlineEditField
                  label="First Name"
                  value={contact.firstName}
                  onSave={(v) => handleFieldSave('firstName', v)}
                  placeholder="First name"
                  onEditingChange={handleEditingChange('firstName')}
                />
                <InlineEditField
                  label="Last Name"
                  value={contact.lastName}
                  onSave={(v) => handleFieldSave('lastName', v)}
                  placeholder="Last name"
                  onEditingChange={handleEditingChange('lastName')}
                />
                <InlineSelectField
                  label="Role"
                  value={contact.role || ''}
                  options={contactRoles}
                  onSave={(v) => handleFieldSave('role', v)}
                  onEditingChange={handleEditingChange('role')}
                  needsReview={fieldsNeedingReview.has('role')}
                  onConfirm={() => handleFieldConfirm('role')}
                  icon={Briefcase}
                  placeholder="Click to assign role..."
                  emptyLabel="No role assigned"
                />
                
                {/* Company field with navigate + switch */}
                <div
                  data-inline-field="true"
                  tabIndex={0}
                  onClick={() => setShowCompanyEditor(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCompanyEditor(true);
                    }
                  }}
                  className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Company</div>
                  {company ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getCompanyUrl(company));
                        }}
                        className="text-sm text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        {company.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCompanyEditor(true);
                        }}
                        className="ml-auto p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Change company"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : contact.companyId ? (
                    // Company was deleted - show warning and selector
                    <div className="flex items-center gap-2 mt-0.5 rounded bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-2 py-1 -mx-2">
                      <AlertCircle className="w-3.5 h-3.5 text-danger-500" />
                      <span className="text-xs text-danger-600 dark:text-danger-400">Company deleted</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCompanyEditor(true);
                        }}
                        className="ml-auto text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Reassign
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-400 italic">
                        Click to assign company...
                      </span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Company editor - full width below grid */}
              {showCompanyEditor && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <CompanySearchField
                    label="Select Company"
                    value={contact.companyId}
                    onSave={(v) => {
                      handleFieldSave('companyId', v);
                      setShowCompanyEditor(false);
                    }}
                    onEditingChange={handleEditingChange('company')}
                    onCompanyChange={handleCompanyChange}
                  />
                  <button
                    onClick={() => setShowCompanyEditor(false)}
                    className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Office Location - Only show if company has multiple addresses */}
          {company && companyAddressOptions.length > 1 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <SectionHeader
                title="Office Location"
                icon={MapPin}
              />
              <div className="p-4 bg-white dark:bg-slate-900">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Assigned Office
                  </label>
                  <select
                    value={contact.officeAddressId || ''}
                    onChange={(e) => {
                      updateContact(contact.id, { officeAddressId: e.target.value || undefined });
                      toast.success('Updated', 'Office location saved');
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">All locations (not assigned)</option>
                    {companyAddressOptions.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} - {addr.location}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Select which office this contact is located at
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information - Collapsible */}
          <CollapsibleSection
            title="Contact Information"
            icon={Phone}
            defaultOpen={true}
            action={
              <button
                onClick={() => setShowAddContactMethodModal(true)}
                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Add contact method"
              >
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative group">
                <InlineEditField
                  label="Email"
                  value={contact.email || ''}
                  onSave={(v) => handleFieldSave('email', v)}
                  type="email"
                  placeholder="email@example.com"
                  icon={Mail}
                  onEditingChange={handleEditingChange('email')}
                  needsReview={fieldsNeedingReview.has('email')}
                  onConfirm={() => handleFieldConfirm('email')}
                />
                {contact.email && (
                  <button
                    onClick={() => handleFieldSave('email', '')}
                    className="absolute top-1 right-0 p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="relative group">
                <InlineEditField
                  label="Office Phone"
                  value={contact.phoneOffice || ''}
                  onSave={(v) => handleFieldSave('phoneOffice', v)}
                  type="tel"
                  placeholder="(555) 123-4567"
                  icon={Phone}
                  onEditingChange={handleEditingChange('phoneOffice')}
                  needsReview={fieldsNeedingReview.has('phoneOffice')}
                  onConfirm={() => handleFieldConfirm('phoneOffice')}
                />
                {contact.phoneOffice && (
                  <button
                    onClick={() => handleFieldSave('phoneOffice', '')}
                    className="absolute top-1 right-0 p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="relative group">
                <InlineEditField
                  label="Mobile Phone"
                  value={contact.phoneMobile || ''}
                  onSave={(v) => handleFieldSave('phoneMobile', v)}
                  type="tel"
                  placeholder="(555) 987-6543"
                  icon={Smartphone}
                  onEditingChange={handleEditingChange('phoneMobile')}
                  needsReview={fieldsNeedingReview.has('phoneMobile')}
                  onConfirm={() => handleFieldConfirm('phoneMobile')}
                />
                {contact.phoneMobile && (
                  <button
                    onClick={() => handleFieldSave('phoneMobile', '')}
                    className="absolute top-1 right-0 p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {/* Dynamic additional contact methods */}
              {contact.additionalContacts?.map((method) => (
                <div key={method.id} className="relative group">
                  <InlineEditField
                    label={method.label || (method.type === 'phone' ? 'Phone' : method.type === 'fax' ? 'Fax' : 'Email')}
                    value={method.value}
                    onSave={(v) => {
                      updateContactMethod(contact.id, method.id, { value: v });
                      // Auto-confirm if it was needing review
                      if (fieldsNeedingReview.has(`additional-${method.id}`)) {
                        handleFieldConfirm(`additional-${method.id}`);
                      }
                    }}
                    type={method.type === 'email' ? 'email' : 'tel'}
                    placeholder={method.type === 'email' ? 'email@example.com' : '(555) 123-4567'}
                    icon={method.type === 'phone' ? Phone : method.type === 'fax' ? Printer : Mail}
                    onEditingChange={handleEditingChange(`additional-${method.id}`)}
                    needsReview={fieldsNeedingReview.has(`additional-${method.id}`)}
                    onConfirm={() => handleFieldConfirm(`additional-${method.id}`)}
                  />
                  <button
                    onClick={() => {
                      deleteContactMethod(contact.id, method.id);
                      // Also remove from review set if present
                      handleFieldConfirm(`additional-${method.id}`);
                      toast.success('Removed', 'Contact method has been deleted');
                    }}
                    className="absolute top-1 right-0 p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Notes Section - Collapsible, closed by default */}
          <CollapsibleSection
            title="Notes"
            icon={FileText}
            defaultOpen={false}
          >
            <InlineEditField
              label="Notes"
              value={contact.notes || ''}
              onSave={(v) => handleFieldSave('notes', v)}
              type="textarea"
              placeholder="Add notes about this contact..."
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
              icon={Info}
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Open Tasks</span>
                  <span className="font-medium text-slate-900 dark:text-white">{openTasksCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Projects</span>
                  <span className="font-medium text-slate-900 dark:text-white">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <EntityTasksSection
            entityType="contact"
            entityId={contact.id}
            entityName={fullName}
            onAddTask={() => {
              setSelectedTask(null);
              setIsTaskPanelOpen(true);
            }}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setIsTaskPanelOpen(true);
            }}
          />
        </div>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        isOpen={isTaskPanelOpen}
        onClose={() => {
          setIsTaskPanelOpen(false);
          setSelectedTask(null);
        }}
        onSave={async (data, markDone) => {
          const user = users.find(u => u.id === data.assignedUserId);
          const taskData = { ...data, assignedUserName: user?.name || '' };
          
          if (selectedTask) {
            if (markDone && selectedTask.status !== 'completed') {
              await updateTask(selectedTask.id, { ...taskData, status: 'completed' } as TaskInput);
              toast.success('Task Completed', 'Task has been marked as done');
            } else if (!markDone && selectedTask.status === 'completed') {
              await updateTask(selectedTask.id, { ...taskData, status: 'todo' } as TaskInput);
              toast.success('Task Updated', 'Task has been reopened');
            } else {
              await updateTask(selectedTask.id, taskData);
              toast.success('Task Updated', 'Your changes have been saved');
            }
          } else {
            await createTask(taskData);
            toast.success('Task Created', 'New task has been added');
          }
          setIsTaskPanelOpen(false);
          setSelectedTask(null);
        }}
        onDelete={async (taskId) => {
          await deleteTask(taskId);
          toast.success('Task Deleted', 'The task has been removed');
        }}
        defaultLinkedContact={{
          type: 'contact',
          id: contact.id,
          name: fullName,
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={'Are you sure you want to delete "' + fullName + '"?'}
        confirmText="Delete"
        variant="danger"
      />

      {/* Company Change Warning Modal */}
      <CompanyChangeWarningModal
        isOpen={showCompanyChangeModal}
        oldCompanyName={companyChangeInfo?.oldName || ''}
        newCompanyName={companyChangeInfo?.newName || ''}
        onClose={handleCloseWarningModal}
      />

      {/* Add Contact Method Modal */}
      <Modal
        isOpen={showAddContactMethodModal}
        onClose={() => {
          setShowAddContactMethodModal(false);
          setNewMethodType('phone');
          setNewMethodValue('');
          setNewMethodLabel('');
          setMethodValidationError(null);
        }}
        title="Add Contact Method"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddContactMethodModal(false);
                setNewMethodType('phone');
                setNewMethodValue('');
                setNewMethodLabel('');
                setMethodValidationError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddContactMethod}>
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMethodTypeChange('phone')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'phone'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
              <button
                type="button"
                onClick={() => handleMethodTypeChange('fax')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'fax'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Printer className="w-4 h-4" />
                Fax
              </button>
              <button
                type="button"
                onClick={() => handleMethodTypeChange('email')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'email'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Label */}
          <Input
            label="Label *"
            value={newMethodLabel}
            onChange={(e) => setNewMethodLabel(e.target.value)}
            placeholder="e.g., Work, Home, Assistant"
          />

          {/* Value */}
          <div>
            <Input
              label={newMethodType === 'email' ? 'Email Address' : newMethodType === 'fax' ? 'Fax Number' : 'Phone Number'}
              value={newMethodValue}
              onChange={(e) => handleNewMethodValueChange(e.target.value)}
              placeholder={newMethodType === 'email' ? 'email@example.com' : '(555) 123-4567'}
              error={methodValidationError || undefined}
            />
            {newMethodType !== 'email' && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use # for extension (e.g., (555) 123-4567 #123)
              </p>
            )}
          </div>
        </div>
      </Modal>
    </Page>
  );
}