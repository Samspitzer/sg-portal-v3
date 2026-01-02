import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, ConfirmModal } from '@/components/common';
import { useClientsStore, useToast, useNavigationGuardStore, CONTACT_ROLES, type Contact } from '@/contexts';

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
      // Cycle focus between buttons
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
      // Enter on focused button triggers it
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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div 
        className="relative z-10 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Unsaved Changes
          </h3>
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

// Inline Editable Field Component
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
    const currentIndex = Array.from(focusableElements).findIndex(el => el === fieldRef.current || el.contains(fieldRef.current));
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
    // Don't process keys when modal is open
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <div className="flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                autoFocus
                className="flex-1 px-3 py-2 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className="flex-1 px-3 py-2 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            <button
              onClick={handleSave}
              tabIndex={-1}
              className="p-2 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg"
              title="Save (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => hasChanges ? setShowModal(true) : setIsEditing(false)}
              tabIndex={-1}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className={clsx(
          'text-sm',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'
        )}>
          {value || placeholder || 'Click to add...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

// Role Selector
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
    const currentIndex = Array.from(focusableElements).findIndex(el => el === fieldRef.current || el.contains(fieldRef.current));
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
    // Don't process keys when modal is open
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <div className="flex items-center gap-2">
            <select
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                handleSave(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-2 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">No role assigned</option>
              {CONTACT_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button
              onClick={() => hasChanges ? setShowModal(true) : setIsEditing(false)}
              tabIndex={-1}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-slate-400" />
        <span className={clsx(
          'text-sm',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'
        )}>
          {value || 'Click to assign role...'}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}

// Company Selector
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
  companies: { id: string; name: string }[];
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const selectedCompany = companies.find(c => c.id === value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  useEffect(() => {
    onEditingChange?.(isEditing, hasChanges);
  }, [isEditing, hasChanges, onEditingChange]);

  const moveToNextField = () => {
    const focusableElements = document.querySelectorAll('[data-inline-field="true"]');
    const currentIndex = Array.from(focusableElements).findIndex(el => el === fieldRef.current || el.contains(fieldRef.current));
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
    // Don't process keys when modal is open
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <div className="flex items-center gap-2">
            <select
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                handleSave(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-2 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a company</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <button
              onClick={() => hasChanges ? setShowModal(true) : setIsEditing(false)}
              tabIndex={-1}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className={clsx(
          'text-sm',
          selectedCompany ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'
        )}>
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
  
  const contact = contacts.find(c => c.id === id);
  const company = contact ? companies.find(c => c.id === contact.companyId) : null;

  // Track if any field is being edited with changes
  const hasUnsavedEdits = Array.from(editingFields.values()).some(hasChanges => hasChanges);
  
  // Register with navigation guard
  const { setGuard, clearGuard } = useNavigationGuardStore();
  
  useEffect(() => {
    setGuard(hasUnsavedEdits);
    return () => clearGuard();
  }, [hasUnsavedEdits, setGuard, clearGuard]);

  const handleEditingChange = useCallback((fieldName: string) => {
    return (isEditing: boolean, hasChanges: boolean) => {
      setEditingFields(prev => {
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
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              Contact not found
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              This contact may have been deleted.
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => navigate('/clients/contacts')}
            >
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
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/clients/contacts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-lg font-semibold text-accent-600 dark:text-accent-400">
                  {contact.firstName[0]}{contact.lastName[0]}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Contact Info Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </h3>
              <InlineField
                label="Notes"
                value={contact.notes || ''}
                onSave={(v) => handleFieldSave('notes', v)}
                type="textarea"
                placeholder="Add notes about this contact..."
                onEditingChange={handleEditingChange('notes')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Company Info */}
        <div className="space-y-6">
          {/* Company Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Company
              </h3>
              {company ? (
                <div
                  onClick={() => navigate('/clients/companies/' + company.id)}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {company.name}
                      </div>
                      {company.phone && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {company.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No company assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Card - Placeholder */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Coming soon...</p>
              </div>
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