import { Routes, Route } from 'react-router-dom';
import { Users, Building2, Shield, Settings, Briefcase } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { ManageUsersPage, CompanySettingsPage, ManageDepartmentsPage, ManageRolesPage } from './admin';

// Admin Dashboard using reusable PanelDashboard
function AdminDashboard() {
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
      id: 'departments',
      name: 'Departments',
      description: 'Manage departments and positions.',
      icon: Briefcase,
      path: '/admin/departments',
      color: 'accent' as const,
    },
    {
      id: 'roles',
      name: 'Roles',
      description: 'Configure roles and permissions.',
      icon: Shield,
      path: '/admin/roles',
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
      description="Manage users, departments, roles, and company settings."
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
      <Route path="departments" element={<ManageDepartmentsPage />} />
      <Route path="roles" element={<ManageRolesPage />} />
      <Route path="company" element={<CompanySettingsPage />} />
    </Routes>
  );
}