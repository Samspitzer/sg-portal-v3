import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Building2,
  Phone,
  Globe,
  MapPin,
  Edit,
  Trash2,
  Search,
  User,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal } from '@/components/common';
import { useClientsStore, useUsersStore, useToast, type Company } from '@/contexts';

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

export function CompaniesPage() {
  const { companies, contacts, addCompany, updateCompany, deleteCompany } = useClientsStore();
  const { users } = useUsersStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [companies, search]);

  const openAddModal = () => {
    setEditingCompany(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      phone: company.phone || '',
      website: company.website || '',
      street: company.address?.street || '',
      city: company.address?.city || '',
      state: company.address?.state || '',
      zip: company.address?.zip || '',
      notes: company.notes || '',
      salesRepId: company.salesRepId || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
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
      address: formData.street || formData.city || formData.state || formData.zip
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

    if (editingCompany) {
      updateCompany(editingCompany.id, companyData);
      toast.success('Updated', `${formData.name} has been updated`);
    } else {
      addCompany(companyData);
      toast.success('Created', `${formData.name} has been added`);
    }

    closeModal();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      const contactCount = contacts.filter((c) => c.companyId === deleteTarget.id).length;
      deleteCompany(deleteTarget.id);
      toast.success(
        'Deleted',
        contactCount > 0
          ? `${deleteTarget.name} and ${contactCount} contact(s) have been removed`
          : `${deleteTarget.name} has been removed`
      );
      setDeleteTarget(null);
    }
  };

  const getSalesRepName = (salesRepId?: string) => {
    if (!salesRepId) return null;
    const user = users.find((u) => u.id === salesRepId);
    return user?.name || null;
  };

  const getContactCount = (companyId: string) => {
    return contacts.filter((c) => c.companyId === companyId).length;
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
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {company.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {getContactCount(company.id)} contact{getContactCount(company.id) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(company)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(company)}
                        className="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-slate-400 hover:text-danger-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {company.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        
                          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-600 truncate"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {company.address?.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {[company.address.city, company.address.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {getSalesRepName(company.salesRepId) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span>Rep: {getSalesRepName(company.salesRepId)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
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
              {editingCompany ? 'Update Company' : 'Add Company'}
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={
          getContactCount(deleteTarget?.id || '') > 0
            ? `Are you sure you want to delete "${deleteTarget?.name}"? This will also remove ${getContactCount(deleteTarget?.id || '')} contact(s) associated with this company.`
            : `Are you sure you want to delete "${deleteTarget?.name}"?`
        }
        confirmText="Delete"
        variant="danger"
      />
    </Page>
  );
}