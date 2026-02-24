import { Routes, Route } from 'react-router-dom';
import { Handshake, LayoutDashboard, Target, TrendingUp, Activity, Map, Inbox } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { useDocumentTitle } from '@/hooks';
import {
  SalesDashboardPage,
  LeadsPage,
  LeadDetailPage,
  DealsPage,
  DealDetailPage,
  ActivitiesPage,
  RoutesPage,
} from './sales';

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  useDocumentTitle(title);
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mx-auto mb-4">
          <Handshake className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{description}</p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Coming Soon
        </span>
      </div>
    </div>
  );
}

function SalesLandingPage() {
  useDocumentTitle('Sales');
  const tiles = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Sales insights & analytics',
      icon: LayoutDashboard,
      path: '/sales/dashboard',
      color: 'brand' as const,
    },
    {
      id: 'leads',
      name: 'Leads',
      description: 'Manage leads and prospects',
      icon: Target,
      path: '/sales/leads',
      color: 'accent' as const,
    },
    {
      id: 'deals',
      name: 'Deals',
      description: 'Track deals and opportunities',
      icon: TrendingUp,
      path: '/sales/deals',
      color: 'success' as const,
    },
    {
      id: 'activities',
      name: 'Activities',
      description: 'Sales activities and follow-ups',
      icon: Activity,
      path: '/sales/activities',
      color: 'warning' as const,
    },
    {
      id: 'routes',
      name: 'Routes',
      description: 'Plan sales rep routes',
      icon: Map,
      path: '/sales/routes',
      color: 'danger' as const,
    },
    {
      id: 'inbox',
      name: 'Inbox',
      description: 'Sales email inbox',
      icon: Inbox,
      path: '/sales/inbox',
    },
  ];

  return (
    <PanelDashboard
      title="Sales"
      description="Manage your pipeline, leads, deals, and activities."
      icon={Handshake}
      iconGradient="from-teal-500 to-teal-700 dark:from-teal-600 dark:to-teal-800"
      tiles={tiles}
    />
  );
}

export function SalesPage() {
  return (
    <Routes>
      <Route index               element={<SalesLandingPage />} />
      <Route path="dashboard"    element={<SalesDashboardPage />} />
      <Route path="leads"        element={<LeadsPage />} />
      <Route path="leads/:id"    element={<LeadDetailPage />} />
      <Route path="deals"        element={<DealsPage />} />
      <Route path="deals/:id"    element={<DealDetailPage />} />
      <Route path="activities"   element={<ActivitiesPage />} />
      <Route path="routes"       element={<RoutesPage />} />
      <Route path="inbox"        element={<PlaceholderPage title="Sales Inbox" description="Email BCC integration for sales communications." />} />
    </Routes>
  );
}