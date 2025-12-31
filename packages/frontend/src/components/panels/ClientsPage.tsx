import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/common';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  type Client,
  type CreateClientInput,
} from '@/services/api';
import { AIAssistant } from '@/components/ai/AIAssistant';

interface ClientFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

const initialFormData: ClientFormData = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  notes: '',
};

function ClientModal({
  isOpen,
  onClose,
  client,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSave: (data: ClientFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ClientFormData>(
    client
      ? {
          companyName: client.companyName,
          contactName: client.contactName || '',
          email: client.email,
          phone: client.phone || '',
          website: client.website || '',
          addressLine1: client.addressLine1 || '',
          city: client.city || '',
          state: client.state || '',
          postalCode: client.postalCode || '',
          notes: client.notes || '',
        }
      : initialFormData
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {client ? 'Edit Client' : 'New Client'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name *"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
              <Input
                label="Contact Name"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
              <Input
                label="Address"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  label="ZIP Code"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {client ? 'Update Client' : 'Create Client'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ClientCard({ client, onEdit, onDelete }: { 
  client: Client; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card hover className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {client.companyName}
              </h3>
              {client.contactName && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {client.contactName}
                </p>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(); }}
                    className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${client.email}`} className="hover:text-brand-600">
              {client.email}
            </a>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4" />
              <a href={`tel:${client.phone}`} className="hover:text-brand-600">
                {client.phone}
              </a>
            </div>
          )}
          {client.city && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>
                {[client.city, client.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className={clsx(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            client.isActive
              ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          )}>
            {client.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data, isLoading, error, refetch } = useClients({
    page,
    limit: 12,
    search: search || undefined,
    active: true,
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const handleSave = async (formData: ClientFormData) => {
    const input: CreateClientInput = {
      companyName: formData.companyName,
      email: formData.email,
      contactName: formData.contactName || undefined,
      phone: formData.phone || undefined,
      website: formData.website || undefined,
      addressLine1: formData.addressLine1 || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      postalCode: formData.postalCode || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (editingClient) {
        await updateMutation.mutateAsync({ id: editingClient.id, data: input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (err) {
      console.error('Failed to save client:', err);
    }
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm(`Are you sure you want to delete "${client.companyName}"?`)) {
      try {
        await deleteMutation.mutateAsync(client.id);
      } catch (err) {
        console.error('Failed to delete client:', err);
      }
    }
  };

  const clients = data?.data?.clients || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <Page
      title="Clients"
      description="Manage your customer relationships and contact information."
      actions={
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
        >
          New Client
        </Button>
      }
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center gap-4 text-danger-600">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">Failed to load clients</p>
              <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      )}

      {/* Clients grid */}
      {!isLoading && !error && (
        <>
          {clients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                  No clients found
                </h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {search ? 'Try a different search term' : 'Get started by adding your first client'}
                </p>
                {!search && (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {clients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ClientCard
                    client={client}
                    onEdit={() => { setEditingClient(client); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(client)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
        client={editingClient}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* AI Assistant */}
      <AIAssistant
        context={{ type: 'client', entityId: editingClient?.id }}
        entityName={editingClient?.companyName}
      />
    </Page>
  );
}
