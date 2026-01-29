import { Routes, Route } from 'react-router-dom';
import { 
  Handshake, 
  Target, 
  TrendingUp, 
  Activity, 
  Map, 
  Inbox 
} from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { useDocumentTitle } from '@/hooks';
// Sub-pages
import { LeadsPage } from './sales/LeadsPage';
// Future sub-pages:
// import { DealsPage } from './sales/DealsPage';
// import { ActivitiesPage } from './sales/ActivitiesPage';

// Placeholder component for pages not yet built
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

// Sales Panel Landing Page
function SalesLandingPage() {
  useDocumentTitle('Sales');
  
  const tiles = [
    {
      id: 'leads',
      name: 'Leads',
      description: 'Manage leads and prospects.',
      icon: Target,
      path: '/sales/leads',
      color: 'success' as const,
    },
    {
      id: 'deals',
      name: 'Deals',
      description: 'Track deals and opportunities.',
      icon: TrendingUp,
      path: '/sales/deals',
      color: 'accent' as const,
    },
    {
      id: 'activities',
      name: 'Activities',
      description: 'Sales tasks and follow-ups.',
      icon: Activity,
      path: '/sales/activities',
      color: 'warning' as const,
    },
    {
      id: 'routes',
      name: 'Routes',
      description: 'Plan sales rep routes.',
      icon: Map,
      path: '/sales/routes',
      color: 'danger' as const,
    },
    {
      id: 'inbox',
      name: 'Inbox',
      description: 'Sales email inbox.',
      icon: Inbox,
      path: '/sales/inbox',
      color: 'brand' as const,
    },
  ];

  return (
    <PanelDashboard
      title="Sales"
      description="Manage your sales pipeline, leads, and deals."
      icon={Handshake}
      iconGradient="from-teal-500 to-teal-700 dark:from-teal-600 dark:to-teal-800"
      tiles={tiles}
    />
  );
}

export function SalesPage() {
  return (
    <Routes>
      {/* Landing page */}
      <Route index element={<SalesLandingPage />} />
      
      {/* Leads */}
      <Route path="leads" element={<LeadsPage />} />
      <Route 
        path="leads/:id" 
        element={<PlaceholderPage title="Lead Details" description="Lead detail page coming soon." />} 
      />
      
      {/* Deals - placeholder for now */}
      <Route 
        path="deals" 
        element={<PlaceholderPage title="Deals" description="Deal tracking with pipeline management coming soon." />} 
      />
      <Route 
        path="deals/:id" 
        element={<PlaceholderPage title="Deal Details" description="Deal detail page coming soon." />} 
      />
      
      {/* Activities - placeholder for now */}
      <Route 
        path="activities" 
        element={<PlaceholderPage title="Activities" description="Sales activities and task tracking coming soon." />} 
      />
      
      {/* Routes - Coming Soon */}
      <Route 
        path="routes" 
        element={<PlaceholderPage title="Route Planning" description="Google Maps integration for planning sales routes." />} 
      />
      
      {/* Inbox - Coming Soon */}
      <Route 
        path="inbox" 
        element={<PlaceholderPage title="Sales Inbox" description="Email BCC integration for sales communications." />} 
      />
    </Routes>
  );
}