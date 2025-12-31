import { Request } from 'express';

// User & Auth Types
export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  azureToken?: string;
}

export interface AzureTokenPayload {
  aud: string;
  iss: string;
  sub: string;
  oid: string;
  preferred_username: string;
  name: string;
  email?: string;
  roles?: string[];
  tid: string;
  exp: number;
  iat: number;
}

// Database Models
export interface DBUser {
  id: string;
  azure_oid: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DBProject {
  id: string;
  name: string;
  description?: string;
  client_id: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: Date;
  end_date?: Date;
  budget?: number;
  spent?: number;
  manager_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBClient {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DBEstimate {
  id: string;
  estimate_number: string;
  client_id: string;
  project_id?: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  valid_until?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBEstimateLineItem {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: Date;
}

export interface DBInvoice {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id?: string;
  estimate_id?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: Date;
  due_date: Date;
  paid_date?: Date;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  due_date?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DBActivity {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Dashboard Stats
export interface DashboardStats {
  revenue: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  projects: {
    active: number;
    completed: number;
    total: number;
  };
  estimates: {
    pending: number;
    approved: number;
    conversionRate: number;
  };
  invoices: {
    outstanding: number;
    overdue: number;
    collected: number;
  };
}
