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
import { useClientsStore, useUsersStore, useToast, type Company } from '@/contexts';
import { CardContent, Button, Input, Modal, SearchInput } from '@/components/common';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SelectFilter } from '@/components/common/SelectFilter';
import { DuplicateCompanyModal } from '@/components/common/DuplicateCompanyModal';

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

const initialFormData: CompanyFormData = {
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

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  // Helper functions
  const getSalesRepName = (salesRepId?: string) => {
    if (!salesRepId) return '';
    const user = users.find((u) => u.id === salesRepId);
    return user?.name || '';
  };

  const getContactCount = (companyId: string) => {
    return contacts.filter((c) => c.companyId === companyId).length;
  };

  const getLocation = (company: Company) => {
    if (!company.address?.city && !company.address?.state) return '';
    return [company.address.city, company.address.state].filter(Boolean).join(', ');
  };

  // Get unique locations for filter
  const locationOptions = useMemo(() => {
    const locations = new Map<string, number>();
    companies.forEach((company) => {
      const loc = getLocation(company);
      if (loc) {
        locations.set(loc, (locations.get(loc) || 0) + 1);
      }
    });
    return Array.from(locations.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  // Get sales reps for filter
  const salesRepOptions = useMemo(() => {
    const reps = new Map<string, { name: string; count: number }>();
    companies.forEach((company) => {
      if (company.salesRepId) {
        const name = getSalesRepName(company.salesRepId);
        if (name) {
          const existing = reps.get(company.salesRepId);
          if (existing) {
            existing.count++;
          } else {
            reps.set(company.salesRepId, { name, count: 1 });
          }
        }
      }
    });
    return Array.from(reps.entries())
      .map(([value, { name, count }]) => ({ value, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies, users]);

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
      const matchesLocation = !locationFilter || getLocation(company) === locationFilter;

      // Sales rep filter
      const matchesSalesRep = !salesRepFilter || company.salesRepId === salesRepFilter;

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
          aVal = getSalesRepName(a.salesRepId).toLowerCase();
          bVal = getSalesRepName(b.salesRepId).toLowerCase();
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
      render: (company) => (
        <span className="text-slate-600 dark:text-slate-400">
          {getSalesRepName(company.salesRepId) || '—'}
        </span>
      ),
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
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
            }
          : undefined,
      notes: formData.notes || undefined,
      salesRepId: formData.salesRepId || undefined,
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
    formData.city !== '' ||
    formData.state !== '' ||
    formData.zip !== '' ||
    formData.notes !== '' ||
    formData.salesRepId !== '';

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

          {activeUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sales Rep
              </label>
              <select
                value={formData.salesRepId}
                onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a sales rep...</option>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <Input
            label="Street Address"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            placeholder="123 Main Street"
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
            />
            <Input
              label="ZIP Code"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="10001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
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