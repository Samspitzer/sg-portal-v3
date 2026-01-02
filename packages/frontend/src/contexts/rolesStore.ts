import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Array of permission IDs
  isSystem?: boolean; // System roles can't be deleted
}

interface RolesStore {
  roles: Role[];
  permissions: Permission[];
  addRole: (name: string, description: string) => void;
  updateRole: (id: string, updates: Partial<Omit<Role, 'id' | 'isSystem'>>) => void;
  deleteRole: (id: string) => void;
  setRolePermissions: (roleId: string, permissionIds: string[]) => void;
  toggleRolePermission: (roleId: string, permissionId: string) => void;
  getRolePermissions: (roleId: string) => Permission[];
  hasPermission: (roleId: string, permissionId: string) => boolean;
  resetToDefaults: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// Default permissions organized by category
const defaultPermissions: Permission[] = [
  // Dashboard
  { id: 'dashboard:view', name: 'View Dashboard', description: 'Access the main dashboard', category: 'Dashboard' },
  
  // Customers
  { id: 'customers:view', name: 'View Customers', description: 'View customer list and details', category: 'Customers' },
  { id: 'customers:create', name: 'Create Customers', description: 'Add new customers', category: 'Customers' },
  { id: 'customers:edit', name: 'Edit Customers', description: 'Modify customer information', category: 'Customers' },
  { id: 'customers:delete', name: 'Delete Customers', description: 'Remove customers', category: 'Customers' },
  
  // Projects
  { id: 'projects:view', name: 'View Projects', description: 'View project list and details', category: 'Projects' },
  { id: 'projects:create', name: 'Create Projects', description: 'Create new projects', category: 'Projects' },
  { id: 'projects:edit', name: 'Edit Projects', description: 'Modify project information', category: 'Projects' },
  { id: 'projects:delete', name: 'Delete Projects', description: 'Remove projects', category: 'Projects' },
  
  // Estimating
  { id: 'estimating:view', name: 'View Estimates', description: 'View estimate list and details', category: 'Estimating' },
  { id: 'estimating:create', name: 'Create Estimates', description: 'Create new estimates', category: 'Estimating' },
  { id: 'estimating:edit', name: 'Edit Estimates', description: 'Modify estimates', category: 'Estimating' },
  { id: 'estimating:delete', name: 'Delete Estimates', description: 'Remove estimates', category: 'Estimating' },
  { id: 'estimating:approve', name: 'Approve Estimates', description: 'Approve or reject estimates', category: 'Estimating' },
  
  // Accounting
  { id: 'accounting:view', name: 'View Accounting', description: 'View invoices and financial data', category: 'Accounting' },
  { id: 'accounting:create', name: 'Create Invoices', description: 'Create new invoices', category: 'Accounting' },
  { id: 'accounting:edit', name: 'Edit Invoices', description: 'Modify invoices', category: 'Accounting' },
  { id: 'accounting:delete', name: 'Delete Invoices', description: 'Remove invoices', category: 'Accounting' },
  { id: 'accounting:payments', name: 'Manage Payments', description: 'Record and manage payments', category: 'Accounting' },
  
  // Admin
  { id: 'admin:view', name: 'View Admin Panel', description: 'Access admin panel', category: 'Admin' },
  { id: 'admin:users', name: 'Manage Users', description: 'Add, edit, and remove users', category: 'Admin' },
  { id: 'admin:roles', name: 'Manage Roles', description: 'Create and modify roles', category: 'Admin' },
  { id: 'admin:departments', name: 'Manage Departments', description: 'Manage departments and positions', category: 'Admin' },
  { id: 'admin:company', name: 'Company Settings', description: 'Modify company settings', category: 'Admin' },
  
  // Developer
  { id: 'developer:view', name: 'Developer Tools', description: 'Access developer tools', category: 'Developer' },
];

// Default roles
const defaultRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Full system access',
    permissions: defaultPermissions.map((p) => p.id), // All permissions
    isSystem: true,
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Department manager with broad access',
    permissions: [
      'dashboard:view',
      'customers:view', 'customers:create', 'customers:edit',
      'projects:view', 'projects:create', 'projects:edit',
      'estimating:view', 'estimating:create', 'estimating:edit', 'estimating:approve',
      'accounting:view',
    ],
    isSystem: true,
  },
  {
    id: 'role-staff',
    name: 'Staff',
    description: 'Standard employee access',
    permissions: [
      'dashboard:view',
      'customers:view',
      'projects:view', 'projects:create', 'projects:edit',
      'estimating:view', 'estimating:create', 'estimating:edit',
    ],
    isSystem: false,
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'dashboard:view',
      'customers:view',
      'projects:view',
      'estimating:view',
      'accounting:view',
    ],
    isSystem: false,
  },
];

export const useRolesStore = create<RolesStore>()(
  persist(
    (set, get) => ({
      roles: defaultRoles,
      permissions: defaultPermissions,

      addRole: (name, description) => {
        const newRole: Role = {
          id: `role-${generateId()}`,
          name,
          description,
          permissions: [],
          isSystem: false,
        };
        set((state) => ({
          roles: [...state.roles, newRole],
        }));
      },

      updateRole: (id, updates) => {
        set((state) => ({
          roles: state.roles.map((role) =>
            role.id === id ? { ...role, ...updates } : role
          ),
        }));
      },

      deleteRole: (id) => {
        const role = get().roles.find((r) => r.id === id);
        if (role?.isSystem) return; // Can't delete system roles
        set((state) => ({
          roles: state.roles.filter((role) => role.id !== id),
        }));
      },

      setRolePermissions: (roleId, permissionIds) => {
        set((state) => ({
          roles: state.roles.map((role) =>
            role.id === roleId ? { ...role, permissions: permissionIds } : role
          ),
        }));
      },

      toggleRolePermission: (roleId, permissionId) => {
        set((state) => ({
          roles: state.roles.map((role) => {
            if (role.id !== roleId) return role;
            const hasPermission = role.permissions.includes(permissionId);
            return {
              ...role,
              permissions: hasPermission
                ? role.permissions.filter((p) => p !== permissionId)
                : [...role.permissions, permissionId],
            };
          }),
        }));
      },

      getRolePermissions: (roleId) => {
        const role = get().roles.find((r) => r.id === roleId);
        if (!role) return [];
        return get().permissions.filter((p) => role.permissions.includes(p.id));
      },

      hasPermission: (roleId, permissionId) => {
        const role = get().roles.find((r) => r.id === roleId);
        return role?.permissions.includes(permissionId) || false;
      },

      resetToDefaults: () => {
        set({ roles: defaultRoles, permissions: defaultPermissions });
      },
    }),
    {
      name: 'sg-portal-roles',
    }
  )
);