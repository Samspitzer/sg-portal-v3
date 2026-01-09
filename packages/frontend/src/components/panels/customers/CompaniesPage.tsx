import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Building2,
  Globe,
  MapPin,
  User,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { useClientsStore, useUsersStore, useToast, type Company, getCompanySalesRepIds } from '@/contexts';
import { CardContent, Button, Input, Modal, SearchInput, Textarea, AddressInput } from '@/components/common';
import { MultiSelectUsers } from '@/components/common/MultiSelectUsers';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SelectFilter } from '@/components/common/SelectFilter';
import { DuplicateCompanyModal } from '@/components/common/DuplicateCompanyModal';
import { validatePhone, validateWebsite } from '@/utils/validation';

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
  salesRepIds: string[];
}

const initialFormData: CompanyFormData = {
  name: '',
  phone: '',
  website: '',
  street: '',
  suite: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
  salesRepIds: [],
};

type SortField = 'name' | 'location' | 'salesRep' | 'contacts';
type SortDirection = 'asc' | 'desc';

export function CompaniesPage() {
  const navigate = useNavigate();
  const { companies, contacts, addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();

  // Search and filters
  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Duplicate company detection
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCompany, setDuplicateCompany] = useState<{
    id: string;
    name: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
  } | null>(null);

  // Helper functions
  const getSalesRepName = (salesRepId?: string) => {
    if (!salesRepId) return '';
    const user = users.find((u) => u.id === salesRepId);
    return user?.name || '';
  };

  // Get all sales rep names for a company (supports multiple reps)
  const getCompanySalesRepNames = (company: Company): string[] => {
    const repIds = getCompanySalesRepIds(company);
    return repIds.map(id => getSalesRepName(id)).filter(Boolean);
  };

  const getContactCount = (companyId: string) => {
    return contacts.filter((c) => c.companyId === companyId).length;
  };

  // Get primary location (main office) for display
  const getLocation = (company: Company) => {
    if (!company.address?.city && !company.address?.state) return '';
    return [company.address.city, company.address.state].filter(Boolean).join(', ');
  };

  // Get all locations for a company (main office + additional addresses)
  const getAllLocations = (company: Company): string[] => {
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

  // Helper to get locations where a specific sales rep is assigned within a company
  const getLocationsForSalesRep = (company: Company, salesRepId: string): string[] => {
    const locations: string[] = [];
    
    // If company uses company-level reps, check if this rep is assigned at company level
    if (!company.salesRepsByLocation) {
      const companyRepIds = company.salesRepIds || (company.salesRepId ? [company.salesRepId] : []);
      if (companyRepIds.includes(salesRepId)) {
        // This rep is assigned at company level - they cover all locations
        return getAllLocations(company);
      }
      return [];
    }
    
    // Company uses location-based reps - find locations where this rep is assigned
    // Check main office
    if (company.address) {
      const mainRepIds = company.address.salesRepIds || (company.address.salesRepId ? [company.address.salesRepId] : []);
      if (mainRepIds.includes(salesRepId)) {
        const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
        if (mainLoc) locations.push(mainLoc);
      }
    }
    
    // Check additional addresses
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        const addrRepIds = addr.salesRepIds || (addr.salesRepId ? [addr.salesRepId] : []);
        if (addrRepIds.includes(salesRepId)) {
          const addrLoc = [addr.city, addr.state].filter(Boolean).join(', ');
          if (addrLoc && !locations.includes(addrLoc)) locations.push(addrLoc);
        }
      });
    }
    
    return locations;
  };

  // Get unique locations for filter (cascading based on sales rep filter)
  const locationOptions = useMemo(() => {
    const locations = new Map<string, number>();
    const allLocations = new Map<string, number>();
    
    companies.forEach((company) => {
      const companyLocations = getAllLocations(company);
      
      // Track all locations
      companyLocations.forEach((loc) => {
        allLocations.set(loc, (allLocations.get(loc) || 0) + 1);
      });
      
      // If sales rep filter is active, only count locations where THAT rep is assigned
      if (salesRepFilter) {
        const repLocations = getLocationsForSalesRep(company, salesRepFilter);
        repLocations.forEach((loc) => {
          locations.set(loc, (locations.get(loc) || 0) + 1);
        });
      }
    });
    
    // Return all locations but mark those with 0 matches as disabled
    return Array.from(allLocations.entries())
      .map(([value]) => {
        const matchCount = salesRepFilter ? (locations.get(value) || 0) : (allLocations.get(value) || 0);
        return { 
          value, 
          label: value, 
          count: matchCount,
          disabled: salesRepFilter ? matchCount === 0 : undefined,
        };
      })
      .sort((a, b) => {
        // Sort enabled options first, then by label
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [companies, salesRepFilter]);

  // Helper to get sales rep IDs for a specific location within a company
  const getSalesRepIdsForLocation = (company: Company, location: string): string[] => {
    const repIds: string[] = [];
    
    // First check if company has ANY address in this location
    const companyLocations = getAllLocations(company);
    if (!companyLocations.includes(location)) {
      return []; // Company has no address in this location
    }
    
    // If company uses company-level reps, those reps apply to all their locations
    if (!company.salesRepsByLocation) {
      if (company.salesRepIds) {
        repIds.push(...company.salesRepIds);
      } else if (company.salesRepId) {
        repIds.push(company.salesRepId);
      }
      return repIds;
    }
    
    // Company uses location-based reps - find reps for matching addresses only
    // Check main office
    if (company.address) {
      const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
      if (mainLoc === location) {
        if (company.address.salesRepIds) {
          repIds.push(...company.address.salesRepIds);
        } else if (company.address.salesRepId) {
          repIds.push(company.address.salesRepId);
        }
      }
    }
    
    // Check additional addresses
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        const addrLoc = [addr.city, addr.state].filter(Boolean).join(', ');
        if (addrLoc === location) {
          if (addr.salesRepIds) {
            repIds.push(...addr.salesRepIds);
          } else if (addr.salesRepId) {
            repIds.push(addr.salesRepId);
          }
        }
      });
    }
    
    return repIds;
  };

  // Get sales reps for filter - cascading based on location filter
  const salesRepOptions = useMemo(() => {
    const reps = new Map<string, { name: string; count: number }>();
    const allReps = new Map<string, { name: string; count: number }>();
    
    companies.forEach((company) => {
      // Get all sales rep IDs for this company (for "all reps" list)
      const allRepIds = getCompanySalesRepIds(company);
      allRepIds.forEach((repId) => {
        const name = getSalesRepName(repId);
        if (name) {
          const existingAll = allReps.get(repId);
          if (existingAll) {
            existingAll.count++;
          } else {
            allReps.set(repId, { name, count: 1 });
          }
        }
      });
      
      // If location filter is active, only count reps assigned to THAT location
      if (locationFilter) {
        const locationRepIds = getSalesRepIdsForLocation(company, locationFilter);
        locationRepIds.forEach((repId) => {
          const name = getSalesRepName(repId);
          if (name) {
            const existing = reps.get(repId);
            if (existing) {
              existing.count++;
            } else {
              reps.set(repId, { name, count: 1 });
            }
          }
        });
      }
    });
    
    // Return all reps but mark those with 0 matches as disabled
    return Array.from(allReps.entries())
      .map(([value, { name }]) => {
        const matchData = reps.get(value);
        const matchCount = locationFilter ? (matchData?.count || 0) : allReps.get(value)?.count || 0;
        return { 
          value, 
          label: name, 
          count: matchCount,
          disabled: locationFilter ? matchCount === 0 : undefined,
        };
      })
      .sort((a, b) => {
        // Sort enabled options first, then by label
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [companies, users, locationFilter]);

  // Get all company names for the alphabet filter
  const companyNames = useMemo(() => companies.map((c) => c.name), [companies]);

  // Filtered and sorted companies
  const filteredAndSortedCompanies = useMemo(() => {
    let result = companies.filter((company) => {
      // Search filter
      const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());

      // Letter filter
      const matchesLetter =
        !letterFilter || company.name?.charAt(0)?.toUpperCase() === letterFilter;

      // Location filter
      const matchesLocation = !locationFilter || getAllLocations(company).includes(locationFilter);

      // Sales rep filter - check if selected rep is in any of the company's sales reps
      const matchesSalesRep = !salesRepFilter || getCompanySalesRepIds(company).includes(salesRepFilter);

      return matchesSearch && matchesLetter && matchesLocation && matchesSalesRep;
    });

    result = [...result].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'location':
          aVal = getLocation(a).toLowerCase();
          bVal = getLocation(b).toLowerCase();
          break;
        case 'salesRep':
          aVal = (getCompanySalesRepNames(a)[0] || '').toLowerCase();
          bVal = (getCompanySalesRepNames(b)[0] || '').toLowerCase();
          break;
        case 'contacts':
          aVal = getContactCount(a.id);
          bVal = getContactCount(b.id);
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, search, letterFilter, locationFilter, salesRepFilter, sortField, sortDirection, contacts, users]);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  // Table columns
  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      render: (company) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
            {company.name}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (company) => (
        <span className="text-slate-600 dark:text-slate-400">{company.phone || '—'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'website',
      header: 'Website',
      render: (company) => {
        if (!company.website) {
          return <span className="text-slate-400">—</span>;
        }
        const websiteUrl = company.website.startsWith('http')
          ? company.website
          : 'https://' + company.website;
        const websiteDisplay = company.website.replace(/^https?:\/\//, '');
        return (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="w-3 h-3" />
            {websiteDisplay}
          </a>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (company) => (
        <span className="text-slate-600 dark:text-slate-400">{getLocation(company) || '—'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'salesRep',
      header: 'Sales Rep',
      sortable: true,
      render: (company) => {
        const repNames = getCompanySalesRepNames(company);
        if (repNames.length === 0) {
          return <span className="text-slate-400">—</span>;
        }
        if (repNames.length === 1) {
          return <span className="text-slate-600 dark:text-slate-400">{repNames[0]}</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {repNames.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'contacts',
      header: 'Contacts',
      sortable: true,
      align: 'center',
      render: (company) => (
        <span className="text-slate-600 dark:text-slate-400">{getContactCount(company.id)}</span>
      ),
    },
  ];

  // Modal handlers
  const openAddModal = () => {
    setFormData(initialFormData);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
  };

  // Check for duplicate company by name
  const findDuplicateCompany = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    return companies.find((company) => company.name.toLowerCase() === normalizedName);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }

    // Validate phone if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Error', 'Please enter a valid phone number');
      return;
    }

    // Validate website if provided
    if (formData.website && !validateWebsite(formData.website)) {
      toast.error('Error', 'Please enter a valid website URL');
      return;
    }

    // Check for duplicate
    const existing = findDuplicateCompany(formData.name);
    if (existing) {
      setDuplicateCompany({
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        website: existing.website,
        city: existing.address?.city,
        state: existing.address?.state,
      });
      setShowDuplicateModal(true);
      return;
    }

    // No duplicate, create company
    createCompany();
  };

  const createCompany = () => {
    const companyData = {
      name: formData.name.trim(),
      phone: formData.phone || undefined,
      website: formData.website || undefined,
      address:
        formData.street || formData.city || formData.state || formData.zip
          ? {
              street: formData.street,
              suite: formData.suite || undefined,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
            }
          : undefined,
      notes: formData.notes || undefined,
      salesRepIds: formData.salesRepIds.length > 0 ? formData.salesRepIds : undefined,
    };

    addCompany(companyData);
    toast.success('Created', formData.name + ' has been added');
    closeModal();
  };

  const handleViewExistingCompany = () => {
    if (duplicateCompany) {
      navigate('/clients/companies/' + duplicateCompany.id);
    }
    setShowDuplicateModal(false);
    setDuplicateCompany(null);
    closeModal();
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateCompany(null);
  };

  const hasChanges =
    formData.name.trim() !== '' ||
    formData.phone !== '' ||
    formData.website !== '' ||
    formData.street !== '' ||
    formData.suite !== '' ||
    formData.city !== '' ||
    formData.state !== '' ||
    formData.zip !== '' ||
    formData.notes !== '' ||
    formData.salesRepIds.length > 0;

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setLetterFilter(null);
    setLocationFilter('');
    setSalesRepFilter('');
  };

  const hasActiveFilters = search || letterFilter || locationFilter || salesRepFilter;

  return (
    <Page
      title="Companies"
      description="Manage your client companies."
      fillHeight  // ← This makes the DataTable fill available space and scroll
      actions={
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredAndSortedCompanies}
        rowKey={(company) => company.id}
        onRowClick={(company) => navigate('/clients/companies/' + company.id)}
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
                placeholder="Search companies..."
                className="w-full sm:w-64"
              />
              <SelectFilter
                label="Location"
                value={locationFilter}
                options={locationOptions}
                onChange={setLocationFilter}
                icon={<MapPin className="w-4 h-4" />}
              />
              <SelectFilter
                label="Sales Rep"
                value={salesRepFilter}
                options={salesRepOptions}
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
              items={companyNames}
            />
          </div>
        }
        emptyState={
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {hasActiveFilters ? 'No companies found' : 'No companies yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term'
                : 'Get started by adding your first company'}
            </p>
            {!hasActiveFilters && (
              <Button variant="primary" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            )}
          </CardContent>
        }
      />

      {/* Add Company Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Add Company"
        size="lg"
        hasUnsavedChanges={hasChanges}
        onSaveChanges={handleSave}
        onDiscardChanges={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Add Company
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter company name"
            autoFocus
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sales Reps
            </label>
            <MultiSelectUsers
              value={formData.salesRepIds}
              onChange={(ids) => setFormData({ ...formData, salesRepIds: ids })}
              placeholder="Select sales reps..."
              activeOnly={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="www.example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Address
            </label>
            <AddressInput
              street={formData.street}
              suite={formData.suite}
              city={formData.city}
              state={formData.state}
              zip={formData.zip}
              autoSave
              onSave={(address) => {
                setFormData({
                  ...formData,
                  street: address.street,
                  suite: address.suite || '',
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                });
              }}
            />
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>
      </Modal>

      {/* Duplicate Company Modal */}
      <DuplicateCompanyModal
        isOpen={showDuplicateModal}
        existingCompany={duplicateCompany}
        onClose={handleCloseDuplicateModal}
        onUseExisting={handleViewExistingCompany}
      />
    </Page>
  );
}