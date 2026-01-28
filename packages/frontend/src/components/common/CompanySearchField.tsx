// PATH: src/components/common/CompanySearchField.tsx
// Company Selector with Search, Add New Company, and Duplicate Detection

import { useState, useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Building2,
  Check,
  X,
  Pencil,
  Plus,
  Search,
  ChevronDown,
  MapPin,
  Trash2,
} from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { AddressInput } from './AddressInput';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { DuplicateCompanyModal } from './DuplicateCompanyModal';
import { useClientsStore, useUsersStore, useToast } from '@/contexts';
import { useDropdownKeyboard } from '@/hooks';
import { formatPhoneNumber } from '@/utils/validation';

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

export interface CompanySearchFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  onCompanyChange?: (oldCompanyId: string, newCompanyId: string) => void;
  placeholder?: string;
  className?: string;
}

export function CompanySearchField({
  label,
  value,
  onSave,
  onEditingChange,
  onCompanyChange,
  placeholder = 'Click to assign company...',
}: CompanySearchFieldProps) {
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
          {selectedCompany?.name || placeholder}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
      </div>
    </div>
  );
}