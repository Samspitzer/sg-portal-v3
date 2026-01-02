// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type UserRole = 
  | 'admin'
  | 'manager'
  | 'estimator'
  | 'accountant'
  | 'project_manager'
  | 'developer'
  | 'viewer';

export type Permission =
  // Dashboard
  | 'dashboard:view'
  | 'dashboard:edit'
  // Customers
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:delete'
  // Projects
  | 'projects:view'
  | 'projects:create'
  | 'projects:edit'
  | 'projects:delete'
  // Estimating
  | 'estimating:view'
  | 'estimating:create'
  | 'estimating:edit'
  | 'estimating:delete'
  | 'estimating:approve'
  // Accounting
  | 'accounting:view'
  | 'accounting:create'
  | 'accounting:edit'
  | 'accounting:delete'
  | 'accounting:approve'
  | 'accounting:payments'
  // Admin
  | 'admin:view'
  | 'admin:users'
  | 'admin:roles'
  | 'admin:departments'
  | 'admin:company'
  // Developer
  | 'developer:view'
  | 'developer:manage';;

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  error: string | null;
}

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  exp: number;
  iat: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Panel & Navigation Types
// ============================================

export type PanelId = 
  | 'dashboard'
  | 'accounting'
  | 'projects'
  | 'estimating'
  | 'customers'
  | 'admin'
  | 'developer';

export interface Panel {
  id: PanelId;
  name: string;
  icon: string;
  path: string;
  requiredPermission: Permission;
  subItems?: PanelSubItem[];
}

export interface PanelSubItem {
  id: string;
  name: string;
  path: string;
  requiredPermission?: Permission;
}

// ============================================
// Notification Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export type NotificationType = 
  | 'system'
  | 'project'
  | 'estimate'
  | 'invoice'
  | 'customer'
  | 'alert';
