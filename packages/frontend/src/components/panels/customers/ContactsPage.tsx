import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Edit,
  Trash2,
  Search,
  Smartphone,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal } from '@/components/common';
import { useClientsStore, useUsersStore, useToast, CONTACT_ROLES, type Contact, type ContactRole } from '@/contexts';

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

export function ContactsPage() {
  const { companies, contacts, addContact, updateContact, deleteContact, addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(initialContactFormData);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Add Company Modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCompany = !companyFilter || contact.companyId === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [contacts, search, companyFilter]);

  // Filter companies for dropdown search
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    return companies.filter((company) =>
      company.name.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  // Check if search doesn't match any company exactly
  const showAddCompanyOption = useMemo(() => {
    if (!companySearch.trim()) return false;
    const exactMatch = companies.some(
      (company) => company.name.toLowerCase() === companySearch.toLowerCase()
    );
    return !exactMatch;
  }, [companies, companySearch]);

  const openAddModal = () => {
    setEditingContact(null);
    setFormData(initialContactFormData);
    setCompanySearch('');
    setShowCompanyDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    const company = companies.find((c) => c.id === contact.companyId);
    setFormData({
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || '',
      phoneOffice: contact.phoneOffice || '',
      phoneMobile: contact.phoneMobile || '',
      role: contact.role || '',
      notes: contact.notes || '',
    });
    setCompanySearch(company?.name || '');
    setShowCompanyDropdown(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
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

    if (editingContact) {
      updateContact(editingContact.id, contactData);
      toast.success('Updated', `${formData.firstName} ${formData.lastName} has been updated`);
    } else {
      addContact(contactData);
      toast.success('Created', `${formData.firstName} ${formData.lastName} has been added`);
    }

    closeModal();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteContact(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.firstName} ${deleteTarget.lastName} has been removed`);
      setDeleteTarget(null);
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  const selectCompany = (company: { id: string; name: string }) => {
    setFormData({ ...formData, companyId: company.id });
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
  };

  // Open Add Company Modal with pre-filled name
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
      address: companyFormData.street || companyFormData.city || companyFormData.state || companyFormData.zip
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
    toast.success('Created', `${companyFormData.name} has been added`);

    // Find the newly created company and select it
    // We need to get it after the store updates
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
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {companies.length > 0 && (
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Contacts Grid */}
      {filteredContacts.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-lg font-semibold text-accent-600 dark:text-accent-400">
                        {contact.firstName[0]}{contact.lastName[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        {contact.role && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {contact.role}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(contact)}
                        className="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-slate-400 hover:text-danger-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{getCompanyName(contact.companyId)}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:text-brand-600 truncate">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phoneOffice && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{contact.phoneOffice}</span>
                      </div>
                    )}
                    {contact.phoneMobile && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Smartphone className="w-4 h-4 flex-shrink-0" />
                        <span>{contact.phoneMobile}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Contact Modal */}
            <Modal
            isOpen={showModal}
            onClose={() => {
                // Don't close if the Add Company modal is open
                if (showAddCompanyModal) return;
                closeModal();
            }}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
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
              {editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Company Search Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setShowCompanyDropdown(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, companyId: '' });
                  }
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Search for a company or type to add new..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {showCompanyDropdown && (companySearch || companies.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {/* Add New Company Option */}
                  {showAddCompanyOption && (
                    <button
                      type="button"
                      onClick={openAddCompanyModal}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add "{companySearch.trim()}" as new company</span>
                    </button>
                  )}
                  {/* Existing Companies */}
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
                  {/* No results message */}
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

      {/* Add Company Modal (Nested) */}
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"?`}
        confirmText="Delete"
        variant="danger"
      />
    </Page>
  );
}