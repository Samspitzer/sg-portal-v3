import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  Info,
  Printer,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Button, ConfirmModal, Modal, Input, AddressInput, UnsavedChangesModal, Select, Textarea, Toggle } from '@/components/common';
import { MultiSelectUsers } from '@/components/common/MultiSelectUsers';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { EntityTasksSection } from '@/components/common/EntityTasksSection';
import { TaskDetailPanel } from '@/components/panels/TasksPage';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, useFieldsStore, type Company, type ContactRole, type CompanyAddress, isDuplicateAddress } from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import {
  formatPhoneNumber,
  validatePhone,
  validateEmail,
  validateWebsite,
} from '@/utils/validation';
import { useDocumentTitle, useCompanyBySlug, getContactUrl } from '@/hooks';

// Additional contact method type
interface AdditionalContactMethod {
  id: string;
  type: 'phone' | 'fax' | 'email';
  label: string;
  value: string;
}

// Contact form data interface
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneOffice: string;
  phoneMobile: string;
  role: ContactRole | '';
  notes: string;
  additionalContacts: AdditionalContactMethod[];
}

const initialContactFormData: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneOffice: '',
  phoneMobile: '',
  role: '',
  notes: '',
  additionalContacts: [],
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

  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    if (type === 'tel') {
      const currentDigits = editValue.replace(/\D/g, '').length;
      const newDigits = newValue.replace(/\D/g, '').length;
      
      if (newDigits > currentDigits) {
        newValue = formatPhoneNumber(newValue);
      }
    }
    
    setEditValue(newValue);
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
      if (validationError) {
        toast.error('Invalid Value', validationError);
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

// Multi-Select Sales Rep Field for Company Level with "Set by location" toggle
function MultiSalesRepField({
  label,
  value,
  onSave,
  addressCount,
  isSetByLocation,
  onToggleSetByLocation,
}: {
  label: string;
  value: string[];
  onSave: (value: string[]) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  addressCount: number;
  isSetByLocation: boolean;
  onToggleSetByLocation: (value: boolean) => void;
}) {
  const [localValue, setLocalValue] = useState<string[]>(value);

  // Show "Set by location" toggle only when 2+ addresses exist
  const showLocationToggle = addressCount >= 2;

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle value changes - save immediately
  const handleChange = (newValue: string[]) => {
    setLocalValue(newValue);
    onSave(newValue);
  };

  const handleToggleChange = (checked: boolean) => {
    // Just call the toggle handler - it handles all the data changes and shows one toast
    onToggleSetByLocation(checked);
  };

  // CASE 1: "Set by location" is ON and we have 2+ addresses
  // Show "Set by location" label with toggle to turn it OFF
  if (isSetByLocation && showLocationToggle) {
    return (
      <div className="-mx-2 px-2 py-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm text-brand-600 dark:text-brand-400 italic">Set by location</span>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Toggle
            checked={true}
            onChange={handleToggleChange}
            size="sm"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Assign sales reps per location</span>
        </div>
      </div>
    );
  }

  // CASE 2: Normal mode - show selector with optional toggle (if 2+ addresses)
  return (
    <div className="-mx-2 px-2 py-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <MultiSelectUsers
        value={localValue}
        onChange={handleChange}
        placeholder="Select sales reps..."
        size="sm"
        activeOnly={false}
      />
      {showLocationToggle && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Toggle
            checked={false}
            onChange={handleToggleChange}
            size="sm"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Assign sales reps per location</span>
        </div>
      )}
    </div>
  );
}

// Multi-Select Sales Rep Field for Address Level (supports multiple reps per location)
function AddressSalesRepField({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        Location Sales Reps
      </label>
      <MultiSelectUsers
        value={value}
        onChange={onChange}
        placeholder="Select sales reps..."
        size="sm"
      />
    </div>
  );
}

// Role options moved inside CompanyDetailPage component to use fieldsStore

