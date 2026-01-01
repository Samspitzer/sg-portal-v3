import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Send,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, ConfirmModal } from '@/components/common';
import {
  useEstimates,
  useCreateEstimate,
  useUpdateEstimate,
  useDeleteEstimate,
  useConvertEstimateToInvoice,
  useClients,
  type Estimate,
  type CreateEstimateInput,
  type EstimateStatus,
} from '@/services/api';
import { useToast } from '@/contexts';
// import { AIAssistant } from '@/components/ai/AIAssistant';

const STATUS_COLORS: Record<EstimateStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  approved: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  rejected: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  expired: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
};

const STATUS_ICONS: Record<EstimateStatus, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  sent: <Send className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
  expired: <AlertCircle className="w-3 h-3" />,
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface EstimateFormData {
  clientId: string;
  validUntil: string;
  notes: string;
  taxRate: string;
  lineItems: LineItem[];
}

const initialFormData: EstimateFormData = {
  clientId: '',
  validUntil: '',
  notes: '',
  taxRate: '0',
  lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
};

function EstimateModal({
  isOpen,
  onClose,
  estimate,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  estimate?: Estimate | null;
  onSave: (data: EstimateFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<EstimateFormData>(
    estimate
      ? {
          clientId: estimate.clientId,
          validUntil: estimate.expiryDate?.split('T')[0] || '',
          notes: estimate.notes || '',
          taxRate: (estimate.taxRate * 100).toString(),
          lineItems: estimate.lineItems?.length 
            ? estimate.lineItems.map(li => ({
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
              }))
            : [{ description: '', quantity: 1, unitPrice: 0 }],
        }
      : initialFormData
  );

  const { data: clientsData } = useClients({ limit: 100, active: true });
  const clients = clientsData?.data?.clients || [];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      setFormData({
        ...formData,
        lineItems: formData.lineItems.filter((_, i) => i !== index),
      });
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value } as LineItem;
    setFormData({ ...formData, lineItems: updated });
  };

  const subtotal = formData.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (parseFloat(formData.taxRate) / 100);
  const total = subtotal + taxAmount;

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
          className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {estimate ? 'Edit Estimate' : 'New Estimate'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Valid Until"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />

              <Input
                label="Tax Rate (%)"
                type="number"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Line Items
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {formData.lineItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                          bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm
                          focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                          bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-right
                          focus:outline-none focus:ring-2 focus:ring-brand-500"
                        min="1"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                          bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm text-right
                          focus:outline-none focus:ring-2 focus:ring-brand-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="w-28 text-right py-2 text-sm font-medium text-slate-900 dark:text-white">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={formData.lineItems.length === 1}
                      className="p-2 text-slate-400 hover:text-danger-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-end text-sm">
                  <span className="text-slate-500 w-32">Subtotal:</span>
                  <span className="w-28 text-right font-medium text-slate-900 dark:text-white">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-end text-sm">
                  <span className="text-slate-500 w-32">Tax ({formData.taxRate}%):</span>
                  <span className="w-28 text-right font-medium text-slate-900 dark:text-white">
                    ${taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-end text-base font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 w-32">Total:</span>
                  <span className="w-28 text-right text-brand-600 dark:text-brand-400">
                    ${total.toFixed(2)}
                  </span>
                </div>
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
                placeholder="Additional notes or terms..."
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
                    {estimate ? 'Update Estimate' : 'Create Estimate'}
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

function EstimateCard({ 
  estimate, 
  onEdit, 
  onDelete,
  onConvert,
}: { 
  estimate: Estimate; 
  onEdit: () => void; 
  onDelete: () => void;
  onConvert: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  
  const isExpired = estimate.expiryDate && new Date(estimate.expiryDate) < new Date();
  const effectiveStatus = isExpired && estimate.status === 'sent' ? 'expired' : estimate.status;

  return (
    <Card hover className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {estimate.estimateNumber}
              </h3>
              {estimate.clientName && (
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  <span>{estimate.clientName}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 
                  rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  {(estimate.status === 'draft' || estimate.status === 'sent') && (
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {estimate.status === 'approved' && (
                    <button
                      onClick={() => { onConvert(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-slate-100 dark:hover:bg-slate-700 text-success-600"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convert to Invoice
                    </button>
                  )}
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-danger-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-4">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            STATUS_COLORS[effectiveStatus]
          )}>
            {STATUS_ICONS[effectiveStatus]}
            {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
          </span>
        </div>

        {/* Valid Until */}
        {estimate.expiryDate && (
          <div className={clsx(
            'mt-3 flex items-center gap-2 text-sm',
            isExpired ? 'text-danger-500' : 'text-slate-500 dark:text-slate-400'
          )}>
            <Calendar className="w-4 h-4" />
            <span>
              Valid until {new Date(estimate.expiryDate).toLocaleDateString()}
              {isExpired && ' (Expired)'}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              ${estimate.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EstimatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);
  const [estimateToConvert, setEstimateToConvert] = useState<Estimate | null>(null);
  const toast = useToast();

  const { data, isLoading, error, refetch } = useEstimates({
    page,
    limit: 12,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateEstimate();
  const updateMutation = useUpdateEstimate();
  const deleteMutation = useDeleteEstimate();
  const convertMutation = useConvertEstimateToInvoice();

  const handleSave = async (formData: EstimateFormData) => {
    const input: CreateEstimateInput = {
      clientId: formData.clientId,
      expiryDate: formData.validUntil || undefined,
      notes: formData.notes || undefined,
      taxRate: parseFloat(formData.taxRate) / 100,
      lineItems: formData.lineItems.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
      })),
    };

    try {
      if (editingEstimate) {
        await updateMutation.mutateAsync({ id: editingEstimate.id, data: input });
        toast.success('Updated', `Estimate has been updated`);
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Created', `Estimate has been created`);
      }
      setIsModalOpen(false);
      setEditingEstimate(null);
    } catch (err) {
      console.error('Failed to save estimate:', err);
      toast.error('Error', 'Failed to save estimate');
    }
  };

  const handleDelete = (estimate: Estimate) => {
    setEstimateToDelete(estimate);
  };

  const confirmDelete = async () => {
    if (estimateToDelete) {
      try {
        await deleteMutation.mutateAsync(estimateToDelete.id);
        toast.success('Deleted', `Estimate ${estimateToDelete.estimateNumber} has been removed`);
      } catch (err) {
        console.error('Failed to delete estimate:', err);
        toast.error('Error', 'Failed to delete estimate');
      }
      setEstimateToDelete(null);
    }
  };

  const handleConvert = (estimate: Estimate) => {
    setEstimateToConvert(estimate);
  };

  const confirmConvert = async () => {
    if (estimateToConvert) {
      try {
        await convertMutation.mutateAsync(estimateToConvert.id);
        toast.success('Converted', `Estimate ${estimateToConvert.estimateNumber} has been converted to an invoice`);
      } catch (err) {
        console.error('Failed to convert estimate:', err);
        toast.error('Error', 'Failed to convert estimate to invoice');
      }
      setEstimateToConvert(null);
    }
  };

  const estimates = data?.data?.estimates || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <Page
      title="Estimates"
      description="Create and manage estimates for your clients."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => { setEditingEstimate(null); setIsModalOpen(true); }}
          >
            New Estimate
          </Button>
        </div>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search estimates..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3"
          >
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as EstimateStatus | ''); setPage(1); }}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </motion.div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center gap-4 text-danger-600">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">Failed to load estimates</p>
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

      {/* Estimates grid */}
      {!isLoading && !error && (
        <>
          {estimates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                  No estimates found
                </h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {search || statusFilter ? 'Try different filters' : 'Get started by creating your first estimate'}
                </p>
                {!search && !statusFilter && (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => { setEditingEstimate(null); setIsModalOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Estimate
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
              {estimates.map((estimate, index) => (
                <motion.div
                  key={estimate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EstimateCard
                    estimate={estimate}
                    onEdit={() => { setEditingEstimate(estimate); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(estimate)}
                    onConvert={() => handleConvert(estimate)}
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

      {/* Estimate Modal */}
      <EstimateModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEstimate(null); }}
        estimate={editingEstimate}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!estimateToDelete}
        onClose={() => setEstimateToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Estimate"
        message={`Are you sure you want to delete estimate "${estimateToDelete?.estimateNumber}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Convert to Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={!!estimateToConvert}
        onClose={() => setEstimateToConvert(null)}
        onConfirm={confirmConvert}
        title="Convert to Invoice"
        message={`Convert estimate "${estimateToConvert?.estimateNumber}" to an invoice? This will create a new invoice with the same line items.`}
        confirmText="Convert"
        cancelText="Cancel"
        variant="primary"
      />

      {/* AI Assistant - TODO: Enable when AI is set up
      <AIAssistant
        context={{ type: 'estimate', entityId: editingEstimate?.id }}
        entityName={editingEstimate ? `Estimate ${editingEstimate.estimateNumber}` : undefined}
      />
      */}
    </Page>
  );
}