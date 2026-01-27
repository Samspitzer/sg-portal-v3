import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Check,
  X,
  Pencil,
  Briefcase,
  Plus,
  AlertCircle,
  Search,
  ChevronDown,
  ArrowRightLeft,
  AlertTriangle,
  Printer,
  MapPin,
  Info,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, ConfirmModal, Modal, Input, UnsavedChangesModal, Select, Textarea, AddressInput } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { DuplicateCompanyModal } from '@/components/common/DuplicateCompanyModal';
import { EntityTasksSection } from '@/components/common/EntityTasksSection';
import { TaskDetailPanel } from '@/components/panels/TasksPage';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, useFieldsStore, type Contact } from '@/contexts';
import { useTaskStore, type Task, type TaskInput } from '@/contexts/taskStore';
import { useDropdownKeyboard, useDocumentTitle, useContactBySlug, getCompanyUrl } from '@/hooks';
import { validateEmail, validatePhone, formatPhoneNumber } from '@/utils/validation';

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

// Compact Inline Editable Field Component
function InlineField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
  icon: Icon,
  onEditingChange,
  needsReview,
  onConfirm,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'textarea';
  placeholder?: string;
  icon?: React.ElementType;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  needsReview?: boolean;
  onConfirm?: () => void;
}) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Real-time validation
  const getValidationError = (val: string): string | null => {
    if (!val) return null;
    
    if (type === 'tel') {
      return validatePhone(val) ? null : 'Invalid phone number';
    }
    if (type === 'email') {
      return validateEmail(val) ? null : 'Invalid email address';
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    if (type === 'tel') {
      // Only format when adding digits, not when deleting
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
    onConfirm?.();
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

  // Handle confirm without changes (just mark as reviewed)
  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
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
              onClick={() => (validationError ? handleDiscard(true) : hasChanges ? setShowModal(true) : setIsEditing(false))}
              tabIndex={-1}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {validationError && (
            <p className="text-xs text-danger-600 dark:text-danger-400">{validationError}</p>
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
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleViewKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
          {needsReview && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Needs Review
            </span>
          )}
        </div>
        {needsReview && onConfirm && (
          <button
            onClick={handleConfirmClick}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium flex items-center gap-1"
            title="Confirm this value is correct"
          >
            <Check className="w-3 h-3" />
            Confirm
          </button>
        )}
      </div>
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

// Role Selector with Custom Dropdown (Arrow keys navigate, Enter selects)
function RoleField({
  label,
  value,
  onSave,
  onEditingChange,
  needsReview,
  onConfirm,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  needsReview?: boolean;
  onConfirm?: () => void;
}) {
  const { contactRoles } = useFieldsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  // Role options including "No role assigned"
  const roleOptions = useMemo(() => ['', ...contactRoles], [contactRoles]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const dropdownKeyboard = useDropdownKeyboard({
    items: roleOptions,
    isOpen: showDropdown,
    onSelect: (role) => {
      if (role !== undefined) {
        setEditValue(role);
        setShowDropdown(false);
      }
    },
    onClose: () => setShowDropdown(false),
  });

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
    onSave(editValue);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
    onConfirm?.(); // Mark as confirmed when saved
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
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

    // Handle dropdown navigation
    if (showDropdown) {
      dropdownKeyboard.handleKeyDown(e);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        return;
      }
    }

    // Enter when dropdown is closed - show modal if changes
    if (e.key === 'Enter' && !showDropdown) {
      e.preventDefault();
      if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      if (showDropdown) {
        setShowDropdown(false);
      } else if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
      if (hasChanges) {
        setPendingTab(true);
        setShowModal(true);
      } else {
        setIsEditing(false);
        moveToNextField();
      }
    } else if (e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
    }
  };

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
      setTimeout(() => setShowDropdown(true), 0);
    }
  };

  const selectRole = (role: string) => {
    setEditValue(role);
    setShowDropdown(false);
  };

  if (isEditing) {
    return (
      <>
        <div className="space-y-1" data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <button
                ref={inputRef as any}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-left flex items-center justify-between"
              >
                <span className={editValue ? '' : 'text-slate-400'}>
                  {editValue || 'No role assigned'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={handleSave}
                tabIndex={-1}
                className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg"
                title="Save (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => (hasChanges ? setShowModal(true) : setIsEditing(false))}
                tabIndex={-1}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {roleOptions.map((role, index) => (
                  <button
                    key={role || 'none'}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm',
                      index === dropdownKeyboard.highlightedIndex
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
                      role === editValue && 'font-medium'
                    )}
                  >
                    {role || 'No role assigned'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onCancel={handleKeepEditing}
        />
      </>
    );
  }

  // Handle confirm without changes (just mark as reviewed)
  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
  };

  return (
    <div
      data-inline-field="true"
      ref={fieldRef}
      tabIndex={0}
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleViewKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
          {needsReview && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Needs Review
            </span>
          )}
        </div>
        {needsReview && onConfirm && (
          <button
            onClick={handleConfirmClick}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium flex items-center gap-1"
            title="Confirm this value is correct"
          >
            <Check className="w-3 h-3" />
            Confirm
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
        <span className={clsx('text-sm', value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}>
          {value || 'Click to assign role...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

// Secondary address interface for Add Company Modal
interface SecondaryAddress {
  id: string;
  label: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

// Company Form Data for Add Company Modal
interface CompanyFormData {
  name: string;
  phone: string;
  website: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  salesRepId: string;
  secondaryAddresses: SecondaryAddress[];
}

const initialCompanyFormData: CompanyFormData = {
  name: '',
  phone: '',
  website: '',
  street: '',
  suite: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
  salesRepId: '',
  secondaryAddresses: [],
};

// Company Selector with Search and Add New
function CompanyField({
  label,
  value,
  onSave,
  onEditingChange,
  onCompanyChange,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  onCompanyChange?: (oldCompanyId: string, newCompanyId: string) => void;
}) {
  const { companies, addCompany, updateCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;
  
  // Company search state
  const [companySearch, setCompanySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Add Company modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);
  
  // Duplicate company detection for Add Company modal
  const [showDuplicateCompanyModal, setShowDuplicateCompanyModal] = useState(false);
  const [duplicateCompanyType, setDuplicateCompanyType] = useState<'exact' | 'different-address' | 'different-website'>('exact');
  const [duplicateCompany, setDuplicateCompany] = useState<{
    id: string;
    slug?: string;
    name: string;
    phone?: string;
    website?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null>(null);

  // Secondary address modal state for Add Company
  const [showSecondaryAddressModal, setShowSecondaryAddressModal] = useState(false);
  const [secondaryAddressLabel, setSecondaryAddressLabel] = useState('');
  const [secondaryAddressData, setSecondaryAddressData] = useState({
    street: '',
    suite: '',
    city: '',
    state: '',
    zip: '',
  });
  
  const selectedCompany = companies.find((c) => c.id === value);
  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  useEffect(() => {
    setEditValue(value);
    if (value) {
      const company = companies.find(c => c.id === value);
      setCompanySearch(company?.name || '');
    }
  }, [value, companies]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    return companies.filter((company) =>
      company.name.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  const showAddCompanyOption = useMemo(() => {
    if (!companySearch.trim()) return false;
    const exactMatch = companies.some(
      (company) => company.name.toLowerCase() === companySearch.toLowerCase()
    );
    return !exactMatch;
  }, [companies, companySearch]);

  // Keyboard navigation for dropdown
  const dropdownKeyboard = useDropdownKeyboard({
    items: filteredCompanies,
    isOpen: showDropdown,
    onSelect: (company, index) => {
      if (index === -1 && showAddCompanyOption) {
        openAddCompanyModal();
      } else if (company) {
        selectCompany(company);
      }
    },
    onClose: () => setShowDropdown(false),
    hasAddOption: showAddCompanyOption,
  });

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
    const oldValue = value;
    onSave(newValue);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
    
    // Notify parent about company change
    if (oldValue && newValue && oldValue !== newValue) {
      onCompanyChange?.(oldValue, newValue);
    }
    
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = () => {
    setEditValue(value);
    setCompanySearch(selectedCompany?.name || '');
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
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
    if (showModal || showAddCompanyModal) {
      return;
    }

    // Handle dropdown navigation
    if (showDropdown) {
      dropdownKeyboard.handleKeyDown(e);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        return;
      }
    }

    // Enter when dropdown is closed - show modal if changes
    if (e.key === 'Enter' && !showDropdown) {
      e.preventDefault();
      if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      if (showDropdown) {
        setShowDropdown(false);
      } else if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
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

  const selectCompany = (company: { id: string; name: string }) => {
    setEditValue(company.id);
    setCompanySearch(company.name);
    setShowDropdown(false);
    // Don't auto-save - let user confirm with checkmark or Tab
  };

  const openAddCompanyModal = () => {
    setCompanyFormData({
      ...initialCompanyFormData,
      name: companySearch.trim(),
    });
    setShowAddCompanyModal(true);
    setShowDropdown(false);
  };

  const closeAddCompanyModal = () => {
    setShowAddCompanyModal(false);
    setCompanyFormData(initialCompanyFormData);
  };

  // Check for duplicate company by name and determine type
  const checkForDuplicateCompany = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    const existing = companies.find((company) => company.name.toLowerCase() === normalizedName);
    
    if (!existing) return null;

    // Check if addresses match
    const newAddress = {
      street: companyFormData.street.trim().toLowerCase(),
      city: companyFormData.city.trim().toLowerCase(),
      state: companyFormData.state.trim().toLowerCase(),
      zip: companyFormData.zip.trim(),
    };
    const existingAddress = {
      street: (existing.address?.street || '').trim().toLowerCase(),
      city: (existing.address?.city || '').trim().toLowerCase(),
      state: (existing.address?.state || '').trim().toLowerCase(),
      zip: (existing.address?.zip || '').trim(),
    };

    const addressMatches = 
      newAddress.street === existingAddress.street &&
      newAddress.city === existingAddress.city &&
      newAddress.state === existingAddress.state &&
      newAddress.zip === existingAddress.zip;

    // Check if websites match (both empty counts as match)
    const newWebsite = (companyFormData.website || '').trim().toLowerCase();
    const existingWebsite = (existing.website || '').trim().toLowerCase();
    const websiteMatches = newWebsite === existingWebsite;

    // Determine duplicate type
    let type: 'exact' | 'different-address' | 'different-website' = 'exact';
    if (!addressMatches) {
      type = 'different-address';
    } else if (!websiteMatches) {
      type = 'different-website';
    }

    return { existing, type };
  };

  const handleSaveNewCompany = () => {
    if (!companyFormData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }

    // Check for duplicate
    const duplicateCheck = checkForDuplicateCompany(companyFormData.name);
    if (duplicateCheck) {
      const { existing, type } = duplicateCheck;
      setDuplicateCompany({
        id: existing.id,
        slug: existing.slug,
        name: existing.name,
        phone: existing.phone,
        website: existing.website,
        street: existing.address?.street,
        city: existing.address?.city,
        state: existing.address?.state,
        zip: existing.address?.zip,
      });
      setDuplicateCompanyType(type);
      setShowDuplicateCompanyModal(true);
      return;
    }

    // No duplicate, create company
    createNewCompany();
  };

  const createNewCompany = () => {
    // Build secondary addresses array
    const addresses = companyFormData.secondaryAddresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      street: addr.street,
      suite: addr.suite || undefined,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
    }));

    const companyData = {
      name: companyFormData.name.trim(),
      phone: companyFormData.phone || undefined,
      website: companyFormData.website || undefined,
      address:
        companyFormData.street || companyFormData.city || companyFormData.state || companyFormData.zip
          ? {
              street: companyFormData.street,
              suite: companyFormData.suite || undefined,
              city: companyFormData.city,
              state: companyFormData.state,
              zip: companyFormData.zip,
            }
          : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      notes: companyFormData.notes || undefined,
      salesRepId: companyFormData.salesRepId || undefined,
    };

    addCompany(companyData);
    toast.success('Created', companyFormData.name + ' has been added');
    
    // Find the newly created company and select it
    setTimeout(() => {
      const newCompany = useClientsStore.getState().companies.find(
        c => c.name.toLowerCase() === companyFormData.name.trim().toLowerCase()
      );
      if (newCompany) {
        selectCompany(newCompany);
      }
    }, 100);
    
    closeAddCompanyModal();
  };

  const handleViewExistingCompany = () => {
    if (duplicateCompany) {
      // Select existing company for this contact
      selectCompany({ id: duplicateCompany.id, name: duplicateCompany.name });
    }
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    closeAddCompanyModal();
  };

  const handleAddAsNewLocation = () => {
    if (duplicateCompany) {
      const existingCompany = companies.find(c => c.id === duplicateCompany.id);
      
      if (existingCompany) {
        const newAddress = {
          id: crypto.randomUUID(),
          label: companyFormData.city && companyFormData.state ? `${companyFormData.city}, ${companyFormData.state}` : 'Office',
          street: companyFormData.street,
          suite: companyFormData.suite || undefined,
          city: companyFormData.city,
          state: companyFormData.state,
          zip: companyFormData.zip,
        };

        const existingAddresses = existingCompany.addresses || [];
        updateCompany(duplicateCompany.id, {
          addresses: [...existingAddresses, newAddress],
        });

        toast.success('Location Added', `New office added to ${existingCompany.name}`);
        
        // Select this company for the contact
        selectCompany({ id: existingCompany.id, name: existingCompany.name });
      }
    }
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    closeAddCompanyModal();
  };

  const handleCreateSeparateCompany = () => {
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    createNewCompany();
  };

  const handleCloseDuplicateCompanyModal = () => {
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
  };

  // Secondary address handlers for Add Company modal
  const openSecondaryAddressModal = () => {
    setSecondaryAddressLabel('');
    setSecondaryAddressData({ street: '', suite: '', city: '', state: '', zip: '' });
    setShowSecondaryAddressModal(true);
  };

  const handleAddSecondaryAddress = () => {
    if (!secondaryAddressLabel.trim()) {
      toast.error('Error', 'Label is required');
      return;
    }
    if (!secondaryAddressData.street && !secondaryAddressData.city) {
      toast.error('Error', 'Please enter at least street or city');
      return;
    }

    const newAddress: SecondaryAddress = {
      id: crypto.randomUUID(),
      label: secondaryAddressLabel.trim(),
      street: secondaryAddressData.street,
      suite: secondaryAddressData.suite || undefined,
      city: secondaryAddressData.city,
      state: secondaryAddressData.state,
      zip: secondaryAddressData.zip,
    };

    setCompanyFormData({
      ...companyFormData,
      secondaryAddresses: [...companyFormData.secondaryAddresses, newAddress],
    });

    setShowSecondaryAddressModal(false);
  };

  const handleRemoveSecondaryAddress = (addressId: string) => {
    setCompanyFormData({
      ...companyFormData,
      secondaryAddresses: companyFormData.secondaryAddresses.filter(a => a.id !== addressId),
    });
  };

  if (isEditing) {
    return (
      <>
        <div className="space-y-1" data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowDropdown(true);
                    setEditValue('');
                    dropdownKeyboard.resetHighlight();
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search companies..."
                  autoFocus
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <button
                onClick={() => handleSave(editValue)}
                tabIndex={-1}
                className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg"
                title="Save (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => (hasChanges ? setShowModal(true) : setIsEditing(false))}
                tabIndex={-1}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {showAddCompanyOption && (
                  <button
                    type="button"
                    onClick={openAddCompanyModal}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm text-brand-600 dark:text-brand-400 font-medium flex items-center gap-2 border-b border-slate-200 dark:border-slate-700',
                      dropdownKeyboard.highlightedIndex === 0
                        ? 'bg-brand-50 dark:bg-brand-900/20'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add "{companySearch.trim()}" as new company
                  </button>
                )}
                {filteredCompanies.length === 0 && !showAddCompanyOption ? (
                  <div className="px-4 py-3 text-sm text-slate-500">No companies found</div>
                ) : (
                  filteredCompanies.map((company, index) => {
                    const highlightIndex = showAddCompanyOption ? index + 1 : index;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => selectCompany(company)}
                        className={clsx(
                          'w-full px-4 py-2 text-left text-sm',
                          highlightIndex === dropdownKeyboard.highlightedIndex
                            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                        )}
                      >
                        <div className="font-medium">{company.name}</div>
                        {company.phone && (
                          <div className="text-xs text-slate-500">{company.phone}</div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={() => handleSave(editValue)}
          onDiscard={handleDiscard}
          onCancel={handleKeepEditing}
        />

        {/* Add Company Modal */}
        <Modal
          isOpen={showAddCompanyModal}
          onClose={() => {
            if (showSecondaryAddressModal || showDuplicateCompanyModal) return;
            closeAddCompanyModal();
          }}
          title="Add New Company"
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={closeAddCompanyModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveNewCompany}>
                Create Company
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Company Name"
              value={companyFormData.name}
              onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
              placeholder="Enter company name"
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={companyFormData.phone}
                onChange={(e) => {
                  const currentDigits = companyFormData.phone.replace(/\D/g, '').length;
                  const newDigits = e.target.value.replace(/\D/g, '').length;
                  if (newDigits > currentDigits) {
                    setCompanyFormData({ ...companyFormData, phone: formatPhoneNumber(e.target.value) });
                  } else {
                    setCompanyFormData({ ...companyFormData, phone: e.target.value });
                  }
                }}
                placeholder="(555) 123-4567"
              />
              <Input
                label="Website"
                value={companyFormData.website}
                onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Main Office Address
              </label>
              <AddressInput
                street={companyFormData.street}
                suite={companyFormData.suite}
                city={companyFormData.city}
                state={companyFormData.state}
                zip={companyFormData.zip}
                autoSave
                onSave={(address) => {
                  setCompanyFormData({
                    ...companyFormData,
                    street: address.street,
                    suite: address.suite || '',
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                  });
                }}
              />
            </div>

            {/* Secondary Addresses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Additional Offices
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openSecondaryAddressModal}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Office
                </Button>
              </div>
              
              {companyFormData.secondaryAddresses.length > 0 ? (
                <div className="space-y-2">
                  {companyFormData.secondaryAddresses.map((addr) => (
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
                        className="p-1 text-slate-400 hover:text-danger-600 rounded transition-colors"
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

            {activeUsers.length > 0 && (
              <Select
                label="Sales Rep"
                value={companyFormData.salesRepId}
                onChange={(e) => setCompanyFormData({ ...companyFormData, salesRepId: e.target.value })}
                options={activeUsers.map((user) => ({ value: user.id, label: user.name }))}
                placeholder="Select a sales rep (optional)"
              />
            )}

            <Textarea
              label="Notes"
              value={companyFormData.notes}
              onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>
        </Modal>

        {/* Add Secondary Address Modal */}
        <Modal
          isOpen={showSecondaryAddressModal}
          onClose={() => setShowSecondaryAddressModal(false)}
          title="Add Additional Office"
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowSecondaryAddressModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddSecondaryAddress}>
                Add Office
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Office Label *"
              value={secondaryAddressLabel}
              onChange={(e) => setSecondaryAddressLabel(e.target.value)}
              placeholder="e.g., Warehouse, Branch Office, Distribution Center"
              autoFocus
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Address
              </label>
              <AddressInput
                street={secondaryAddressData.street}
                suite={secondaryAddressData.suite}
                city={secondaryAddressData.city}
                state={secondaryAddressData.state}
                zip={secondaryAddressData.zip}
                autoSave
                onSave={(address) => {
                  setSecondaryAddressData({
                    street: address.street,
                    suite: address.suite || '',
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                  });
                }}
              />
            </div>
          </div>
        </Modal>

        {/* Duplicate Company Modal */}
        <DuplicateCompanyModal
          isOpen={showDuplicateCompanyModal}
          duplicateType={duplicateCompanyType}
          existingCompany={duplicateCompany}
          newCompanyInfo={{
            name: companyFormData.name,
            phone: companyFormData.phone,
            website: companyFormData.website,
            street: companyFormData.street,
            city: companyFormData.city,
            state: companyFormData.state,
            zip: companyFormData.zip,
          }}
          onClose={handleCloseDuplicateCompanyModal}
          onViewExisting={handleViewExistingCompany}
          onAddAsNewLocation={handleAddAsNewLocation}
          onCreateSeparate={handleCreateSeparateCompany}
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
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        <span
          className={clsx('text-sm', selectedCompany ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}
        >
          {selectedCompany?.name || 'Click to assign company...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

export function ContactDetailPage() {
  // Use slug-based routing hook
  const { contact, company, notFound } = useContactBySlug();
  const navigate = useNavigate();
  const toast = useToast();
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
                <InlineField
                  label="First Name"
                  value={contact.firstName}
                  onSave={(v) => handleFieldSave('firstName', v)}
                  placeholder="First name"
                  onEditingChange={handleEditingChange('firstName')}
                />
                <InlineField
                  label="Last Name"
                  value={contact.lastName}
                  onSave={(v) => handleFieldSave('lastName', v)}
                  placeholder="Last name"
                  onEditingChange={handleEditingChange('lastName')}
                />
                <RoleField
                  label="Role"
                  value={contact.role || ''}
                  onSave={(v) => handleFieldSave('role', v)}
                  onEditingChange={handleEditingChange('role')}
                  needsReview={fieldsNeedingReview.has('role')}
                  onConfirm={() => handleFieldConfirm('role')}
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
                  <CompanyField
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
                icon={<MapPin className="w-4 h-4 text-slate-500" />}
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
            icon={<Phone className="w-4 h-4 text-slate-500" />}
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
                <InlineField
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
                <InlineField
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
                <InlineField
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
                  <InlineField
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
            icon={<FileText className="w-4 h-4 text-slate-500" />}
            defaultOpen={false}
          >
            <InlineField
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
              icon={<Info className="w-4 h-4 text-slate-500" />}
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