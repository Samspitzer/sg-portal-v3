import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Smartphone,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, SearchInput } from '@/components/common';
import { useClientsStore, useUsersStore, useToast, CONTACT_ROLES, type ContactRole } from '@/contexts';

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
  const { companies, contacts, addContact, addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialContactFormData);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterCompanySearch, setFilterCompanySearch] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  const filteredAndSortedContacts = useMemo(() => {
    let result = contacts.filter((contact) => {
      const matchesSearch =
        contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCompany = !companyFilter || contact.companyId === companyFilter;
      return matchesSearch && matchesCompany;
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
          aVal = getCompanyName(a.companyId).toLowerCase();
          bVal = getCompanyName(b.companyId).toLowerCase();
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
  }, [contacts, search, companyFilter, sortField, sortDirection, companies]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

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

  const selectCompany = (company: { id: string; name: string }) => {
    setFormData({ ...formData, companyId: company.id });
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
  };

  const openAddCompanyModal = () => {
    setCompanyFormData({
      ...initialCompanyFormData,
      name: companySearch.trim(),
    });
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

    setTimeout(() => {
      const newCompany = useClientsStore.getState().companies.find(
        (c) => c.name === companyFormData.name.trim()
      );
      if (newCompany) {
        setFormData({ ...formData, companyId: newCompany.id });
        setCompanySearch(newCompany.name);
      }
    }, 100);

    closeAddCompanyModal();
  };

  const hasContactChanges =
    formData.companyId !== '' ||
    formData.firstName.trim() !== '' ||
    formData.lastName.trim() !== '' ||
    formData.email !== '' ||
    formData.phoneOffice !== '' ||
    formData.phoneMobile !== '' ||
    formData.role !== '' ||
    formData.notes !== '';

  const hasCompanyChanges =
    companyFormData.name.trim() !== '' ||
    companyFormData.phone !== '' ||
    companyFormData.website !== '' ||
    companyFormData.street !== '' ||
    companyFormData.city !== '' ||
    companyFormData.state !== '' ||
    companyFormData.zip !== '' ||
    companyFormData.notes !== '' ||
    companyFormData.salesRepId !== '';

  return (
    <Page
      title="Contacts"
      description="Manage your client contacts."
      actions={
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      }
    >
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search contacts..."
          className="flex-1 max-w-md"
        />
        {companies.length > 0 && (
          <div className="relative">
            <SearchInput
              value={filterCompanySearch}
              onChange={(val) => {
                setFilterCompanySearch(val);
                setShowFilterDropdown(true);
              }}
              onClear={() => {
                setCompanyFilter('');
                setShowFilterDropdown(false);
              }}
              onFocus={() => setShowFilterDropdown(true)}
              placeholder="All Companies"
              icon={<Building2 className="w-4 h-4" />}
              className="w-56"
            />
            {showFilterDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyFilter('');
                    setFilterCompanySearch('');
                    setShowFilterDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  All Companies
                </button>
                {companies
                  .filter((c) => c.name.toLowerCase().includes(filterCompanySearch.toLowerCase()))
                  .map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setCompanyFilter(company.id);
                        setFilterCompanySearch(company.name);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      {company.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {filteredAndSortedContacts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {search || companyFilter ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {search || companyFilter ? 'Try a different search or filter' : 'Get started by adding your first contact'}
            </p>
            {!search && !companyFilter && (
              <Button variant="primary" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      <SortIcon field="role" />
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1">
                      Company
                      <SortIcon field="company" />
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      <SortIcon field="email" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Work Phone
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mobile
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate('/clients/contacts/' + contact.id)}
                        className="flex items-center gap-3 text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-sm font-semibold text-accent-600 dark:text-accent-400 flex-shrink-0">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
                          {contact.firstName} {contact.lastName}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {contact.role || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          const company = companies.find(c => c.id === contact.companyId);
                          if (company) {
                            navigate('/clients/companies/' + company.id);
                          }
                        }}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        {getCompanyName(contact.companyId)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {contact.email ? (
                        <a
                          href={'mailto:' + contact.email}
                          className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {contact.phoneOffice ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phoneOffice}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {contact.phoneMobile ? (
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {contact.phoneMobile}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
            <div className="relative">
              <SearchInput
                value={companySearch}
                onChange={(val) => {
                  setCompanySearch(val);
                  setShowCompanyDropdown(true);
                  if (!val) {
                    setFormData({ ...formData, companyId: '' });
                  }
                }}
                onClear={() => {
                  setFormData({ ...formData, companyId: '' });
                  setShowCompanyDropdown(false);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Search for a company or type to add new..."
                icon={<Building2 className="w-4 h-4" />}
              />
              {showCompanyDropdown && (companySearch || companies.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {showAddCompanyOption && (
                    <button
                      type="button"
                      onClick={openAddCompanyModal}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add &quot;{companySearch.trim()}&quot; as new company</span>
                    </button>
                  )}
                  {filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => selectCompany(company)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      {company.name}
                    </button>
                  ))}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as ContactRole | '' })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a role...</option>
              {CONTACT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

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
              value={formData.phoneOffice}
              onChange={(e) => setFormData({ ...formData, phoneOffice: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Phone (Mobile)"
              value={formData.phoneMobile}
              onChange={(e) => setFormData({ ...formData, phoneMobile: e.target.value })}
              placeholder="(555) 987-6543"
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sales Rep
              </label>
              <select
                value={companyFormData.salesRepId}
                onChange={(e) => setCompanyFormData({ ...companyFormData, salesRepId: e.target.value })}
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
              label="ZIP Code"
              value={companyFormData.zip}
              onChange={(e) => setCompanyFormData({ ...companyFormData, zip: e.target.value })}
              placeholder="10001"
            />
          </div>

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
    </Page>
  );
}