import { useDocumentTitle } from '@/hooks';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Handshake,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  MoreHorizontal,
  Target,
  CheckCircle,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Input } from '@/components/common';

// Types
interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  value: number;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: string;
  createdAt: string;
  lastActivity?: string;
  salesRepId: string;
  salesRepName: string;
}

interface PipelineStage {
  id: Lead['stage'];
  name: string;
  color: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'new', name: 'New', color: 'bg-slate-500' },
  { id: 'contacted', name: 'Contacted', color: 'bg-blue-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-purple-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-amber-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' },
];

// Mock data
const mockLeads: Lead[] = [
  {
    id: '1',
    companyName: 'ABC Construction',
    contactName: 'John Smith',
    contactEmail: 'john@abcconstruction.com',
    contactPhone: '(555) 123-4567',
    value: 150000,
    stage: 'proposal',
    source: 'Referral',
    createdAt: '2026-01-05',
    lastActivity: '2026-01-14',
    salesRepId: 'user-1',
    salesRepName: 'Current User',
  },
  {
    id: '2',
    companyName: 'XYZ Builders',
    contactName: 'Jane Doe',
    contactEmail: 'jane@xyzbuilders.com',
    value: 75000,
    stage: 'qualified',
    source: 'Website',
    createdAt: '2026-01-08',
    lastActivity: '2026-01-12',
    salesRepId: 'user-1',
    salesRepName: 'Current User',
  },
  {
    id: '3',
    companyName: 'Metro Development',
    contactName: 'Mike Johnson',
    contactEmail: 'mike@metrodev.com',
    contactPhone: '(555) 987-6543',
    value: 250000,
    stage: 'negotiation',
    source: 'Trade Show',
    createdAt: '2025-12-20',
    lastActivity: '2026-01-15',
    salesRepId: 'user-1',
    salesRepName: 'Current User',
  },
  {
    id: '4',
    companyName: 'Sunrise Properties',
    contactName: 'Sarah Wilson',
    contactEmail: 'sarah@sunriseprop.com',
    value: 45000,
    stage: 'contacted',
    source: 'Cold Call',
    createdAt: '2026-01-10',
    salesRepId: 'user-1',
    salesRepName: 'Current User',
  },
  {
    id: '5',
    companyName: 'Pacific Homes',
    contactName: 'Tom Brown',
    contactEmail: 'tom@pacifichomes.com',
    value: 180000,
    stage: 'won',
    source: 'Referral',
    createdAt: '2025-11-15',
    lastActivity: '2026-01-02',
    salesRepId: 'user-1',
    salesRepName: 'Current User',
  },
];

// Stat card component
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  change?: number;
  icon: typeof TrendingUp;
  color: 'brand' | 'success' | 'warning' | 'accent';
}) {
  const colorStyles = {
    brand: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    accent: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            {change !== undefined && (
              <p className={clsx(
                'text-sm mt-1',
                change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {change >= 0 ? '+' : ''}{change}% from last month
              </p>
            )}
          </div>
          <div className={clsx('p-2 rounded-lg', colorStyles[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lead card component
function LeadCard({ lead, onClick }: { lead: Lead; onClick?: () => void }) {
  const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900 dark:text-white truncate">
              {lead.companyName}
            </h3>
            <span className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded-full text-white',
              stage?.color
            )}>
              {stage?.name}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {lead.contactName}
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              ${lead.value.toLocaleString()}
            </span>
            <span>Source: {lead.source}</span>
            {lead.lastActivity && (
              <span>Last activity: {new Date(lead.lastActivity).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.contactPhone && (
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Phone className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Mail className="w-4 h-4 text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Pipeline visualization
function PipelineOverview({ leads }: { leads: Lead[] }) {
  const stageCount = PIPELINE_STAGES.slice(0, -2).map(stage => ({
    ...stage,
    count: leads.filter(l => l.stage === stage.id).length,
    value: leads.filter(l => l.stage === stage.id).reduce((sum, l) => sum + l.value, 0),
  }));

  return (
    <Card>
      <CardHeader title="Pipeline Overview" />
      <CardContent className="p-4 pt-0">
        <div className="flex items-end gap-2 h-32">
          {stageCount.map((stage, index) => {
            const maxCount = Math.max(...stageCount.map(s => s.count), 1);
            const height = (stage.count / maxCount) * 100;
            
            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-24">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {stage.count}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 8)}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={clsx('w-full rounded-t-lg', stage.color)}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center truncate w-full">
                  {stage.name}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Main SalesPage component
export function SalesPage() {
  useDocumentTitle('Sales');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<Lead['stage'] | 'all'>('all');

  // Calculate stats
  const totalValue = mockLeads.reduce((sum, lead) => sum + lead.value, 0);
  const wonValue = mockLeads.filter(l => l.stage === 'won').reduce((sum, l) => sum + l.value, 0);
  const activeLeads = mockLeads.filter(l => !['won', 'lost'].includes(l.stage)).length;

  // Filter leads
  const filteredLeads = mockLeads.filter(lead => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches = 
        lead.companyName.toLowerCase().includes(query) ||
        lead.contactName.toLowerCase().includes(query) ||
        lead.contactEmail.toLowerCase().includes(query);
      if (!matches) return false;
    }
    if (stageFilter !== 'all' && lead.stage !== stageFilter) return false;
    return true;
  });

  // Header action for leads card
  const leadsHeaderAction = (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-64"
        />
      </div>

      {/* Stage filter */}
      <select
        value={stageFilter}
        onChange={(e) => setStageFilter(e.target.value as Lead['stage'] | 'all')}
        className={clsx(
          'px-3 py-2 rounded-lg border text-sm',
          'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
          'text-slate-700 dark:text-slate-300'
        )}
      >
        <option value="all">All Stages</option>
        {PIPELINE_STAGES.map(stage => (
          <option key={stage.id} value={stage.id}>{stage.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Page
      title="Sales"
      description="Manage your sales pipeline and leads"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Pipeline Value"
          value={`$${totalValue.toLocaleString()}`}
          change={12}
          icon={DollarSign}
          color="brand"
        />
        <StatCard
          title="Won This Month"
          value={`$${wonValue.toLocaleString()}`}
          change={8}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="Active Leads"
          value={activeLeads.toString()}
          change={5}
          icon={Target}
          color="accent"
        />
        <StatCard
          title="Conversion Rate"
          value="24%"
          change={-2}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* Pipeline overview */}
      <div className="mb-6">
        <PipelineOverview leads={mockLeads} />
      </div>

      {/* Leads section */}
      <Card>
        <CardHeader title="Leads" action={leadsHeaderAction} />
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {filteredLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            
            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Handshake className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                  No leads found
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {searchQuery || stageFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first lead to get started'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon notice */}
      <Card className="mt-6 border-dashed border-2 border-slate-300 dark:border-slate-600">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Full CRM Coming Soon
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            We're building a comprehensive CRM system with advanced features including 
            deal tracking, activity logging, email integration, and more. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}

export default SalesPage;