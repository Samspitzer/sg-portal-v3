// ============================================================================
// CompaniesPage - Company Listing with Add Company Form
// Location: src/components/panels/CompaniesPage.tsx
// 
// UPDATED: Now uses AddCompanyForm from add-forms for creating companies
// ============================================================================

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
import { useClientsStore, useUsersStore, type Company, getCompanySalesRepIds } from '@/contexts';
import { CardContent, Button, SearchInput, FilterBar, FilterCount, SelectFilter } from '@/components/common';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { useFormStack } from '@/components/panels/add-forms';
import { useDocumentTitle, getCompanyUrl } from '@/hooks';

type SortField = 'name' | 'location' | 'salesRep' | 'contacts';
type SortDirection = 'asc' | 'desc';

export function CompaniesPage() {
  const navigate = useNavigate();
  const { companies, contacts } = useClientsStore();
  const { users } = useUsersStore();
  const { openAddCompany } = useFormStack();
  useDocumentTitle('Companies');

  // Search and filters
  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  // Handle add company
  const handleAddCompany = () => {
    openAddCompany({
      onCreated: () => {
        // Company created - list auto-updates via store
      }
    });
  };

  // Sorting handler
  const handleSort = (field: string) => {
    const sortableField = field as SortField;
    if (sortField === sortableField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortableField);
      setSortDirection('asc');
    }
  };

  // Filter logic
  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies;

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.name.toLowerCase().includes(lowerSearch) ||
          company.phone?.toLowerCase().includes(lowerSearch) ||
          company.website?.toLowerCase().includes(lowerSearch)
      );
    }

    // Letter filter
    if (letterFilter) {
      if (letterFilter === '#') {
        filtered = filtered.filter((company) => /^[^a-zA-Z]/.test(company.name));
      } else {
        filtered = filtered.filter((company) =>
          company.name.toLowerCase().startsWith(letterFilter.toLowerCase())
        );
      }
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter((company) => {
        const locations = getAllLocations(company);
        return locations.some(loc => loc.toLowerCase().includes(locationFilter.toLowerCase()));
      });
    }

    // Sales rep filter
    if (salesRepFilter) {
      filtered = filtered.filter((company) => {
        const repIds = getCompanySalesRepIds(company);
        return repIds.includes(salesRepFilter);
      });
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'location':
          comparison = getLocation(a).localeCompare(getLocation(b));
          break;
        case 'salesRep':
          const aReps = getCompanySalesRepNames(a).join(', ');
          const bReps = getCompanySalesRepNames(b).join(', ');
          comparison = aReps.localeCompare(bReps);
          break;
        case 'contacts':
          comparison = getContactCount(a.id) - getContactCount(b.id);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [companies, search, letterFilter, locationFilter, salesRepFilter, sortField, sortDirection]);

  // Get unique locations for filter dropdown
  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    companies.forEach((company) => {
      getAllLocations(company).forEach(loc => locations.add(loc));
    });
    return Array.from(locations)
      .sort()
      .map((loc) => ({ value: loc, label: loc }));
  }, [companies]);

  // Get sales rep options for filter
  const salesRepOptions = useMemo(() => {
    const repsWithCompanies = new Set<string>();
    companies.forEach((company) => {
      const repIds = getCompanySalesRepIds(company);
      repIds.forEach(id => repsWithCompanies.add(id));
    });
    return users
      .filter((u) => repsWithCompanies.has(u.id))
      .map((u) => ({ value: u.id, label: u.name }));
  }, [companies, users]);

  // Check if any filters are active
  const hasActiveFilters = !!(search || letterFilter || locationFilter || salesRepFilter);

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setLetterFilter(null);
    setLocationFilter('');
    setSalesRepFilter('');
  };

  // Table columns
  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortable: true,
      render: (company) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {company.name}
            </div>
            {company.website && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {company.website}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (company) => {
        const locations = getAllLocations(company);
        if (locations.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{locations[0]}</span>
            {locations.length > 1 && (
              <span className="text-xs text-slate-400">+{locations.length - 1}</span>
            )}
          </div>
        );
      },
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
        return (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{repNames[0]}</span>
            {repNames.length > 1 && (
              <span className="text-xs text-slate-400">+{repNames.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'contacts',
      header: 'Contacts',
      sortable: true,
      render: (company) => {
        const count = getContactCount(company.id);
        return (
          <span className="text-slate-600 dark:text-slate-300">
            {count}
          </span>
        );
      },
    },
  ];

  return (
    <Page
      title="Companies"
      description={`${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
      actions={
        <Button onClick={handleAddCompany}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      }
    >
      <div className="flex flex-col h-full">
        {/* Alphabet Filter */}
        <div className="mb-4">
          <AlphabetFilter
            selected={letterFilter}
            onSelect={setLetterFilter}
            items={companies.map(c => c.name)}
          />
        </div>

        {/* Search and Filters */}
        <FilterBar className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search companies..."
            className="w-64"
          />
          <FilterCount count={filteredAndSortedCompanies.length} singular="company" plural="companies" />
          <SelectFilter
            label="Location"
            value={locationFilter}
            options={locationOptions}
            onChange={setLocationFilter}
            icon={MapPin}
            size="sm"
            className="w-36"
          />
          <SelectFilter
            label="Sales Rep"
            value={salesRepFilter}
            options={salesRepOptions}
            onChange={setSalesRepFilter}
            icon={User}
            size="sm"
            className="w-36"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {/* Data Table - fills remaining height */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={filteredAndSortedCompanies}
            rowKey={(company) => company.id}
            onRowClick={(company) => navigate(getCompanyUrl(company))}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
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
                  <Button variant="primary" className="mt-4" onClick={handleAddCompany}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Company
                  </Button>
                )}
              </CardContent>
            }
          />
        </div>
      </div>
    </Page>
  );
}

export default CompaniesPage;