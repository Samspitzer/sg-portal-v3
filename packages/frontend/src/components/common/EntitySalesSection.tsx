// ============================================================================
// EntitySalesSection - Leads/Deals list for entity detail pages
// Location: src/components/common/EntitySalesSection.tsx
//
// Shows linked leads and deals for a contact or company.
// Uses collapsible sections with item counts.
// ============================================================================

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Plus, ChevronDown, ChevronRight, Target, TrendingUp, DollarSign } from 'lucide-react';
import { useSalesStore, type Lead, type Deal } from '@/contexts';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

interface EntitySalesSectionProps {
  /** Entity type - contact or company */
  entityType: 'contact' | 'company';
  /** Entity ID to filter by */
  entityId: string;
  /** Called when user clicks "Add Lead" */
  onAddLead?: () => void;
  /** Called when user clicks "Add Deal" */
  onAddDeal?: () => void;
  /** Called when user clicks a lead row */
  onLeadClick?: (lead: Lead) => void;
  /** Called when user clicks a deal row */
  onDealClick?: (deal: Deal) => void;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number | undefined): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// Lead Row Component
// ============================================================================

function LeadRow({ 
  lead, 
  onClick 
}: { 
  lead: Lead; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left group"
    >
      <div className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
        <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {lead.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lead.stage} {lead.value ? `• ${formatCurrency(lead.value)}` : ''}
        </p>
      </div>
      {lead.createdAt && (
        <span className="text-xs text-slate-400 flex-shrink-0">
          {formatDate(lead.createdAt.split('T')[0] ?? '', 'short')}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Deal Row Component
// ============================================================================

function DealRow({ 
  deal, 
  onClick 
}: { 
  deal: Deal; 
  onClick?: () => void;
}) {
  const stageColors: Record<string, string> = {
    'Discovery': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    'Proposal': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Negotiation': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Closed Won': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Closed Lost': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left group"
    >
      <div className="w-7 h-7 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
        <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {deal.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded',
            stageColors[deal.stage] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          )}>
            {deal.stage}
          </span>
          {deal.value && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              {formatCurrency(deal.value)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EntitySalesSection({ 
  entityType, 
  entityId, 
  onAddLead,
  onAddDeal,
  onLeadClick,
  onDealClick,
  defaultCollapsed = true,
}: EntitySalesSectionProps) {
  const { leads, deals } = useSalesStore();
  
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  // Filter leads linked to this entity
  const linkedLeads = useMemo(() => {
    return leads.filter(lead => {
      if (entityType === 'contact') {
        return lead.contactId === entityId;
      } else {
        return lead.companyId === entityId;
      }
    }).sort((a, b) => {
      // Sort by created date (most recent first)
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [leads, entityType, entityId]);
  
  // Filter deals linked to this entity
  const linkedDeals = useMemo(() => {
    return deals.filter(deal => {
      if (deal.deletedAt) return false; // Exclude deleted deals
      if (entityType === 'contact') {
        return deal.contactId === entityId;
      } else {
        return deal.companyId === entityId;
      }
    }).sort((a, b) => {
      // Sort by created date (most recent first)
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [deals, entityType, entityId]);
  
  const totalCount = linkedLeads.length + linkedDeals.length;
  
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
      >
        <div 
          className="flex items-center gap-2 flex-1"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            Leads & Deals
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onAddLead && (
            <button
              onClick={onAddLead}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
              title="Add Lead"
            >
              <Target className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          {onAddDeal && (
            <button
              onClick={onAddDeal}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
              title="Add Deal"
            >
              <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="p-2">
          {totalCount === 0 ? (
            <div className="py-6 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No leads or deals yet</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {onAddLead && (
                  <button
                    onClick={onAddLead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Lead
                  </button>
                )}
                {onAddLead && onAddDeal && (
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                )}
                {onAddDeal && (
                  <button
                    onClick={onAddDeal}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Deal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Leads */}
              {linkedLeads.length > 0 && (
                <>
                  <div className="px-3 py-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Leads ({linkedLeads.length})
                    </span>
                  </div>
                  {linkedLeads.map(lead => (
                    <LeadRow 
                      key={lead.id} 
                      lead={lead} 
                      onClick={() => onLeadClick?.(lead)}
                    />
                  ))}
                </>
              )}
              
              {/* Deals */}
              {linkedDeals.length > 0 && (
                <>
                  <div className="px-3 py-1 mt-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Deals ({linkedDeals.length})
                    </span>
                  </div>
                  {linkedDeals.map(deal => (
                    <DealRow 
                      key={deal.id} 
                      deal={deal} 
                      onClick={() => onDealClick?.(deal)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EntitySalesSection;