export function CompanyDetailPage() {
  // Use slug-based routing hook
  const { company, notFound } = useCompanyBySlug();
  const navigate = useNavigate();
  const toast = useToast();
  const { contactRoles } = useFieldsStore();
  const { contacts, updateCompany, deleteCompany, addContact, addCompanyAddress, updateCompanyAddress, deleteCompanyAddress } = useClientsStore();
  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const { users } = useUsersStore();

  // Role options for contact form - using dynamic contactRoles from store
  const roleOptions = useMemo(() => 
    contactRoles.map((role) => ({ value: role, label: role })),
    [contactRoles]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  
  // Add Contact Modal state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>(initialContactFormData);

  // Additional contact method modal state (for Add Contact modal)
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'phone' | 'fax' | 'email'>('phone');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newMethodValue, setNewMethodValue] = useState('');
  const [methodValidationError, setMethodValidationError] = useState<string | null>(null);

  // Add Address Modal state
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressData, setNewAddressData] = useState<{ street: string; suite?: string; city: string; state: string; zip: string }>({ street: '', suite: '', city: '', state: '', zip: '' });
  
  // Delete address confirmation
  const [addressToDelete, setAddressToDelete] = useState<CompanyAddress | null>(null);
  
  // Main office delete confirmation
  const [showDeleteMainOfficeModal, setShowDeleteMainOfficeModal] = useState(false);
  
  // Main office deletion - promote selection modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromoteAddressId, setSelectedPromoteAddressId] = useState<string>('');
  
  // Sales rep migration modal (when addresses drop to 1)
  const [showSalesRepMigrationModal, setShowSalesRepMigrationModal] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');

  // Sales rep mode change modal (when toggling between company/location mode)
  const [showModeChangeModal, setShowModeChangeModal] = useState(false);
  const [modeChangeMessage, setModeChangeMessage] = useState('');

  // Task panel state
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Get contacts for this company
  const companyContacts = company ? contacts.filter((c) => c.companyId === company.id) : [];
  useDocumentTitle(company?.name || 'Company');

  // Count open tasks linked to this company
  const openTasksCount = useMemo(() => {
    if (!company) return 0;
    return tasks.filter(task => {
      const isLinkedContact = task.linkedContact?.type === 'company' && task.linkedContact?.id === company.id;
      const isLinkedItem = task.linkedItem?.type === 'company' && task.linkedItem?.id === company.id;
      const isOpen = task.status !== 'completed' && task.status !== 'cancelled';
      return (isLinkedContact || isLinkedItem) && isOpen;
    }).length;
  }, [tasks, company]);

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

  if (notFound || !company) {
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

  // Get all addresses - main office (from legacy address) + additional addresses
  const mainOfficeAddress = company.address && company.address.street ? {
    id: 'main-office',
    label: 'Main Office',
    ...company.address,
  } : null;

  const additionalAddresses = company.addresses || [];
  
  // Count only addresses with actual street data
  const addressCount = (mainOfficeAddress ? 1 : 0) + additionalAddresses.filter(addr => addr.street).length;

  // Determine if "set by location" mode is active - use explicit flag
  const isSetByLocation = company.salesRepsByLocation === true;

  // Issue 1: When addresses drop to 1 and was in "set by location" mode,
  // migrate the remaining location's sales reps to company level and clear location data
  useEffect(() => {
    if (addressCount <= 1 && isSetByLocation) {
      // Collect all location sales rep IDs
      const locationSalesRepIds: string[] = [];
      
      // From main office
      if (company.address?.salesRepIds) {
        locationSalesRepIds.push(...company.address.salesRepIds);
      } else if (company.address?.salesRepId) {
        locationSalesRepIds.push(company.address.salesRepId);
      }
      
      // From additional addresses
      additionalAddresses.forEach(addr => {
        if (addr.salesRepIds) {
          locationSalesRepIds.push(...addr.salesRepIds);
        } else if (addr.salesRepId) {
          locationSalesRepIds.push(addr.salesRepId);
        }
      });
      
      // Remove duplicates
      const uniqueSalesRepIds = [...new Set(locationSalesRepIds)];
      
      // Get sales rep names for the message
      const { users } = useUsersStore.getState();
      const salesRepNames = uniqueSalesRepIds
        .map(id => users.find(u => u.id === id)?.name)
        .filter(Boolean);
      
      // Clear location sales reps and migrate to company level
      const updatedAddress = company.address ? {
        ...company.address,
        salesRepId: undefined,
        salesRepIds: undefined,
      } : undefined;
      
      const updatedAddresses = additionalAddresses.map(addr => ({
        ...addr,
        salesRepId: undefined,
        salesRepIds: undefined,
      }));
      
      updateCompany(company.id, {
        salesRepsByLocation: false,
        salesRepIds: uniqueSalesRepIds.length > 0 ? uniqueSalesRepIds : undefined,
        salesRepId: undefined,
        address: updatedAddress,
        addresses: updatedAddresses.length > 0 ? updatedAddresses : undefined,
      });
      
      // Show modal with appropriate message
      if (uniqueSalesRepIds.length > 0) {
        setMigrationMessage(`Only 1 address remains. The following sales reps have been moved from location-level to company-level:\n\n${salesRepNames.join(', ')}`);
      } else {
        setMigrationMessage('Only 1 address remains. Sales reps are no longer assigned by location. Please assign sales reps at the company level.');
      }
      setShowSalesRepMigrationModal(true);
    }
  }, [addressCount, isSetByLocation, company.id]);

  const handleFieldSave = (field: keyof Company, value: string) => {
    updateCompany(company.id, { [field]: value || undefined });
    toast.success('Updated', 'Company information saved');
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    toast.success('Deleted', company.name + ' has been removed');
    navigate('/clients/companies');
  };

  // Sales rep handlers
  const handleSalesRepSave = (ids: string[]) => {
    updateCompany(company.id, { salesRepIds: ids.length > 0 ? ids : undefined, salesRepId: undefined });
    toast.success('Updated', 'Sales reps updated');
  };

  const handleToggleSetByLocation = (enabled: boolean) => {
    if (enabled) {
      // Switching to per-location mode - clear company-level sales reps and set flag
      updateCompany(company.id, { 
        salesRepIds: undefined, 
        salesRepId: undefined,
        salesRepsByLocation: true,
      });
      setModeChangeMessage('Sales rep assignment mode changed to per-location.\n\nYou can now assign different sales reps to each address below.');
      setShowModeChangeModal(true);
    } else {
      // Switching back to company-level mode - clear ALL location sales reps (Option A: clean slate)
      // Clear main office sales reps
      const updatedAddress = company.address ? {
        ...company.address,
        salesRepId: undefined,
        salesRepIds: undefined,
      } : undefined;
      
      // Clear additional addresses sales reps
      const updatedAddresses = additionalAddresses.map(addr => ({
        ...addr,
        salesRepId: undefined,
        salesRepIds: undefined,
      }));
      
      updateCompany(company.id, { 
        salesRepsByLocation: false,
        address: updatedAddress,
        addresses: updatedAddresses.length > 0 ? updatedAddresses : undefined,
      });
      setModeChangeMessage('Sales rep assignment mode changed to company-level.\n\nAll location-level sales rep assignments have been cleared. Please assign sales reps at the company level.');
      setShowModeChangeModal(true);
    }
  };

  // Main office sales rep handler (for per-location mode)
  const handleMainOfficeSalesRepChange = (salesRepIds: string[]) => {
    updateCompany(company.id, {
      address: {
        ...company.address!,
        salesRepId: salesRepIds[0] || undefined, // Store first rep in legacy field
        salesRepIds: salesRepIds.length > 0 ? salesRepIds : undefined, // Store all reps
      },
    });
    toast.success('Updated', 'Sales reps updated for Main Office');
  };

  // Additional address sales rep handler (for per-location mode)
  const handleAddressSalesRepChange = (addressId: string, salesRepIds: string[]) => {
    updateCompanyAddress(company.id, addressId, {
      salesRepId: salesRepIds[0] || undefined,
      salesRepIds: salesRepIds.length > 0 ? salesRepIds : undefined,
    });
    const addr = additionalAddresses.find(a => a.id === addressId);
    toast.success('Updated', `Sales reps updated for ${addr?.label || 'location'}`);
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

  const handleSaveContact = () => {
    if (!contactFormData.firstName.trim() || !contactFormData.lastName.trim()) {
      toast.error('Error', 'First name and last name are required');
      return;
    }

    // Validate email
    if (contactFormData.email && !validateEmail(contactFormData.email)) {
      toast.error('Error', 'Please enter a valid email address');
      return;
    }

    // Validate office phone
    if (contactFormData.phoneOffice && !validatePhone(contactFormData.phoneOffice)) {
      toast.error('Error', 'Please enter a valid office phone number');
      return;
    }

    // Validate mobile phone
    if (contactFormData.phoneMobile && !validatePhone(contactFormData.phoneMobile)) {
      toast.error('Error', 'Please enter a valid mobile phone number');
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
      additionalContacts: contactFormData.additionalContacts.length > 0 ? contactFormData.additionalContacts : undefined,
    });

    toast.success('Created', `${contactFormData.firstName} ${contactFormData.lastName} has been added`);
    closeAddContactModal();
  };

  const hasContactChanges =
    contactFormData.firstName.trim() !== '' ||
    contactFormData.lastName.trim() !== '' ||
    contactFormData.email !== '' ||
    contactFormData.phoneOffice !== '' ||
    contactFormData.phoneMobile !== '' ||
    contactFormData.role !== '' ||
    contactFormData.notes !== '' ||
    contactFormData.additionalContacts.length > 0;

  // Additional contact method handlers
  const handleMethodTypeChange = (type: 'phone' | 'fax' | 'email') => {
    setNewMethodType(type);
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  const handleNewMethodValueChange = (value: string) => {
    let formattedValue = value;
    
    if (newMethodType !== 'email') {
      const currentDigits = newMethodValue.replace(/\D/g, '').length;
      const newDigits = value.replace(/\D/g, '').length;
      if (newDigits > currentDigits) {
        formattedValue = formatPhoneNumber(value);
      }
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
      toast.error('Error', 'Label is required');
      return;
    }
    if (!newMethodValue.trim()) {
      toast.error('Error', 'Value is required');
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

    setContactFormData({
      ...contactFormData,
      additionalContacts: [...contactFormData.additionalContacts, newMethod],
    });

    // Reset and close modal
    setShowAddMethodModal(false);
    setNewMethodType('phone');
    setNewMethodLabel('');
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  const handleRemoveMethod = (methodId: string) => {
    setContactFormData({
      ...contactFormData,
      additionalContacts: contactFormData.additionalContacts.filter((m) => m.id !== methodId),
    });
  };

  // Address handlers
  const openAddAddressModal = () => {
    setNewAddressLabel('');
    setNewAddressData({ street: '', suite: '', city: '', state: '', zip: '' });
    setShowAddAddressModal(true);
  };

  const closeAddAddressModal = () => {
    setShowAddAddressModal(false);
    setNewAddressLabel('');
    setNewAddressData({ street: '', suite: '', city: '', state: '', zip: '' });
  };

  const handleAddAddress = () => {
    if (newAddressData.street) {
      const dupCheck = isDuplicateAddress(
        company,
        newAddressData.street,
        newAddressData.city,
        newAddressData.state,
        newAddressData.zip
      );
      if (dupCheck.isDuplicate) {
        toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
        return;
      }
    }

    const mainOfficeIsEmpty = !company.address?.street;
    
    if (mainOfficeIsEmpty) {
      updateCompany(company.id, {
        address: {
          street: newAddressData.street,
          suite: newAddressData.suite,
          city: newAddressData.city,
          state: newAddressData.state,
          zip: newAddressData.zip,
        },
      });
      toast.success('Added', 'Main office address saved');
    } else {
      if (!newAddressLabel.trim()) {
        toast.error('Error', 'Please enter a name for the location');
        return;
      }
      addCompanyAddress(company.id, {
        label: newAddressLabel.trim(),
        street: newAddressData.street,
        suite: newAddressData.suite,
        city: newAddressData.city,
        state: newAddressData.state,
        zip: newAddressData.zip,
      });
      toast.success('Added', `${newAddressLabel.trim()} location added`);
    }
    
    closeAddAddressModal();
  };

  const handleDeleteAddress = () => {
    if (addressToDelete) {
      deleteCompanyAddress(company.id, addressToDelete.id);
      toast.success('Deleted', `${addressToDelete.label} address removed`);
      setAddressToDelete(null);
    }
  };

  const handleConfirmClearMainOffice = () => {
    setShowDeleteMainOfficeModal(false);
    
    const otherAddresses = company.addresses || [];
    
    if (otherAddresses.length === 0) {
      updateCompany(company.id, { address: undefined });
      toast.success('Cleared', 'Main office address removed');
    } else if (otherAddresses.length === 1) {
      const addressToPromote = otherAddresses[0];
      if (addressToPromote) {
        promoteAddressToMainOffice(addressToPromote);
      }
    } else {
      setSelectedPromoteAddressId('');
      setShowPromoteModal(true);
    }
  };

  const promoteAddressToMainOffice = (addressToPromote: CompanyAddress) => {
    updateCompany(company.id, {
      address: {
        street: addressToPromote.street,
        suite: addressToPromote.suite,
        city: addressToPromote.city,
        state: addressToPromote.state,
        zip: addressToPromote.zip,
      },
    });
    deleteCompanyAddress(company.id, addressToPromote.id);
    toast.success('Updated', `${addressToPromote.label} is now the main office`);
    setShowPromoteModal(false);
    setSelectedPromoteAddressId('');
  };

  const handleConfirmPromotion = () => {
    if (!selectedPromoteAddressId) {
      toast.error('Error', 'Please select an address to promote to main office');
      return;
    }
    const addressToPromote = (company.addresses || []).find(a => a.id === selectedPromoteAddressId);
    if (addressToPromote) {
      promoteAddressToMainOffice(addressToPromote);
    }
  };

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
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-visible">
            <SectionHeader
              title="Company Details"
              icon={<Building2 className="w-4 h-4 text-slate-500" />}
            />
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-lg overflow-visible">
              <div className="space-y-3 overflow-visible">
                <InlineField
                  label="Company Name"
                  value={company.name}
                  onSave={(v) => handleFieldSave('name', v)}
                  placeholder="Enter company name"
                  onEditingChange={handleEditingChange('name')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-visible">
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
                  <MultiSalesRepField
                    label="Sales Reps"
                    value={company.salesRepIds || (company.salesRepId ? [company.salesRepId] : [])}
                    onSave={handleSalesRepSave}
                    onEditingChange={handleEditingChange('salesRep')}
                    addressCount={addressCount}
                    isSetByLocation={isSetByLocation}
                    onToggleSetByLocation={handleToggleSetByLocation}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Addresses Section - Collapsible with add button */}
          <CollapsibleSection
            title="Addresses"
            icon={<MapPin className="w-4 h-4 text-slate-500" />}
            badge={addressCount > 0 ? addressCount : undefined}
            defaultOpen={true}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddAddressModal();
                }}
                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Add address"
              >
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            <div className="space-y-4">
              {/* Main Office Address */}
              <div className="relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Main Office
                  </span>
                  {mainOfficeAddress && (
                    <button
                      onClick={() => setShowDeleteMainOfficeModal(true)}
                      className="p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Clear main office address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <AddressInput
                  street={company.address?.street || ''}
                  suite={company.address?.suite || ''}
                  city={company.address?.city || ''}
                  state={company.address?.state || ''}
                  zip={company.address?.zip || ''}
                  onSave={(address) => {
                    if (address.street) {
                      const dupCheck = isDuplicateAddress(
                        company,
                        address.street,
                        address.city,
                        address.state,
                        address.zip,
                        'main-office'
                      );
                      if (dupCheck.isDuplicate) {
                        toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
                        return;
                      }
                    }
                    updateCompany(company.id, {
                      address: {
                        street: address.street,
                        suite: address.suite,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                        salesRepId: company.address?.salesRepId,
                        salesRepIds: company.address?.salesRepIds,
                      },
                    });
                    toast.success('Updated', 'Main Office address saved');
                  }}
                />
                {/* Per-location sales rep (only show in "set by location" mode) */}
                {isSetByLocation && company.address?.street && (
                  <AddressSalesRepField
                    value={company.address?.salesRepIds || (company.address?.salesRepId ? [company.address.salesRepId] : [])}
                    onChange={handleMainOfficeSalesRepChange}
                  />
                )}
              </div>

              {/* Additional Addresses */}
              {additionalAddresses.map((addr) => (
                <div key={addr.id} className="relative group pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {addr.label}
                    </span>
                    <button
                      onClick={() => setAddressToDelete(addr)}
                      className="p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <AddressInput
                    street={addr.street}
                    suite={addr.suite || ''}
                    city={addr.city}
                    state={addr.state}
                    zip={addr.zip}
                    onSave={(address) => {
                      if (address.street) {
                        const dupCheck = isDuplicateAddress(
                          company,
                          address.street,
                          address.city,
                          address.state,
                          address.zip,
                          addr.id
                        );
                        if (dupCheck.isDuplicate) {
                          toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
                          return;
                        }
                      }
                      updateCompanyAddress(company.id, addr.id, {
                        street: address.street,
                        suite: address.suite,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                      });
                      toast.success('Updated', `${addr.label} address saved`);
                    }}
                  />
                  {/* Per-location sales rep (only show in "set by location" mode) */}
                  {isSetByLocation && addr.street && (
                    <AddressSalesRepField
                      value={addr.salesRepIds || (addr.salesRepId ? [addr.salesRepId] : [])}
                      onChange={(ids) => handleAddressSalesRepChange(addr.id, ids)}
                    />
                  )}
                </div>
              ))}
            </div>
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
                    onClick={() => navigate(getContactUrl(contact))}
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
            entityType="company"
            entityId={company.id}
            entityName={company.name}
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
          type: 'company',
          id: company.id,
          name: company.name,
        }}
      />

      {/* Delete Company Confirmation Modal */}
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

      {/* Delete Address Confirmation Modal */}
      <ConfirmModal
        isOpen={!!addressToDelete}
        onClose={() => setAddressToDelete(null)}
        onConfirm={handleDeleteAddress}
        title="Delete Address"
        message={`Are you sure you want to delete the "${addressToDelete?.label}" address?`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete Main Office Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteMainOfficeModal}
        onClose={() => setShowDeleteMainOfficeModal(false)}
        onConfirm={handleConfirmClearMainOffice}
        title="Delete Main Office Address"
        message={
          (company.addresses?.length || 0) > 0
            ? "Are you sure you want to delete the main office address? Another address will be promoted to main office."
            : "Are you sure you want to delete the main office address?"
        }
        confirmText="Delete"
        variant="danger"
      />

      {/* Add Office Location Modal */}
      <Modal
        isOpen={showAddAddressModal}
        onClose={closeAddAddressModal}
        title={!company.address?.street ? "Add Main Office Address" : "Add Office Location"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeAddAddressModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddAddress}>
              {!company.address?.street ? "Set Main Office" : "Add Location"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {company.address?.street && (
            <Input
              label="Location Name"
              value={newAddressLabel}
              onChange={(e) => setNewAddressLabel(e.target.value)}
              placeholder="e.g., Branch Office, Warehouse, Job Site"
              autoFocus
            />
          )}
          <div className={company.address?.street ? "pt-2 border-t border-slate-200 dark:border-slate-700" : ""}>
            {company.address?.street && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Address
              </label>
            )}
            <AddressInput
              street={newAddressData.street}
              suite={newAddressData.suite}
              city={newAddressData.city}
              state={newAddressData.state}
              zip={newAddressData.zip}
              autoSave
              onSave={(address) => {
                setNewAddressData(address);
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Promote Address to Main Office Modal */}
      <Modal
        isOpen={showPromoteModal}
        onClose={() => {
          setShowPromoteModal(false);
          setSelectedPromoteAddressId('');
        }}
        title="Select New Main Office"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowPromoteModal(false);
              setSelectedPromoteAddressId('');
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmPromotion}>
              Set as Main Office
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You're removing the main office address. Please select which location should become the new main office:
          </p>
          <div className="space-y-2">
            {(company.addresses || []).map((addr) => (
              <label
                key={addr.id}
                className={clsx(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedPromoteAddressId === addr.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <input
                  type="radio"
                  name="promoteAddress"
                  value={addr.id}
                  checked={selectedPromoteAddressId === addr.id}
                  onChange={(e) => setSelectedPromoteAddressId(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white text-sm">
                    {addr.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {addr.street}{addr.suite ? `, ${addr.suite}` : ''}, {addr.city}, {addr.state} {addr.zip}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContactModal}
        onClose={() => {
          // Don't close if the Add Method modal is open
          if (showAddMethodModal) return;
          closeAddContactModal();
        }}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400" />
              {company.name}
            </div>
          </div>

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

          <Select
            label="Role"
            value={contactFormData.role}
            onChange={(e) => setContactFormData({ ...contactFormData, role: e.target.value as ContactRole | '' })}
            options={roleOptions}
            placeholder="Select a role..."
          />

          <Input
            label="Email"
            type="email"
            value={contactFormData.email}
            onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
            placeholder="john.doe@example.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Office Phone"
              type="tel"
              value={contactFormData.phoneOffice}
              onChange={(e) => {
                const currentDigits = contactFormData.phoneOffice.replace(/\D/g, '').length;
                const newDigits = e.target.value.replace(/\D/g, '').length;
                if (newDigits > currentDigits) {
                  setContactFormData({ ...contactFormData, phoneOffice: formatPhoneNumber(e.target.value) });
                } else {
                  setContactFormData({ ...contactFormData, phoneOffice: e.target.value });
                }
              }}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Mobile Phone"
              type="tel"
              value={contactFormData.phoneMobile}
              onChange={(e) => {
                const currentDigits = contactFormData.phoneMobile.replace(/\D/g, '').length;
                const newDigits = e.target.value.replace(/\D/g, '').length;
                if (newDigits > currentDigits) {
                  setContactFormData({ ...contactFormData, phoneMobile: formatPhoneNumber(e.target.value) });
                } else {
                  setContactFormData({ ...contactFormData, phoneMobile: e.target.value });
                }
              }}
              placeholder="(555) 987-6543"
            />
          </div>

          {/* Additional Contact Methods */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Additional Contact Methods
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddMethodModal(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            
            {contactFormData.additionalContacts.length > 0 ? (
              <div className="space-y-2">
                {contactFormData.additionalContacts.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {method.type === 'phone' && <Phone className="w-4 h-4 text-slate-400" />}
                      {method.type === 'fax' && <Printer className="w-4 h-4 text-slate-400" />}
                      {method.type === 'email' && <Mail className="w-4 h-4 text-slate-400" />}
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{method.label}</span>
                        <p className="text-sm text-slate-900 dark:text-white">{method.value}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMethod(method.id)}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded transition-colors"
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

          <Textarea
            label="Notes"
            value={contactFormData.notes}
            onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Add Contact Method Modal */}
      <Modal
        isOpen={showAddMethodModal}
        onClose={() => {
          setShowAddMethodModal(false);
          setNewMethodType('phone');
          setNewMethodLabel('');
          setNewMethodValue('');
          setMethodValidationError(null);
        }}
        title="Add Contact Method"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddMethodModal(false);
                setNewMethodType('phone');
                setNewMethodLabel('');
                setNewMethodValue('');
                setMethodValidationError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMethod}>
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
              label={newMethodType === 'email' ? 'Email Address *' : newMethodType === 'fax' ? 'Fax Number *' : 'Phone Number *'}
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

      {/* Sales Rep Migration Modal */}
      <Modal
        isOpen={showSalesRepMigrationModal}
        onClose={() => setShowSalesRepMigrationModal(false)}
        title="Sales Reps Reassigned"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setShowSalesRepMigrationModal(false)}>
            OK
          </Button>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
            {migrationMessage}
          </p>
        </div>
      </Modal>

      {/* Sales Rep Mode Change Modal */}
      <Modal
        isOpen={showModeChangeModal}
        onClose={() => setShowModeChangeModal(false)}
        title="Assignment Mode Changed"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setShowModeChangeModal(false)}>
            OK
          </Button>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
            {modeChangeMessage}
          </p>
        </div>
      </Modal>
    </Page>
  );
}