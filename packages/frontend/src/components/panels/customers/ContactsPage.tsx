// ============================================================================
// ContactsPage - Contact Listing with Add Contact Form
// Location: src/components/panels/ContactsPage.tsx
// 
// UPDATED: Now uses AddContactForm from add-forms for creating contacts
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { useClientsStore, useFieldsStore, useUsersStore, getCompanySalesRepIds, type Contact, type Company } from '@/contexts';
import { CardContent, Button, SearchInput, FilterBar, FilterCount, SelectFilter } from '@/components/common';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { useFormStack } from '@/components/panels/add-forms';
import { useDocumentTitle, getContactUrl, getCompanyUrl, useTableSort } from '@/hooks';

type SortField = 'name' | 'company' | 'email' | 'role';

export function ContactsPage() {
  const navigate = useNavigate();
  const { contacts, companies } = useClientsStore();
  const { contactRoles } = useFieldsStore();
  const { users } = useUsersStore();
  const { openAddContact } = useFormStack();
  useDocumentTitle('Contacts');

  // Search and filters
  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Sorting
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('name');

  // Helper functions
  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || '';
  };

  const getCompanyById = (companyId: string): Company | undefined => {
    return companies.find((c) => c.id === companyId);
  };

  const getSalesRepNamesForContact = (contact: Contact): string[] => {
    const company = getCompanyById(contact.companyId);
    if (!company) return [];
    const repIds = getCompanySalesRepIds(company);
    return repIds
      .map(id => users.find(u => u.id === id)?.name)
      .filter((n): n is string => !!n);
  };

  const getFullName = (contact: Contact) => {
    return `${contact.firstName} ${contact.lastName}`.trim();
  };

  // Handle add contact
  const handleAddContact = () => {
    openAddContact({
      onCreated: () => {
        // Contact created - list auto-updates via store
      }
    });
  };

  // Filter logic
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts;

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((contact) => {
        const fullName = getFullName(contact).toLowerCase();
        const companyName = getCompanyName(contact.companyId).toLowerCase();
        return (
          fullName.includes(lowerSearch) ||
          companyName.includes(lowerSearch) ||
          contact.email?.toLowerCase().includes(lowerSearch) ||
          contact.phoneOffice?.includes(search) ||
          contact.phoneMobile?.includes(search)
        );
      });
    }

    // Letter filter
    if (letterFilter) {
      if (letterFilter === '#') {
        filtered = filtered.filter((contact) => /^[^a-zA-Z]/.test(contact.firstName));
      } else {
        filtered = filtered.filter((contact) =>
          contact.firstName.toLowerCase().startsWith(letterFilter.toLowerCase())
        );
      }
    }

    // Company filter
    if (companyFilter) {
      filtered = filtered.filter((contact) => contact.companyId === companyFilter);
    }

    // Role filter
    if (roleFilter) {
      filtered = filtered.filter((contact) => contact.role === roleFilter);
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = getFullName(a).localeCompare(getFullName(b));
          break;
        case 'company':
          comparison = getCompanyName(a.companyId).localeCompare(getCompanyName(b.companyId));
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [contacts, search, letterFilter, companyFilter, roleFilter, sortField, sortDirection, companies]);

  // Get company options for filter dropdown
  const companyOptions = useMemo(() => {
    const companiesWithContacts = new Set(contacts.map(c => c.companyId));
    return companies
      .filter(c => companiesWithContacts.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: c.name }));
  }, [contacts, companies]);

  // Get role options for filter dropdown
  const roleOptions = useMemo(() => {
    return contactRoles.map(role => ({ value: role, label: role }));
  }, [contactRoles]);

  // Check if any filters are active
  const hasActiveFilters = !!(search || letterFilter || companyFilter || roleFilter);

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setLetterFilter(null);
    setCompanyFilter('');
    setRoleFilter('');
  };

  // Table columns
  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      sortable: true,
      render: (contact) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {getFullName(contact)}
            </div>
            {contact.role && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {contact.role}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (contact) => {
        const company = getCompanyById(contact.companyId);
        if (!company) return <span className="text-slate-400">—</span>;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(getCompanyUrl(company));
            }}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{company.name}</span>
          </button>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (contact) => {
        if (!contact.email) return <span className="text-slate-400">—</span>;
        return (
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[200px]">{contact.email}</span>
          </a>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (contact) => {
        const phone = contact.phoneMobile || contact.phoneOffice;
        if (!phone) return <span className="text-slate-400">—</span>;
        return (
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{phone}</span>
          </a>
        );
      },
    },
    {
      key: 'salesRep',
      header: 'Sales Rep',
      render: (contact) => {
        const names = getSalesRepNamesForContact(contact);
        if (names.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{names[0]}</span>
            {names.length > 1 && (
              <span className="text-xs text-slate-400">+{names.length - 1}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Page
      title="Contacts"
      description={`${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`}
      fillHeight
      actions={
        <Button onClick={handleAddContact}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <FilterBar
          rightContent={<FilterCount count={filteredAndSortedContacts.length} singular="contact" />}
          secondaryRow={
            <AlphabetFilter
              selected={letterFilter}
              onSelect={setLetterFilter}
              items={contacts.map(c => c.firstName)}
            />
          }
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search contacts..."
            className="w-64"
          />
          <SelectFilter
            label="Company"
            value={companyFilter}
            options={companyOptions}
            onChange={setCompanyFilter}
            icon={Building2}
            size="sm"
            className="w-44"
          />
          <SelectFilter
            label="Role"
            value={roleFilter}
            options={roleOptions}
            onChange={setRoleFilter}
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
            data={filteredAndSortedContacts}
            rowKey={(contact) => contact.id}
            onRowClick={(contact) => navigate(getContactUrl(contact))}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
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
                  <Button variant="primary" className="mt-4" onClick={handleAddContact}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
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

export default ContactsPage;