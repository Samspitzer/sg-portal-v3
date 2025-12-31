import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface EstimateLineItem {
  id: string;
  estimateId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  clientId: string;
  projectId: string | null;
  status: EstimateStatus;
  issueDate: string;
  expiryDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  clientName?: string;
  projectName?: string;
  createdByName?: string;
  // Optional line items (included when fetching single estimate)
  lineItems?: EstimateLineItem[];
}

export interface EstimateWithLineItems extends Estimate {
  lineItems: EstimateLineItem[];
}

export interface EstimatesResponse {
  estimates: Estimate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEstimateInput {
  clientId: string;
  projectId?: string;
  issueDate?: string;
  expiryDate?: string;
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

export interface UpdateEstimateInput {
  clientId?: string;
  projectId?: string;
  status?: EstimateStatus;
  issueDate?: string;
  expiryDate?: string;
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

export interface EstimatesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EstimateStatus;
  clientId?: string;
}

// Query keys
export const estimateKeys = {
  all: ['estimates'] as const,
  lists: () => [...estimateKeys.all, 'list'] as const,
  list: (params: EstimatesParams) => [...estimateKeys.lists(), params] as const,
  details: () => [...estimateKeys.all, 'detail'] as const,
  detail: (id: string) => [...estimateKeys.details(), id] as const,
};

// Get all estimates with pagination and filtering
export function useEstimates(params: EstimatesParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);
  if (params.clientId) queryParams.set('clientId', params.clientId);

  const queryString = queryParams.toString();
  const url = `/estimates${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: estimateKeys.list(params),
    queryFn: () => api.get<EstimatesResponse>(url),
    staleTime: 30 * 1000,
  });
}

// Get single estimate by ID
export function useEstimate(id: string) {
  return useQuery({
    queryKey: estimateKeys.detail(id),
    queryFn: () => api.get<EstimateWithLineItems>(`/estimates/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// Create estimate mutation
export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEstimateInput) =>
      api.post<EstimateWithLineItems>('/estimates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

// Update estimate mutation
export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEstimateInput }) =>
      api.patch<EstimateWithLineItems>(`/estimates/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(variables.id) });
    },
  });
}

// Delete estimate mutation
export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/estimates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

// Convert estimate to invoice
export function useConvertEstimateToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ invoice: { id: string; invoiceNumber: string } }>(`/estimates/${id}/convert-to-invoice`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
