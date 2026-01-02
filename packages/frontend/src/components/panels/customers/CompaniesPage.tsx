import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Building2,
  Globe,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { useClientsStore, useUsersStore, useToast, type Company } from '@/contexts';
import { Card, CardContent, Button, Input, Modal, SearchInput } from '@/components/common';

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

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

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

  const filteredAndSortedCompanies = useMemo(() => {
    let result = companies.filter((company) =>
      company.name.toLowerCase().includes(search.toLowerCase())
    );

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
  }, [companies, search, sortField, sortDirection, contacts, users]);

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
    setFormData(initialFormData);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }

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

  return (
    <Page
      title="Companies"
      description="Manage your client companies."
      actions={
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      }
    >
      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search companies..."
          className="max-w-md"
        />
      </div>

      {filteredAndSortedCompanies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {search ? 'No companies found' : 'No companies yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {search ? 'Try a different search term' : 'Get started by adding your first company'}
            </p>
            {!search && (
              <Button variant="primary" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
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
                      Company Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Website
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      <SortIcon field="location" />
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('salesRep')}
                  >
                    <div className="flex items-center gap-1">
                      Sales Rep
                      <SortIcon field="salesRep" />
                    </div>
                  </th>
                  <th
                    className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('contacts')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Contacts
                      <SortIcon field="contacts" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedCompanies.map((company) => {
                  const websiteUrl = company.website
                    ? company.website.startsWith('http')
                      ? company.website
                      : 'https://' + company.website
                    : '';
                  const websiteDisplay = company.website
                    ? company.website.replace(/^https?:\/\//, '')
                    : '';

                  return (
                    <tr
                      key={company.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/clients/companies/' + company.id)}
                          className="flex items-center gap-3 text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
                            {company.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {company.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {company.website ? (
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
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {getLocation(company) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {getSalesRepName(company.salesRepId) || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">
                        {getContactCount(company.id)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
    </Page>
  );
}