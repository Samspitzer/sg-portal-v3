import { useDocumentTitle } from '@/hooks';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Receipt,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, ConfirmModal } from '@/components/common';
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useMarkInvoicePaid,
  useClients,
  type Invoice,
  type CreateInvoiceInput,
  type InvoiceStatus,
} from '@/services/api';
import { useToast } from '@/contexts';
// import { AIAssistant } from '@/components/ai/AIAssistant';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  paid: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  overdue: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

const STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  draft: <Receipt className="w-3 h-3" />,
  sent: <Clock className="w-3 h-3" />,
  paid: <CheckCircle className="w-3 h-3" />,
  overdue: <AlertCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormData {
  clientId: string;
  projectId: string;
  dueDate: string;
  notes: string;
  taxRate: string;
  lineItems: LineItem[];
}

const initialFormData: InvoiceFormData = {
  clientId: '',
  projectId: '',
  dueDate: '',
  notes: '',
  taxRate: '0',
  lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
};

function InvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onSave: (data: InvoiceFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<InvoiceFormData>(
    invoice
      ? {
          clientId: invoice.clientId,
          projectId: invoice.projectId || '',
          dueDate: invoice.dueDate?.split('T')[0] || '',
          notes: invoice.notes || '',
          taxRate: (invoice.taxRate * 100).toString(),
          lineItems: invoice.lineItems?.length 
            ? invoice.lineItems.map(li => ({
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
              {invoice ? 'Edit Invoice' : 'New Invoice'}
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
                label="Due Date *"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
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
                placeholder="Payment terms, notes..."
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
                    {invoice ? 'Update Invoice' : 'Create Invoice'}
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

function InvoiceCard({ 
  invoice, 
  onEdit, 
  onDelete,
  onMarkPaid,
}: { 
  invoice: Invoice; 
  onEdit: () => void; 
  onDelete: () => void;
  onMarkPaid: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status === 'sent';
  const effectiveStatus = isOverdue ? 'overdue' : invoice.status;

  const daysUntilDue = invoice.dueDate 
    ? Math.ceil((new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card hover className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              effectiveStatus === 'paid' 
                ? 'bg-success-100 dark:bg-success-900/30' 
                : effectiveStatus === 'overdue'
                ? 'bg-danger-100 dark:bg-danger-900/30'
                : 'bg-brand-100 dark:bg-brand-900/30'
            )}>
              <Receipt className={clsx(
                'w-6 h-6',
                effectiveStatus === 'paid' 
                  ? 'text-success-600 dark:text-success-400' 
                  : effectiveStatus === 'overdue'
                  ? 'text-danger-600 dark:text-danger-400'
                  : 'text-brand-600 dark:text-brand-400'
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {invoice.invoiceNumber}
              </h3>
              {invoice.clientName && (
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  <span>{invoice.clientName}</span>
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
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 
                  rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  {(invoice.status === 'draft' || invoice.status === 'sent') && (
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {invoice.status === 'sent' && (
                    <button
                      onClick={() => { onMarkPaid(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-slate-100 dark:hover:bg-slate-700 text-success-600"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Paid
                    </button>
                  )}
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-slate-100 dark:hover:bg-slate-700 text-danger-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            STATUS_COLORS[effectiveStatus]
          )}>
            {STATUS_ICONS[effectiveStatus]}
            {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
          </span>
        </div>

        {/* Due Date */}
        {invoice.dueDate && (
          <div className={clsx(
            'mt-3 flex items-center gap-2 text-sm',
            isOverdue ? 'text-danger-500' : 'text-slate-500 dark:text-slate-400'
          )}>
            <Calendar className="w-4 h-4" />
            <span>
              {invoice.status === 'paid' 
                ? `Paid ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : ''}`
                : isOverdue 
                ? `Overdue by ${Math.abs(daysUntilDue!)} days`
                : daysUntilDue !== null && daysUntilDue <= 7
                ? `Due in ${daysUntilDue} days`
                : `Due ${new Date(invoice.dueDate).toLocaleDateString()}`
              }
            </span>
          </div>
        )}

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
            <span className={clsx(
              'text-lg font-semibold',
              invoice.status === 'paid' ? 'text-success-600' : 'text-slate-900 dark:text-white'
            )}>
              ${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoicesPage() {
  useDocumentTitle('Invoices');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const toast = useToast();

  const { data, isLoading, error, refetch } = useInvoices({
    page,
    limit: 12,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const markPaidMutation = useMarkInvoicePaid();

  const handleSave = async (formData: InvoiceFormData) => {
    const input: CreateInvoiceInput = {
      clientId: formData.clientId,
      projectId: formData.projectId || undefined,
      dueDate: formData.dueDate,
      notes: formData.notes || undefined,
      taxRate: parseFloat(formData.taxRate) / 100,
      lineItems: formData.lineItems.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
      })),
    };

    try {
      if (editingInvoice) {
        await updateMutation.mutateAsync({ id: editingInvoice.id, data: input });
        toast.success('Updated', `Invoice has been updated`);
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Created', `Invoice has been created`);
      }
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err) {
      console.error('Failed to save invoice:', err);
      toast.error('Error', 'Failed to save invoice');
    }
  };

  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      try {
        await deleteMutation.mutateAsync(invoiceToDelete.id);
        toast.success('Deleted', `Invoice ${invoiceToDelete.invoiceNumber} has been removed`);
      } catch (err) {
        console.error('Failed to delete invoice:', err);
        toast.error('Error', 'Failed to delete invoice');
      }
      setInvoiceToDelete(null);
    }
  };

  const handleMarkPaid = (invoice: Invoice) => {
    setInvoiceToMarkPaid(invoice);
  };

  const confirmMarkPaid = async () => {
    if (invoiceToMarkPaid) {
      try {
        await markPaidMutation.mutateAsync({ id: invoiceToMarkPaid.id });
        toast.success('Marked as Paid', `Invoice ${invoiceToMarkPaid.invoiceNumber} has been marked as paid`);
      } catch (err) {
        console.error('Failed to mark invoice as paid:', err);
        toast.error('Error', 'Failed to mark invoice as paid');
      }
      setInvoiceToMarkPaid(null);
    }
  };

  const invoices = data?.data?.invoices || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <Page
      title="Invoices"
      description="Create and track invoices for your clients."
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
            onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }}
          >
            New Invoice
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
            placeholder="Search invoices..."
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
              onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | ''); setPage(1); }}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
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
              <p className="font-medium">Failed to load invoices</p>
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

      {/* Invoices grid */}
      {!isLoading && !error && (
        <>
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                  No invoices found
                </h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {search || statusFilter ? 'Try different filters' : 'Get started by creating your first invoice'}
                </p>
                {!search && !statusFilter && (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
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
              {invoices.map((invoice, index) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <InvoiceCard
                    invoice={invoice}
                    onEdit={() => { setEditingInvoice(invoice); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(invoice)}
                    onMarkPaid={() => handleMarkPaid(invoice)}
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

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingInvoice(null); }}
        invoice={editingInvoice}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${invoiceToDelete?.invoiceNumber}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Mark as Paid Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invoiceToMarkPaid}
        onClose={() => setInvoiceToMarkPaid(null)}
        onConfirm={confirmMarkPaid}
        title="Mark as Paid"
        message={`Mark invoice "${invoiceToMarkPaid?.invoiceNumber}" as paid? This will record today's date as the payment date.`}
        confirmText="Mark as Paid"
        cancelText="Cancel"
        variant="primary"
      />

      {/* AI Assistant - TODO: Enable when AI is set up
      <AIAssistant
        context={{ type: 'invoice', entityId: editingInvoice?.id }}
        entityName={editingInvoice ? `Invoice ${editingInvoice.invoiceNumber}` : undefined}
      />
      */}
    </Page>
  );
}