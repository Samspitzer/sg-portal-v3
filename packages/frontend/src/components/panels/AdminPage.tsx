import { Routes, Route } from 'react-router-dom';
import { Users, Building2, Shield, Settings, SlidersHorizontal } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { useDocumentTitle } from '@/hooks';
import { ManageUsersPage, UserDetailPage, CompanySettingsPage, FieldSettingsPage, ManageRolesPage } from './admin';

// Admin Dashboard using reusable PanelDashboard
function AdminDashboard() {
  useDocumentTitle('Admin');
  const tiles = [
    {
      id: 'users',
      name: 'Manage Users',
      description: 'Add, edit, and manage user accounts.',
      icon: Users,
      path: '/admin/users',
      color: 'brand' as const,
    },
    {
      id: 'fields',
      name: 'Field Settings',
      description: 'Departments, positions, and dropdown options.',
      icon: SlidersHorizontal,
      path: '/admin/fields',
      color: 'accent' as const,
    },
    {
      id: 'permissions',
      name: 'Permissions',
      description: 'Panel access control.',
      icon: Shield,
      path: '/admin/permissions',
      color: 'warning' as const,
    },
    {
      id: 'company',
      name: 'Company Settings',
      description: 'Manage company information and branding.',
      icon: Building2,
      path: '/admin/company',
      color: 'success' as const,
    },
  ];

  return (
    <PanelDashboard
      title="Admin Panel"
      description="Manage users, organization structure, roles, and company settings."
      icon={Settings}
      iconGradient="from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800"
      tiles={tiles}
    />
  );
}

export function AdminPage() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<ManageUsersPage />} />
      <Route path="users/:userId" element={<UserDetailPage />} />
      <Route path="fields" element={<FieldSettingsPage />} />
      <Route path="permissions" element={<ManageRolesPage />} />
      {/* Keep /roles as alias for backward compatibility */}
      <Route path="roles" element={<ManageRolesPage />} />
      <Route path="company" element={<CompanySettingsPage />} />
    </Routes>
  );
}