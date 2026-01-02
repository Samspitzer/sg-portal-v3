import { Routes, Route } from 'react-router-dom';
import { Building2, Contact, Users } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { CompaniesPage } from './customers/CompaniesPage';
import { ContactsPage } from './customers/ContactsPage';
import { CompanyDetailPage } from './customers/CompanyDetailPage';
import { ContactDetailPage } from './customers/ContactDetailPage';

// Customers Dashboard using reusable PanelDashboard
function CustomersDashboard() {
  const tiles = [
    {
      id: 'companies',
      name: 'Companies',
      description: 'Manage client companies.',
      icon: Building2,
      path: '/clients/companies',
      color: 'brand' as const,
    },
    {
      id: 'contacts',
      name: 'Contacts',
      description: 'Manage client contacts.',
      icon: Contact,
      path: '/clients/contacts',
      color: 'accent' as const,
    },
  ];

  return (
    <PanelDashboard
      title="Customers"
      description="Manage your client companies and contacts."
      icon={Users}
      iconGradient="from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-800"
      tiles={tiles}
    />
  );
}

export function ClientsPage() {
  return (
    <Routes>
      <Route index element={<CustomersDashboard />} />
      <Route path="companies" element={<CompaniesPage />} />
      <Route path="companies/:id" element={<CompanyDetailPage />} />
      <Route path="contacts" element={<ContactsPage />} />
      <Route path="contacts/:id" element={<ContactDetailPage />} />
    </Routes>
  );
}