import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Building2,
  MapPin,
  Upload,
  Image,
  FileText,
  Check,
  Loader2,
  X,
  Eye,
  Phone,
  Globe,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Button, Modal, AddressInput, Input, ConfirmModal } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { useCompanyStore, useToast, useNavigationGuardStore, type CompanyOffice, type LetterheadTemplate } from '@/contexts';
import {
  formatPhoneNumber,
  validatePhone,
  validateEmail,
  validateWebsite,
} from '@/utils/validation';

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

  const handleSave = () => {
    const error = getValidationError(editValue);
    if (error) {
      setValidationError(error);
      toast.error('Invalid Input', error);
      return;
    }
    
    onSave(editValue);
    setIsEditing(false);
    setValidationError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setValidationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
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
            onClick={handleCancel}
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
    );
  }

  return (
    <div
      data-inline-field="true"
      ref={fieldRef}
      tabIndex={0}
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
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

export function CompanySettingsPage() {
  const { 
    company, 
    setCompany, 
    addOffice, 
    updateOffice, 
    deleteOffice, 
    addLetterhead,
    deleteLetterhead,
  } = useCompanyStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [previewLetterhead, setPreviewLetterhead] = useState<LetterheadTemplate | null>(null);

  // Safe getters for arrays (handles undefined for existing localStorage data)
  const offices = company.offices || [];
  const letterheads = company.letterheads || [];

  // Helper to check for duplicate addresses
  const isDuplicateAddress = (
    street: string,
    city: string,
    state: string,
    zip: string,
    excludeOfficeId?: string
  ): { isDuplicate: boolean; existingLabel?: string } => {
    const normalizeStr = (s: string) => s.toLowerCase().trim();
    
    for (const office of offices) {
      if (office.id === excludeOfficeId) continue;
      
      if (
        normalizeStr(office.street) === normalizeStr(street) &&
        normalizeStr(office.city) === normalizeStr(city) &&
        normalizeStr(office.state) === normalizeStr(state) &&
        normalizeStr(office.zip) === normalizeStr(zip)
      ) {
        return { isDuplicate: true, existingLabel: office.label };
      }
    }
    
    return { isDuplicate: false };
  };

  // Track editing fields for navigation guard
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  
  // Track if branding section has unsaved changes
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  
  // Add Office Modal state
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [newOfficeLabel, setNewOfficeLabel] = useState('');
  const [newOfficeAddress, setNewOfficeAddress] = useState({ street: '', suite: '', city: '', state: '', zip: '' });
  
  // Delete Office confirmation
  const [officeToDelete, setOfficeToDelete] = useState<CompanyOffice | null>(null);

  // Add Letterhead Modal state
  const [showAddLetterheadModal, setShowAddLetterheadModal] = useState(false);
  const [newLetterheadName, setNewLetterheadName] = useState('');
  const [newLetterheadData, setNewLetterheadData] = useState<string | null>(null);

  // Delete Letterhead confirmation
  const [letterheadToDelete, setLetterheadToDelete] = useState<LetterheadTemplate | null>(null);
  
  const hasUnsavedEdits = Array.from(editingFields.values()).some((hasChanges) => hasChanges);
  const hasBrandingChanges = pendingLogo !== null;
  const hasAnyChanges = hasUnsavedEdits || hasBrandingChanges;

  const { setGuard, clearGuard } = useNavigationGuardStore();

  useEffect(() => {
    setGuard(hasAnyChanges);
    return () => clearGuard();
  }, [hasAnyChanges, setGuard, clearGuard]);

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

  const handleFieldSave = (field: string, value: string) => {
    setCompany({
      ...company,
      [field]: value || undefined,
    });
    toast.success('Updated', 'Company information saved');
  };

  // Main office address handlers
  const handleMainOfficeAddressSave = (address: { street: string; suite?: string; city: string; state: string; zip: string }) => {
    const mainOffice = offices.find(o => o.isMain);
    
    // Check for duplicate address (exclude current main office)
    if (address.street) {
      const dupCheck = isDuplicateAddress(
        address.street,
        address.city,
        address.state,
        address.zip,
        mainOffice?.id
      );
      if (dupCheck.isDuplicate) {
        toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
        return;
      }
    }

    // If main office exists, update it
    if (mainOffice) {
      updateOffice(mainOffice.id, {
        street: address.street,
        suite: address.suite,
        city: address.city,
        state: address.state,
        zip: address.zip,
      });
    } else {
      // Create new main office
      addOffice({
        label: 'Main Office',
        street: address.street,
        suite: address.suite,
        city: address.city,
        state: address.state,
        zip: address.zip,
        isMain: true,
      });
    }
    toast.success('Updated', 'Main office address saved');
  };

  const handleClearMainOffice = () => {
    const mainOffice = offices.find(o => o.isMain);
    if (mainOffice) {
      deleteOffice(mainOffice.id);
      toast.success('Cleared', 'Main office address removed');
    }
  };

  // Office handlers
  const openAddOfficeModal = () => {
    setNewOfficeLabel('');
    setNewOfficeAddress({ street: '', suite: '', city: '', state: '', zip: '' });
    setShowAddOfficeModal(true);
  };

  const closeAddOfficeModal = () => {
    setShowAddOfficeModal(false);
    setNewOfficeLabel('');
    setNewOfficeAddress({ street: '', suite: '', city: '', state: '', zip: '' });
  };

  const handleAddOffice = () => {
    if (!newOfficeLabel.trim()) {
      toast.error('Error', 'Please enter an office name');
      return;
    }
    if (!newOfficeAddress.street.trim()) {
      toast.error('Error', 'Please enter an address');
      return;
    }

    // Check for duplicate name
    const nameExists = offices.some(
      o => o.label.toLowerCase() === newOfficeLabel.trim().toLowerCase()
    );
    if (nameExists) {
      toast.error('Error', 'An office with this name already exists');
      return;
    }

    // Check for duplicate address
    const dupCheck = isDuplicateAddress(
      newOfficeAddress.street,
      newOfficeAddress.city,
      newOfficeAddress.state,
      newOfficeAddress.zip
    );
    if (dupCheck.isDuplicate) {
      toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
      return;
    }

    addOffice({
      label: newOfficeLabel.trim(),
      street: newOfficeAddress.street,
      suite: newOfficeAddress.suite,
      city: newOfficeAddress.city,
      state: newOfficeAddress.state,
      zip: newOfficeAddress.zip,
      isMain: offices.length === 0, // First office is main
    });

    toast.success('Added', `${newOfficeLabel.trim()} added`);
    closeAddOfficeModal();
  };

  const handleDeleteOffice = () => {
    if (officeToDelete) {
      deleteOffice(officeToDelete.id);
      toast.success('Deleted', `${officeToDelete.label} removed`);
      setOfficeToDelete(null);
    }
  };

  const handleOfficeAddressSave = (officeId: string, address: { street: string; suite?: string; city: string; state: string; zip: string }) => {
    // Check for duplicate address (exclude current office)
    if (address.street) {
      const dupCheck = isDuplicateAddress(
        address.street,
        address.city,
        address.state,
        address.zip,
        officeId
      );
      if (dupCheck.isDuplicate) {
        toast.error('Duplicate Address', `This address already exists as "${dupCheck.existingLabel}"`);
        return;
      }
    }

    updateOffice(officeId, {
      street: address.street,
      suite: address.suite,
      city: address.city,
      state: address.state,
      zip: address.zip,
    });
    toast.success('Updated', 'Address saved');
  };

  // Logo handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please upload a file under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setCompany({ ...company, logo: pendingLogo || undefined });
    setPendingLogo(null);
    setIsLoading(false);
    toast.success('Saved', 'Logo updated');
  };

  const handleDiscardLogo = () => {
    setPendingLogo(null);
  };

  // Letterhead handlers
  const openAddLetterheadModal = () => {
    setNewLetterheadName('');
    setNewLetterheadData(null);
    setShowAddLetterheadModal(true);
  };

  const closeAddLetterheadModal = () => {
    setShowAddLetterheadModal(false);
    setNewLetterheadName('');
    setNewLetterheadData(null);
  };

  const handleLetterheadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type', 'Please upload a PNG, JPG, or PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please upload a file under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLetterheadData(reader.result as string);
        // Auto-fill name from filename if empty
        if (!newLetterheadName) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setNewLetterheadName(nameWithoutExt);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLetterhead = () => {
    if (!newLetterheadName.trim()) {
      toast.error('Error', 'Please enter a template name');
      return;
    }
    if (!newLetterheadData) {
      toast.error('Error', 'Please select a file');
      return;
    }

    addLetterhead(newLetterheadName.trim(), newLetterheadData);
    toast.success('Added', `${newLetterheadName.trim()} template added`);
    closeAddLetterheadModal();
  };

  const handleDeleteLetterhead = () => {
    if (letterheadToDelete) {
      deleteLetterhead(letterheadToDelete.id);
      toast.success('Deleted', `${letterheadToDelete.name} removed`);
      setLetterheadToDelete(null);
    }
  };

  const currentLogo = pendingLogo !== null ? pendingLogo : company.logo;

  // Get main office and additional offices
  const mainOffice = offices.find(o => o.isMain);
  const additionalOffices = offices.filter(o => !o.isMain);
  const addressCount = offices.filter(o => o.street).length;

  const hasAddOfficeChanges = newOfficeLabel.trim() !== '' || newOfficeAddress.street.trim() !== '';
  const hasAddLetterheadChanges = newLetterheadName.trim() !== '' || newLetterheadData !== null;

  return (
    <Page
      title="Company Settings"
      description="Manage your company information, addresses, and branding."
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
                    label="Email"
                    value={company.email || ''}
                    onSave={(v) => handleFieldSave('email', v)}
                    type="email"
                    placeholder="info@example.com"
                    icon={Mail}
                    onEditingChange={handleEditingChange('email')}
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
                </div>
              </div>
            </div>
          </div>

          {/* Addresses Section - Collapsible (matches CompanyDetailPage) */}
          <CollapsibleSection
            title="Addresses"
            icon={<MapPin className="w-4 h-4 text-slate-500" />}
            badge={addressCount > 0 ? addressCount : undefined}
            defaultOpen={true}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddOfficeModal();
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
                  {mainOffice && mainOffice.street && (
                    <button
                      onClick={handleClearMainOffice}
                      className="p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Clear main office address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <AddressInput
                  street={mainOffice?.street || ''}
                  suite={mainOffice?.suite || ''}
                  city={mainOffice?.city || ''}
                  state={mainOffice?.state || ''}
                  zip={mainOffice?.zip || ''}
                  onSave={handleMainOfficeAddressSave}
                />
              </div>

              {/* Additional Addresses */}
              {additionalOffices.map((office) => (
                <div key={office.id} className="relative group pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {office.label}
                    </span>
                    <button
                      onClick={() => setOfficeToDelete(office)}
                      className="p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <AddressInput
                    street={office.street}
                    suite={office.suite || ''}
                    city={office.city}
                    state={office.state}
                    zip={office.zip}
                    onSave={(address) => handleOfficeAddressSave(office.id, address)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Right Column - Branding */}
        <div className="space-y-4">
          {/* Logo Section */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Company Logo"
              icon={<Image className="w-4 h-4 text-slate-500" />}
              action={
                hasBrandingChanges && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDiscardLogo}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Discard
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveLogo}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span className="ml-1">Save</span>
                    </Button>
                  </div>
                )
              }
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-start gap-4">
                <div className={clsx(
                  'w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0',
                  'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                )}>
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt="Company Logo"
                      className="w-full h-full object-contain rounded-xl p-2"
                    />
                  ) : (
                    <Image className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className={clsx(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-lg w-full',
                      'border border-dashed border-slate-300 dark:border-slate-600',
                      'hover:border-brand-400 dark:hover:border-brand-500',
                      'hover:bg-brand-50/50 dark:hover:bg-brand-900/10',
                      'text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400',
                      'transition-colors cursor-pointer text-xs'
                    )}>
                      <Upload className="w-3 h-3" />
                      <span className="font-medium">
                        {currentLogo ? 'Replace' : 'Upload'}
                      </span>
                    </div>
                  </label>
                  {currentLogo && (
                    <button
                      onClick={() => setPendingLogo('')}
                      className="flex items-center justify-center gap-1 w-full px-3 py-1.5 text-xs text-slate-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    PNG, JPG or SVG. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Letterhead Templates Section */}
          <CollapsibleSection
            title="Letterhead Templates"
            icon={<FileText className="w-4 h-4 text-slate-500" />}
            badge={letterheads.length > 0 ? letterheads.length : undefined}
            defaultOpen={true}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddLetterheadModal();
                }}
                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Add letterhead"
              >
                <Plus className="w-4 h-4" />
              </button>
            }
          >
            <div className="space-y-3">
              {letterheads.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No letterhead templates yet
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={openAddLetterheadModal}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Template
                  </Button>
                </div>
              ) : (
                letterheads.map((lh) => {
                  const isPdf = lh.data.startsWith('data:application/pdf');
                  return (
                    <div
                      key={lh.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 group hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div
                        className="w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer overflow-hidden"
                        onClick={() => setPreviewLetterhead(lh)}
                      >
                        {isPdf ? (
                          <FileText className="w-6 h-6 text-red-500" />
                        ) : (
                          <img
                            src={lh.data}
                            alt={lh.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {lh.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {isPdf ? 'PDF' : 'Image'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewLetterhead(lh)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setLetterheadToDelete(lh)}
                          className="p-1.5 text-slate-400 hover:text-danger-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleSection>

          {/* Unsaved Changes Indicator */}
          {hasBrandingChanges && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                You have unsaved logo changes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Office Modal */}
      <Modal
        isOpen={showAddOfficeModal}
        onClose={closeAddOfficeModal}
        title="Add Office Location"
        size="lg"
        hasUnsavedChanges={hasAddOfficeChanges}
        onSaveChanges={handleAddOffice}
        onDiscardChanges={closeAddOfficeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeAddOfficeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddOffice}>
              Add Location
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Location Name"
            value={newOfficeLabel}
            onChange={(e) => setNewOfficeLabel(e.target.value)}
            placeholder="e.g., Branch Office, Warehouse, Job Site"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address
            </label>
            <AddressInput
              street={newOfficeAddress.street}
              suite={newOfficeAddress.suite}
              city={newOfficeAddress.city}
              state={newOfficeAddress.state}
              zip={newOfficeAddress.zip}
              onSave={(address) => setNewOfficeAddress({ ...address, suite: address.suite || '' })}
              autoSave
            />
          </div>
        </div>
      </Modal>

      {/* Delete Office Confirmation */}
      <ConfirmModal
        isOpen={!!officeToDelete}
        onClose={() => setOfficeToDelete(null)}
        onConfirm={handleDeleteOffice}
        title="Delete Address"
        message={`Are you sure you want to delete "${officeToDelete?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Add Letterhead Modal */}
      <Modal
        isOpen={showAddLetterheadModal}
        onClose={closeAddLetterheadModal}
        title="Add Letterhead Template"
        size="md"
        hasUnsavedChanges={hasAddLetterheadChanges}
        onSaveChanges={handleAddLetterhead}
        onDiscardChanges={closeAddLetterheadModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeAddLetterheadModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddLetterhead} disabled={!newLetterheadData}>
              <Plus className="w-4 h-4 mr-1" />
              Add Template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Template Name *"
            value={newLetterheadName}
            onChange={(e) => setNewLetterheadName(e.target.value)}
            placeholder="e.g., Standard Letterhead, Invoice Template"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              File *
            </label>
            {newLetterheadData ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {newLetterheadData.startsWith('data:application/pdf') ? (
                    <FileText className="w-6 h-6 text-red-500" />
                  ) : (
                    <img
                      src={newLetterheadData}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">File selected</p>
                  <button
                    onClick={() => setNewLetterheadData(null)}
                    className="text-xs text-danger-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleLetterheadFileSelect}
                  className="hidden"
                />
                <div className={clsx(
                  'flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg',
                  'border-2 border-dashed border-slate-300 dark:border-slate-600',
                  'hover:border-brand-400 dark:hover:border-brand-500',
                  'hover:bg-brand-50/50 dark:hover:bg-brand-900/10',
                  'text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400',
                  'transition-colors cursor-pointer'
                )}>
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Click to upload</span>
                  <span className="text-xs text-slate-400">PNG, JPG or PDF. Max 5MB.</span>
                </div>
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Letterhead Confirmation */}
      <ConfirmModal
        isOpen={!!letterheadToDelete}
        onClose={() => setLetterheadToDelete(null)}
        onConfirm={handleDeleteLetterhead}
        title="Delete Letterhead"
        message={`Are you sure you want to delete "${letterheadToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Letterhead Preview Modal */}
      <Modal
        isOpen={!!previewLetterhead}
        onClose={() => setPreviewLetterhead(null)}
        title={previewLetterhead?.name || 'Letterhead Preview'}
        size="xl"
      >
        <div className="flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 rounded-lg min-h-[400px]">
          {previewLetterhead?.data.startsWith('data:application/pdf') ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-red-500" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                PDF preview coming soon
              </p>
              <a
                href={previewLetterhead.data}
                download={`${previewLetterhead.name}.pdf`}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                <Upload className="w-4 h-4 rotate-180" />
                Download PDF
              </a>
            </div>
          ) : (
            <img
              src={previewLetterhead?.data || ''}
              alt={previewLetterhead?.name || 'Preview'}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          )}
        </div>
      </Modal>
    </Page>
  );
}