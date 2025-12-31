import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  estimateId: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  terms: string | null;
  paidAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  clientName?: string;
  projectName?: string;
  createdByName?: string;
  // Optional line items (included when fetching single invoice)
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
  client?: {
    companyName: string;
    email: string;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  projectId?: string;
  issueDate?: string;
  dueDate: string;
  taxRate?: number;
  notes?: string;
  terms?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }[];
}

export interface UpdateInvoiceInput {
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  terms?: string;
  lineItems?: {
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }[];
}

export interface InvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  clientId?: string;
}

// Query keys
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoicesParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// Get all invoices with pagination and filtering
export function useInvoices(params: InvoicesParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);
  if (params.clientId) queryParams.set('clientId', params.clientId);

  const queryString = queryParams.toString();
  const url = `/invoices${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => api.get<InvoicesResponse>(url),
    staleTime: 30 * 1000,
  });
}

// Get single invoice by ID
export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get<InvoiceWithLineItems>(`/invoices/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// Create invoice mutation
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) =>
      api.post<InvoiceWithLineItems>('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Update invoice mutation
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceInput }) =>
      api.patch<InvoiceWithLineItems>(`/invoices/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
    },
  });
}

// Delete invoice mutation
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Mark invoice as paid
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amountPaid }: { id: string; amountPaid?: number }) =>
      api.post<Invoice>(`/invoices/${id}/mark-paid`, { amountPaid }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
