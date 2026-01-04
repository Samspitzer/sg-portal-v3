import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CalendarClock,
  Plus,
  AlertCircle,
  Search,
  ChevronDown,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, ConfirmModal, Modal, Input } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, CONTACT_ROLES, type Contact } from '@/contexts';
import { useDropdownKeyboard } from '@/hooks';

// Unsaved Changes Modal with Save option and focus trapping
function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}: {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const discardRef = useRef<HTMLButtonElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && keepEditingRef.current) {
      keepEditingRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (document.activeElement === discardRef.current) {
        keepEditingRef.current?.focus();
      } else if (document.activeElement === keepEditingRef.current) {
        saveRef.current?.focus();
      } else {
        discardRef.current?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (document.activeElement === discardRef.current) {
        onDiscard();
      } else if (document.activeElement === keepEditingRef.current) {
        onCancel();
      } else if (document.activeElement === saveRef.current) {
        onSave();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative z-10 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Unsaved Changes</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex justify-end gap-3">
          <button
            ref={discardRef}
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 focus:outline-none focus:ring-2 focus:ring-danger-500 transition-colors"
          >
            Discard
          </button>
          <button
            ref={keepEditingRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
          >
            Keep Editing
          </button>
          <button
            ref={saveRef}
            onClick={onSave}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
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
  type?: 'text' | 'tel' | 'email' | 'textarea';
  placeholder?: string;
  icon?: React.ElementType;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChange?.(isEditing, hasChanges);
  }, [isEditing, hasChanges, onEditingChange]);

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

    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
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
            {type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          onSave={handleSave}
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
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Role options including "No role assigned"
  const roleOptions = useMemo(() => ['', ...CONTACT_ROLES], []);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChange?.(isEditing, hasChanges);
  }, [isEditing, hasChanges, onEditingChange]);

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
        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
        <span className={clsx('text-sm', value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}>
          {value || 'Click to assign role...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

// Company Form Data for Add Company Modal
interface CompanyFormData {
  name: string;
  phone: string;
  website: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  salesRepId: string;
}

const initialCompanyFormData: CompanyFormData = {
  name: '',
  phone: '',
  website: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
  salesRepId: '',
};

// Company Selector with Search and Add New
function CompanyField({
  label,
  value,
  onSave,
  companies,
  onEditingChange,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  companies: { id: string; name: string; phone?: string }[];
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const { addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Company search state
  const [companySearch, setCompanySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Add Company modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);
  
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
    onEditingChange?.(isEditing, hasChanges);
  }, [isEditing, hasChanges, onEditingChange]);

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
    onSave(newValue);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
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

  const handleSaveNewCompany = () => {
    if (!companyFormData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }

    const companyData = {
      name: companyFormData.name.trim(),
      phone: companyFormData.phone || undefined,
      website: companyFormData.website || undefined,
      address:
        companyFormData.street || companyFormData.city || companyFormData.state || companyFormData.zip
          ? {
              street: companyFormData.street,
              city: companyFormData.city,
              state: companyFormData.state,
              zip: companyFormData.zip,
            }
          : undefined,
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
          onClose={closeAddCompanyModal}
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
                onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
              <Input
                label="Website"
                value={companyFormData.website}
                onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <Input
              label="Street Address"
              value={companyFormData.street}
              onChange={(e) => setCompanyFormData({ ...companyFormData, street: e.target.value })}
              placeholder="123 Main Street"
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="City"
                value={companyFormData.city}
                onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                placeholder="New York"
              />
              <Input
                label="State"
                value={companyFormData.state}
                onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                placeholder="NY"
              />
              <Input
                label="ZIP"
                value={companyFormData.zip}
                onChange={(e) => setCompanyFormData({ ...companyFormData, zip: e.target.value })}
                placeholder="10001"
              />
            </div>

            {activeUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sales Rep
                </label>
                <select
                  value={companyFormData.salesRepId}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, salesRepId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a sales rep (optional)</option>
                  {activeUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={companyFormData.notes}
                onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </Modal>
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { companies, contacts, updateContact, deleteContact } = useClientsStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());

  const contact = contacts.find((c) => c.id === id);
  const company = contact ? companies.find((c) => c.id === contact.companyId) : null;

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

  if (!contact) {
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
  };

  const handleDelete = () => {
    deleteContact(contact.id);
    toast.success('Deleted', fullName + ' has been removed');
    navigate('/clients/contacts');
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Contact Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header Card - Compact */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-lg font-semibold text-accent-600 dark:text-accent-400 flex-shrink-0">
                  {contact.firstName[0]}
                  {contact.lastName[0]}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
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
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <RoleField
                  label="Role"
                  value={contact.role || ''}
                  onSave={(v) => handleFieldSave('role', v)}
                  onEditingChange={handleEditingChange('role')}
                />
                <CompanyField
                  label="Company"
                  value={contact.companyId}
                  onSave={(v) => handleFieldSave('companyId', v)}
                  companies={companies}
                  onEditingChange={handleEditingChange('company')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info Section - Collapsible */}
          <CollapsibleSection
            title="Contact Information"
            icon={<Phone className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InlineField
                label="Email"
                value={contact.email || ''}
                onSave={(v) => handleFieldSave('email', v)}
                type="email"
                placeholder="email@example.com"
                icon={Mail}
                onEditingChange={handleEditingChange('email')}
              />
              <InlineField
                label="Office Phone"
                value={contact.phoneOffice || ''}
                onSave={(v) => handleFieldSave('phoneOffice', v)}
                type="tel"
                placeholder="(555) 123-4567"
                icon={Phone}
                onEditingChange={handleEditingChange('phoneOffice')}
              />
              <InlineField
                label="Mobile Phone"
                value={contact.phoneMobile || ''}
                onSave={(v) => handleFieldSave('phoneMobile', v)}
                type="tel"
                placeholder="(555) 987-6543"
                icon={Smartphone}
                onEditingChange={handleEditingChange('phoneMobile')}
              />
            </div>
          </CollapsibleSection>

          {/* Notes Section - Collapsible */}
          <CollapsibleSection
            title="Notes"
            icon={<FileText className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
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

        {/* Right Column - Tasks & Company Info */}
        <div className="space-y-4">
          {/* Upcoming Tasks */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-slate-500" />
                  Upcoming Tasks
                </h3>
                <Button variant="secondary" size="sm">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-center py-8 text-slate-400">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming tasks</p>
                <p className="text-xs mt-1">Tasks will appear here</p>
              </div>
            </CardContent>
          </Card>

          {/* Company Card */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Company</h3>
              {company ? (
                <div
                  onClick={() => navigate('/clients/companies/' + company.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">{company.name}</div>
                    {company.phone && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {company.phone}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Company was deleted or not assigned - show selector to reassign
                <div className="space-y-3">
                  {contact.companyId && (
                    <div className="p-3 rounded-lg border border-danger-300 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/20 mb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 flex-shrink-0" />
                        <span className="text-sm text-danger-700 dark:text-danger-400">
                          Previous company was deleted
                        </span>
                      </div>
                    </div>
                  )}
                  <CompanyField
                    label="Assign Company"
                    value={contact.companyId}
                    onSave={(v) => handleFieldSave('companyId', v)}
                    companies={companies}
                    onEditingChange={handleEditingChange('companyId')}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </Page>
  );
}