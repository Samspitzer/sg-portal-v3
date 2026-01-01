import { Routes, Route } from 'react-router-dom';
import { Users, Building2, Shield, Settings } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { ManageUsersPage, CompanySettingsPage, PermissionsPage } from './admin';

// Admin Dashboard using reusable PanelDashboard
function AdminDashboard() {
  const tiles = [
    {
      id: 'users',
      name: 'Manage Users',
      description: 'Add, edit, and manage user accounts and permissions.',
      icon: Users,
      path: '/admin/users',
      color: 'brand' as const,
    },
    {
      id: 'company',
      name: 'Company Settings',
      description: 'Manage company information, logo, and branding.',
      icon: Building2,
      path: '/admin/company',
      color: 'accent' as const,
    },
    {
      id: 'permissions',
      name: 'Permissions',
      description: 'Configure role-based access and feature permissions.',
      icon: Shield,
      path: '/admin/permissions',
      color: 'warning' as const,
    },
  ];

  return (
    <PanelDashboard
      title="Admin Panel"
      description="Manage users, company settings, and system permissions."
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
      <Route path="company" element={<CompanySettingsPage />} />
      <Route path="permissions" element={<PermissionsPage />} />
    </Routes>
  );
}