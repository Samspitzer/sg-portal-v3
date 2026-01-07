import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Smartphone,
  AlertCircle,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { CardContent, Button, Input, Modal, SearchInput, Select, Textarea } from '@/components/common';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SelectFilter } from '@/components/common/SelectFilter';
import { DuplicateContactModal } from '@/components/common/DuplicateContactModal';
import { useClientsStore, useUsersStore, useToast, CONTACT_ROLES, type ContactRole, type Contact, type Company } from '@/contexts';
import { useDropdownKeyboard } from '@/hooks';

interface ContactFormData {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneOffice: string;
  phoneMobile: string;
  role: ContactRole | '';
  notes: string;
}

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

const initialContactFormData: ContactFormData = {
  companyId: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneOffice: '',
  phoneMobile: '',
  role: '',
  notes: '',
};

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

type SortField = 'name' | 'role' | 'company' | 'email';
type SortDirection = 'asc' | 'desc';

export function ContactsPage() {
  const navigate = useNavigate();
  const { companies, contacts, addContact, updateContact, addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialContactFormData);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);

  // Ref for company dropdown in modal
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Duplicate contact detection
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateType, setDuplicateType] = useState<'exact' | 'name-only'>('exact');
  const [duplicateContact, setDuplicateContact] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneMobile?: string;
    phoneOffice?: string;
    companyId: string;
    companyName?: string;
  } | null>(null);
  const [newContactInfo, setNewContactInfo] = useState<{
    firstName: string;
    lastName: string;
    email?: string;
    phoneMobile?: string;
    phoneOffice?: string;
    companyId: string;
    companyName?: string;
  } | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  // Role options for Select component
  const roleOptions = useMemo(() => 
    CONTACT_ROLES.map((role) => ({ value: role, label: role })),
    []
  );

  // Sales rep options for Select component
  const salesRepOptions = useMemo(() => 
    activeUsers.map((user) => ({ value: user.id, label: user.name })),
    [activeUsers]
  );

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || null;
  };

  const getCompany = (companyId: string) => {
    return companies.find((c) => c.id === companyId);
  };

  const isOrphanedContact = (companyId: string) => {
    return !companies.some((c) => c.id === companyId);
  };

  // Check if contact has fields needing review (from localStorage)
  const contactNeedsReview = (contactId: string) => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(`contact-fields-review-${contactId}`);
    if (stored) {
      try {
        const fields = JSON.parse(stored);
        return Array.isArray(fields) && fields.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  };

  const contactNames = useMemo(() => contacts.map((c) => c.firstName), [contacts]);

  // Company options for filter (using SelectFilter format)
  const companyFilterOptions = useMemo(() => {
    const companyCounts = new Map<string, number>();
    contacts.forEach((contact) => {
      if (contact.companyId && !isOrphanedContact(contact.companyId)) {
        companyCounts.set(contact.companyId, (companyCounts.get(contact.companyId) || 0) + 1);
      }
    });
    return companies
      .filter((c) => companyCounts.has(c.id))
      .map((company) => ({
        value: company.id,
        label: company.name,
        count: companyCounts.get(company.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies, contacts]);

  // Get all locations for a company (main office + additional addresses)
  const getAllCompanyLocations = (company: Company | undefined): string[] => {
    if (!company) return [];
    const locations: string[] = [];
    
    // Main office address
    if (company.address?.city || company.address?.state) {
      const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
      if (mainLoc) locations.push(mainLoc);
    }
    
    // Additional addresses
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        if (addr.city || addr.state) {
          const loc = [addr.city, addr.state].filter(Boolean).join(', ');
          if (loc && !locations.includes(loc)) locations.push(loc);
        }
      });
    }
    
    return locations;
  };

  // Get the location for a contact's assigned office
  const getContactAssignedLocation = (contact: Contact, company: Company | undefined): string | null => {
    if (!company || !contact.officeAddressId) return null;
    
    // Check if assigned to main office
    if (contact.officeAddressId === 'main-office') {
      if (company.address?.city || company.address?.state) {
        return [company.address.city, company.address.state].filter(Boolean).join(', ');
      }
      return null;
    }
    
    // Check additional addresses
    const addr = company.addresses?.find((a) => a.id === contact.officeAddressId);
    if (addr && (addr.city || addr.state)) {
      return [addr.city, addr.state].filter(Boolean).join(', ');
    }
    
    return null;
  };

  // Location filter options (based on contact's assigned office or all company locations if not assigned)
  const locationFilterOptions = useMemo(() => {
    const locationCounts = new Map<string, number>();
    contacts.forEach((contact) => {
      const company = getCompany(contact.companyId);
      
      if (contact.officeAddressId) {
        // Contact has assigned office - only count that location
        const assignedLocation = getContactAssignedLocation(contact, company);
        if (assignedLocation) {
          locationCounts.set(assignedLocation, (locationCounts.get(assignedLocation) || 0) + 1);
        }
      } else {
        // No assigned office - count all company locations
        const companyLocations = getAllCompanyLocations(company);
        companyLocations.forEach((loc) => {
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        });
      }
    });
    return Array.from(locationCounts.entries())
      .map(([loc, count]) => ({
        value: loc,
        label: loc,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contacts, companies]);

  // Sales rep filter options (based on company salesRepId)
  const salesRepFilterOptions = useMemo(() => {
    const repCounts = new Map<string, number>();
    contacts.forEach((contact) => {
      const company = getCompany(contact.companyId);
      if (company?.salesRepId) {
        repCounts.set(company.salesRepId, (repCounts.get(company.salesRepId) || 0) + 1);
      }
    });
    return Array.from(repCounts.entries())
      .map(([repId, count]) => {
        const user = users.find((u) => u.id === repId);
        return {
          value: repId,
          label: user?.name || 'Unknown',
          count,
        };
      })
      .filter((opt) => opt.label !== 'Unknown')
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contacts, companies, users]);

  const filteredAndSortedContacts = useMemo(() => {
    let result = contacts.filter((contact) => {
      const matchesSearch =
        contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCompany = !companyFilter || contact.companyId === companyFilter;
      const matchesLetter = !letterFilter || 
        (contact.firstName?.charAt(0)?.toUpperCase() === letterFilter);
      
      // Location filter - check contact's assigned office or all company locations
      const company = getCompany(contact.companyId);
      let matchesLocation = true;
      if (locationFilter) {
        if (contact.officeAddressId) {
          // Contact has assigned office - get that specific location
          const assignedLocation = getContactAssignedLocation(contact, company);
          matchesLocation = assignedLocation === locationFilter;
        } else {
          // No assigned office - match any company location
          matchesLocation = getAllCompanyLocations(company).includes(locationFilter);
        }
      }
      
      // Sales rep filter - based on company salesRepId
      const matchesSalesRep = !salesRepFilter || company?.salesRepId === salesRepFilter;
      
      return matchesSearch && matchesCompany && matchesLetter && matchesLocation && matchesSalesRep;
    });

    result = [...result].sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortField) {
        case 'name':
          aVal = (a.firstName + ' ' + a.lastName).toLowerCase();
          bVal = (b.firstName + ' ' + b.lastName).toLowerCase();
          break;
        case 'role':
          aVal = (a.role || '').toLowerCase();
          bVal = (b.role || '').toLowerCase();
          break;
        case 'company':
          aVal = (getCompanyName(a.companyId) || '').toLowerCase();
          bVal = (getCompanyName(b.companyId) || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [contacts, search, companyFilter, letterFilter, locationFilter, salesRepFilter, sortField, sortDirection, companies]);

  // Companies for modal dropdown
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

  // Keyboard navigation for company selector in modal
  const companyDropdownKeyboard = useDropdownKeyboard({
    items: filteredCompanies,
    isOpen: showCompanyDropdown,
    onSelect: (company, index) => {
      if (index === -1 && showAddCompanyOption) {
        openAddCompanyModal();
      } else if (company) {
        selectCompany(company);
      }
    },
    onClose: () => setShowCompanyDropdown(false),
    hasAddOption: showAddCompanyOption,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  // Table columns
  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (contact) => {
        const orphaned = isOrphanedContact(contact.companyId);
        const needsReview = contactNeedsReview(contact.id);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
              orphaned 
                ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400' 
                : needsReview
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
            }`}>
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div className="flex flex-col">
              <span className={`font-medium ${
                orphaned 
                  ? 'text-danger-700 dark:text-danger-400' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                {contact.firstName} {contact.lastName}
              </span>
              {orphaned && (
                <span className="text-xs text-danger-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No company assigned
                </span>
              )}
              {!orphaned && needsReview && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Needs review
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">{contact.role || '—'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (contact) => {
        const orphaned = isOrphanedContact(contact.companyId);
        const companyName = getCompanyName(contact.companyId);
        
        if (orphaned) {
          return (
            <span className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="italic">Company deleted</span>
            </span>
          );
        }
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              const company = companies.find(c => c.id === contact.companyId);
              if (company) navigate('/clients/companies/' + company.id);
            }}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
          >
            <Building2 className="w-3 h-3 flex-shrink-0" />
            {companyName}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (contact) => {
        if (!contact.email) {
          return <span className="text-slate-400">—</span>;
        }
        return (
          <a
            href={'mailto:' + contact.email}
            className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3 h-3" />
            {contact.email}
          </a>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'phoneOffice',
      header: 'Work Phone',
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">
          {contact.phoneOffice ? (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contact.phoneOffice}
            </span>
          ) : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'phoneMobile',
      header: 'Mobile',
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">
          {contact.phoneMobile ? (
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              {contact.phoneMobile}
            </span>
          ) : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const openAddModal = () => {
    setFormData(initialContactFormData);
    setCompanySearch('');
    setShowCompanyDropdown(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialContactFormData);
    setCompanySearch('');
    setShowCompanyDropdown(false);
  };

  const findDuplicateContact = (firstName: string, lastName: string, email: string) => {
    const normalizedFirst = firstName.trim().toLowerCase();
    const normalizedLast = lastName.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    for (const contact of contacts) {
      const matchesName =
        contact.firstName.toLowerCase() === normalizedFirst &&
        contact.lastName.toLowerCase() === normalizedLast;
      if (!matchesName) continue;
      if (normalizedEmail && contact.email?.toLowerCase() === normalizedEmail) {
        return { contact, type: 'exact' as const };
      }
      return { contact, type: 'name-only' as const };
    }
    return null;
  };

  const handleSave = () => {
    if (!formData.companyId) {
      toast.error('Error', 'Company is required');
      return;
    }
    if (!formData.firstName.trim()) {
      toast.error('Error', 'First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error('Error', 'Last name is required');
      return;
    }

    const duplicate = findDuplicateContact(formData.firstName, formData.lastName, formData.email);
    if (duplicate) {
      const existingCompany = companies.find((c) => c.id === duplicate.contact.companyId);
      const newCompany = companies.find((c) => c.id === formData.companyId);
      setDuplicateContact({
        id: duplicate.contact.id,
        firstName: duplicate.contact.firstName,
        lastName: duplicate.contact.lastName,
        email: duplicate.contact.email,
        phoneMobile: duplicate.contact.phoneMobile,
        phoneOffice: duplicate.contact.phoneOffice,
        companyId: duplicate.contact.companyId,
        companyName: existingCompany?.name,
      });
      setNewContactInfo({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email || undefined,
        phoneMobile: formData.phoneMobile || undefined,
        phoneOffice: formData.phoneOffice || undefined,
        companyId: formData.companyId,
        companyName: newCompany?.name,
      });
      setDuplicateType(duplicate.type);
      setShowDuplicateModal(true);
      return;
    }
    createContact();
  };

  const createContact = () => {
    const contactData = {
      companyId: formData.companyId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email || undefined,
      phoneOffice: formData.phoneOffice || undefined,
      phoneMobile: formData.phoneMobile || undefined,
      role: formData.role || undefined,
      notes: formData.notes || undefined,
    };
    addContact(contactData);
    toast.success('Created', formData.firstName + ' ' + formData.lastName + ' has been added');
    closeModal();
  };

  const handleTransferAndUpdate = () => {
    if (duplicateContact && newContactInfo) {
      updateContact(duplicateContact.id, {
        companyId: newContactInfo.companyId,
        email: newContactInfo.email || duplicateContact.email,
        phoneMobile: newContactInfo.phoneMobile || duplicateContact.phoneMobile,
        phoneOffice: newContactInfo.phoneOffice || duplicateContact.phoneOffice,
      });
      toast.success('Updated', duplicateContact.firstName + ' ' + duplicateContact.lastName + ' has been moved to ' + newContactInfo.companyName);
      navigate('/clients/contacts/' + duplicateContact.id);
    }
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
    closeModal();
  };

  const handleCreateNew = () => {
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
    createContact();
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
  };

  const selectCompany = (company: { id: string; name: string }) => {
    setFormData({ ...formData, companyId: company.id });
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
  };

  const openAddCompanyModal = () => {
    setCompanyFormData({ ...initialCompanyFormData, name: companySearch.trim() });
    setShowAddCompanyModal(true);
    setShowCompanyDropdown(false);
  };

  const closeAddCompanyModal = () => {
    setShowAddCompanyModal(false);
    setCompanyFormData(initialCompanyFormData);
  };

  const handleSaveCompany = () => {
    if (!companyFormData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }
    const companyData = {
      name: companyFormData.name.trim(),
      phone: companyFormData.phone || undefined,
      website: companyFormData.website || undefined,
      address: companyFormData.street || companyFormData.city || companyFormData.state || companyFormData.zip
        ? { street: companyFormData.street, city: companyFormData.city, state: companyFormData.state, zip: companyFormData.zip }
        : undefined,
      notes: companyFormData.notes || undefined,
      salesRepId: companyFormData.salesRepId || undefined,
    };
    addCompany(companyData);
    toast.success('Created', companyFormData.name + ' has been added');
    setTimeout(() => {
      const newCompany = useClientsStore.getState().companies.find((c) => c.name === companyFormData.name.trim());
      if (newCompany) {
        setFormData({ ...formData, companyId: newCompany.id });
        setCompanySearch(newCompany.name);
      }
    }, 100);
    closeAddCompanyModal();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setLetterFilter(null);
    setCompanyFilter('');
    setLocationFilter('');
    setSalesRepFilter('');
  };

  const hasActiveFilters = search || letterFilter || companyFilter || locationFilter || salesRepFilter;

  const hasContactChanges = formData.companyId !== '' || formData.firstName.trim() !== '' || formData.lastName.trim() !== '' || formData.email !== '' || formData.phoneOffice !== '' || formData.phoneMobile !== '' || formData.role !== '' || formData.notes !== '';
  const hasCompanyChanges = companyFormData.name.trim() !== '' || companyFormData.phone !== '' || companyFormData.website !== '' || companyFormData.street !== '' || companyFormData.city !== '' || companyFormData.state !== '' || companyFormData.zip !== '' || companyFormData.notes !== '' || companyFormData.salesRepId !== '';

  return (
    <Page
      title="Contacts"
      description="Manage your client contacts."
      fillHeight
      actions={
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredAndSortedContacts}
        rowKey={(contact) => contact.id}
        onRowClick={(contact) => navigate('/clients/contacts/' + contact.id)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        filters={
          <div className="space-y-4">
            {/* Search and Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search contacts..."
                className="w-full sm:w-64"
              />
              <SelectFilter
                label="Company"
                value={companyFilter}
                options={companyFilterOptions}
                onChange={setCompanyFilter}
                icon={<Building2 className="w-4 h-4" />}
              />
              <SelectFilter
                label="Location"
                value={locationFilter}
                options={locationFilterOptions}
                onChange={setLocationFilter}
                icon={<MapPin className="w-4 h-4" />}
              />
              <SelectFilter
                label="Sales Rep"
                value={salesRepFilter}
                options={salesRepFilterOptions}
                onChange={setSalesRepFilter}
                icon={<User className="w-4 h-4" />}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {/* Alphabet Filter */}
            <AlphabetFilter
              selected={letterFilter}
              onSelect={setLetterFilter}
              items={contactNames}
            />
          </div>
        }
        emptyState={
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {hasActiveFilters ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term'
                : 'Get started by adding your first contact'}
            </p>
            {!hasActiveFilters && (
              <Button variant="primary" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        }
      />

      {/* Add Contact Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          if (showAddCompanyModal) return;
          closeModal();
        }}
        title="Add Contact"
        size="lg"
        hasUnsavedChanges={hasContactChanges}
        onSaveChanges={handleSave}
        onDiscardChanges={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Add Contact
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company *
            </label>
            <div className="relative" ref={companyDropdownRef}>
              <SearchInput
                value={companySearch}
                onChange={(val) => {
                  setCompanySearch(val);
                  setShowCompanyDropdown(true);
                  companyDropdownKeyboard.resetHighlight();
                  if (!val) setFormData({ ...formData, companyId: '' });
                }}
                onClear={() => {
                  setFormData({ ...formData, companyId: '' });
                  setShowCompanyDropdown(false);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                onKeyDown={companyDropdownKeyboard.handleKeyDown}
                placeholder="Search for a company or type to add new..."
                icon={<Building2 className="w-4 h-4" />}
              />
              {showCompanyDropdown && (companySearch || companies.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {showAddCompanyOption && (
                    <button
                      type="button"
                      onClick={openAddCompanyModal}
                      className={`w-full px-4 py-3 text-left text-sm text-brand-600 dark:text-brand-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 ${
                        companyDropdownKeyboard.highlightedIndex === 0
                          ? 'bg-brand-50 dark:bg-brand-900/20'
                          : 'hover:bg-brand-50 dark:hover:bg-brand-900/20'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add &quot;{companySearch.trim()}&quot; as new company</span>
                    </button>
                  )}
                  {filteredCompanies.map((company, index) => {
                    const highlightIndex = showAddCompanyOption ? index + 1 : index;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => selectCompany(company)}
                        className={`w-full px-4 py-2 text-left text-sm text-slate-900 dark:text-white ${
                          highlightIndex === companyDropdownKeyboard.highlightedIndex
                            ? 'bg-brand-50 dark:bg-brand-900/20'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {company.name}
                      </button>
                    );
                  })}
                  {filteredCompanies.length === 0 && !showAddCompanyOption && (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      No companies found. Type a name to add one.
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.companyId && (
              <p className="mt-1 text-xs text-success-600 dark:text-success-400">
                ✓ Selected: {getCompanyName(formData.companyId)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="John"
            />
            <Input
              label="Last Name *"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as ContactRole | '' })}
            options={roleOptions}
            placeholder="Select a role..."
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone (Office)"
              type="tel"
              value={formData.phoneOffice}
              onChange={(e) => setFormData({ ...formData, phoneOffice: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Phone (Mobile)"
              type="tel"
              value={formData.phoneMobile}
              onChange={(e) => setFormData({ ...formData, phoneMobile: e.target.value })}
              placeholder="(555) 987-6543"
            />
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Add Company Modal */}
      <Modal
        isOpen={showAddCompanyModal}
        onClose={closeAddCompanyModal}
        title="Add New Company"
        size="lg"
        hasUnsavedChanges={hasCompanyChanges}
        onSaveChanges={handleSaveCompany}
        onDiscardChanges={closeAddCompanyModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeAddCompanyModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCompany}>
              Add Company
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={companyFormData.name}
            onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
            placeholder="Enter company name"
            autoFocus
          />

          {activeUsers.length > 0 && (
            <Select
              label="Sales Rep"
              value={companyFormData.salesRepId}
              onChange={(e) => setCompanyFormData({ ...companyFormData, salesRepId: e.target.value })}
              options={salesRepOptions}
              placeholder="Select a sales rep..."
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={companyFormData.phone}
              onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Website"
              type="url"
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
              label="ZIP Code"
              value={companyFormData.zip}
              onChange={(e) => setCompanyFormData({ ...companyFormData, zip: e.target.value })}
              placeholder="10001"
            />
          </div>

          <Textarea
            label="Notes"
            value={companyFormData.notes}
            onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Duplicate Contact Modal */}
      <DuplicateContactModal
        isOpen={showDuplicateModal}
        duplicateType={duplicateType}
        existingContact={duplicateContact}
        newContactInfo={newContactInfo}
        onClose={handleCloseDuplicateModal}
        onTransferAndUpdate={handleTransferAndUpdate}
        onCreateNew={handleCreateNew}
      />
    </Page>
  );
}