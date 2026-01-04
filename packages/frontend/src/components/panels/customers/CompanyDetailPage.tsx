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
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, ConfirmModal } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { useClientsStore, useUsersStore, useToast, useNavigationGuardStore, type Company } from '@/contexts';

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
  type?: 'text' | 'tel' | 'url' | 'textarea';
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
  const { companies, contacts, updateCompany, deleteCompany } = useClientsStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());

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
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Company not found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">This company may have been deleted.</p>
            <Button variant="primary" className="mt-4" onClick={() => navigate('/clients/companies')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Companies
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const handleFieldSave = (field: keyof Company, value: string) => {
    updateCompany(company.id, { [field]: value || undefined });
    toast.success('Updated', 'Company information saved');
  };

  const handleAddressSave = (field: string, value: string) => {
    updateCompany(company.id, {
      address: {
        street: company.address?.street || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        zip: company.address?.zip || '',
        [field]: value,
      },
    });
    toast.success('Updated', 'Address saved');
  };

  const handleDelete = () => {
    deleteCompany(company.id);
    toast.success('Deleted', company.name + ' has been removed');
    navigate('/clients/companies');
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
          {/* Header Card - Compact */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <InlineField
                    label="Company Name"
                    value={company.name}
                    onSave={(v) => handleFieldSave('name', v)}
                    placeholder="Enter company name"
                    onEditingChange={handleEditingChange('name')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
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
            </CardContent>
          </Card>

          {/* Address Section - Collapsible */}
          <CollapsibleSection
            title="Address"
            icon={<MapPin className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <InlineField
                label="Street"
                value={company.address?.street || ''}
                onSave={(v) => handleAddressSave('street', v)}
                placeholder="123 Main Street"
                onEditingChange={handleEditingChange('street')}
              />
              <div className="grid grid-cols-3 gap-3">
                <InlineField
                  label="City"
                  value={company.address?.city || ''}
                  onSave={(v) => handleAddressSave('city', v)}
                  placeholder="New York"
                  onEditingChange={handleEditingChange('city')}
                />
                <InlineField
                  label="State"
                  value={company.address?.state || ''}
                  onSave={(v) => handleAddressSave('state', v)}
                  placeholder="NY"
                  onEditingChange={handleEditingChange('state')}
                />
                <InlineField
                  label="ZIP"
                  value={company.address?.zip || ''}
                  onSave={(v) => handleAddressSave('zip', v)}
                  placeholder="10001"
                  onEditingChange={handleEditingChange('zip')}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Contacts Section - Collapsible, Collapsed by Default */}
          <CollapsibleSection
            title="Contacts"
            icon={<Users className="w-4 h-4 text-slate-500" />}
            badge={companyContacts.length}
            defaultOpen={false}
          >
            <div className="flex justify-end mb-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/clients/contacts?company=' + company.id)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Contact
              </Button>
            </div>

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

          {/* Notes Section - Collapsible */}
          <CollapsibleSection
            title="Notes"
            icon={<FileText className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
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

        {/* Right Column - Tasks & Quick Info */}
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

          {/* Quick Stats - Optional placeholder for future */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Info</h3>
              <div className="space-y-2">
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
            </CardContent>
          </Card>
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
    </Page>
  );
}