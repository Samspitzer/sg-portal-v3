// ============================================================================
// DealsPage - Deal Management with Kanban and List Views
// Location: src/components/panels/sales/DealsPage.tsx
// 
// UPDATED: Now uses AddDealForm from add-forms via useFormStack
// ============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  TrendingUp,
  LayoutGrid,
  List,
  Building2,
  User,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  SearchInput,
  SelectFilter,
  FilterBar,
  FilterCount,
  FilterToggle,
  DataTable,
  type DataTableColumn,
} from '@/components/common';
import { KanbanBoard, type KanbanColumn, type KanbanCardProps } from '@/components/common/KanbanBoard';
import { useFormStack } from '@/components/panels/add-forms';
import {
  useSalesStore,
  useFieldsStore,
  useUsersStore,
  useClientsStore,
  useToast,
  type Deal,
} from '@/contexts';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'list' | 'kanban';
type SortField = 'name' | 'company' | 'value' | 'owner' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type StatusFilter = '' | 'active' | 'won' | 'lost';

// ============================================================================
// Deal Card for Kanban
// ============================================================================

interface DealCardData {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  label?: { text: string; color: string };
  owner?: { name: string };
  companyName?: string;
  contactName?: string;
  status: 'active' | 'won' | 'lost';
  createdAt: string;
}

function DealCard({
  item,
  onClick,
  onDragStart,
  isDragging,
}: KanbanCardProps<DealCardData>) {
  const statusColors = {
    active: 'text-blue-600 dark:text-blue-400',
    won: 'text-green-600 dark:text-green-400',
    lost: 'text-red-600 dark:text-red-400',
  };

  const StatusIcon = item.status === 'won' ? CheckCircle : item.status === 'lost' ? XCircle : Clock;

  return (
    <div
      draggable={item.status === 'active'}
      onDragStart={(e) => item.status === 'active' && onDragStart(e, item)}
      onClick={() => onClick(item)}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'p-3 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        'group',
        isDragging && 'opacity-50 shadow-lg scale-105',
        item.status === 'won' && 'border-l-4 border-l-green-500',
        item.status === 'lost' && 'border-l-4 border-l-red-500 opacity-60'
      )}
    >
      {/* Title Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2">
          {item.title}
        </h4>
        <StatusIcon className={clsx('w-4 h-4 flex-shrink-0', statusColors[item.status])} />
      </div>

      {/* Company/Contact */}
      {(item.companyName || item.contactName) && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 space-y-0.5">
          {item.companyName && (
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{item.companyName}</span>
            </div>
          )}
          {item.contactName && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{item.contactName}</span>
            </div>
          )}
        </div>
      )}

      {/* Value and Owner Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
        {item.value !== undefined && item.value > 0 ? (
          <span className={clsx(
            'text-sm font-semibold',
            item.status === 'won' ? 'text-green-600 dark:text-green-400' :
            item.status === 'lost' ? 'text-slate-400 line-through' :
            'text-green-600 dark:text-green-400'
          )}>
            ${item.value.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">No value</span>
        )}

        {item.owner && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {item.owner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
              {item.owner.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DealsPage() {
  useDocumentTitle('Deals');
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { deals, updateDeal } = useSalesStore();
  const { dealStages } = useFieldsStore();
  const { users } = useUsersStore();
  const { companies, contacts } = useClientsStore();
  const { openAddDeal } = useFormStack();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Sort state (for list view)
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // URL params for opening panel with pre-filled data
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Handle URL params to open panel with pre-filled contact/company
  useEffect(() => {
    const newDeal = searchParams.get('newDeal');
    const contactId = searchParams.get('contactId');
    const companyId = searchParams.get('companyId');
    const name = searchParams.get('name');
    
    if (newDeal === 'true') {
      // Get company/contact info
      let defaultCompanyId: string | undefined;
      let defaultCompanyName: string | undefined;
      let defaultContactId: string | undefined;
      let defaultContactName: string | undefined;
      
      if (companyId) {
        const company = companies.find(c => c.id === companyId);
        if (company) {
          defaultCompanyId = company.id;
          defaultCompanyName = company.name;
        }
      }
      
      if (contactId) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          defaultContactId = contact.id;
          defaultContactName = `${contact.firstName} ${contact.lastName}`.trim();
          // Also set company from contact if not already set
          if (!defaultCompanyId && contact.companyId) {
            const company = companies.find(c => c.id === contact.companyId);
            if (company) {
              defaultCompanyId = company.id;
              defaultCompanyName = company.name;
            }
          }
        }
      }
      
      // Open the form
      openAddDeal({
        defaultName: name || undefined,
        defaultCompanyId,
        defaultCompanyName,
        defaultContactId,
        defaultContactName,
      });
      
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, companies, contacts, openAddDeal, setSearchParams]);

  // Check if any filters are active
  const hasActiveFilters = search || stageFilter || statusFilter || ownerFilter;

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setStageFilter('');
    setStatusFilter('');
    setOwnerFilter('');
  }, []);



  // ============================================================================
  // Filter Options with Counts
  // ============================================================================

  const getDealsMatchingOtherFilters = useCallback((excludeFilter: 'stage' | 'status' | 'owner') => {
    return deals.filter(deal => !deal.deletedAt).filter(deal => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        deal.name.toLowerCase().includes(searchLower) ||
        deal.companyName?.toLowerCase().includes(searchLower) ||
        deal.contactName?.toLowerCase().includes(searchLower);

      const matchesStage = excludeFilter === 'stage' || !stageFilter || deal.stage === stageFilter;
      const matchesStatus = excludeFilter === 'status' || !statusFilter || deal.status === statusFilter;
      const matchesOwner = excludeFilter === 'owner' || !ownerFilter || deal.ownerId === ownerFilter;

      return matchesSearch && matchesStage && matchesStatus && matchesOwner;
    });
  }, [deals, search, stageFilter, statusFilter, ownerFilter]);

  const stageOptions = useMemo(() => {
    const matchingDeals = getDealsMatchingOtherFilters('stage');
    return dealStages
      .map(stage => ({
        value: stage.name,
        label: stage.name,
        count: matchingDeals.filter(d => d.stage === stage.name).length,
      }))
      .filter(option => option.count > 0);
  }, [dealStages, getDealsMatchingOtherFilters]);

  const statusOptions = useMemo(() => {
    const matchingDeals = getDealsMatchingOtherFilters('status');
    const statuses = [
      { value: 'active', label: 'Active' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
    ];
    return statuses
      .map(status => ({
        ...status,
        count: matchingDeals.filter(d => d.status === status.value).length,
      }))
      .filter(option => option.count > 0);
  }, [getDealsMatchingOtherFilters]);

  const ownerOptions = useMemo(() => {
    const matchingDeals = getDealsMatchingOtherFilters('owner');
    const activeUsers = users.filter(u => u.isActive);
    return activeUsers
      .map(user => ({
        value: user.id,
        label: user.name,
        count: matchingDeals.filter(d => d.ownerId === user.id).length,
      }))
      .filter(option => option.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, getDealsMatchingOtherFilters]);

  // ============================================================================
  // Filtered Deals
  // ============================================================================

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => !deal.deletedAt).filter(deal => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        deal.name.toLowerCase().includes(searchLower) ||
        deal.companyName?.toLowerCase().includes(searchLower) ||
        deal.contactName?.toLowerCase().includes(searchLower);

      const matchesStage = !stageFilter || deal.stage === stageFilter;
      const matchesStatus = !statusFilter || deal.status === statusFilter;
      const matchesOwner = !ownerFilter || deal.ownerId === ownerFilter;

      return matchesSearch && matchesStage && matchesStatus && matchesOwner;
    });
  }, [deals, search, stageFilter, statusFilter, ownerFilter]);

  // ============================================================================
  // Kanban Data
  // ============================================================================

  const kanbanColumns: KanbanColumn<DealCardData>[] = useMemo(() => {
    return dealStages.map(stage => {
      const stageDeals = filteredDeals
        .filter(deal => deal.stage === stage.name)
        .map(deal => ({
          id: deal.id,
          title: deal.name,
          companyName: deal.companyName,
          contactName: deal.contactName,
          value: deal.value,
          status: deal.status,
          owner: deal.ownerName ? { name: deal.ownerName } : undefined,
          createdAt: deal.createdAt,
        }));

      return {
        id: stage.id,
        title: stage.name,
        color: stage.color,
        items: stageDeals,
      };
    });
  }, [dealStages, filteredDeals]);

  // ============================================================================
  // Stats
  // ============================================================================

  const stats = useMemo(() => {
    const activeDeals = filteredDeals.filter(d => d.status === 'active');
    const wonDeals = filteredDeals.filter(d => d.status === 'won');
    const lostDeals = filteredDeals.filter(d => d.status === 'lost');
    
    return {
      total: filteredDeals.length,
      active: activeDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      totalValue: activeDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      wonValue: wonDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    };
  }, [filteredDeals]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleAddDeal = useCallback(() => {
    openAddDeal({});
  }, [openAddDeal]);

  const handleViewDeal = useCallback((dealOrCard: Deal | DealCardData) => {
    const deal = 'slug' in dealOrCard 
      ? dealOrCard as Deal 
      : deals.find(d => d.id === dealOrCard.id);
    if (deal) {
      navigate(`/sales/deals/${deal.slug || deal.id}`);
    }
  }, [deals, navigate]);

  const handleKanbanMove = useCallback((itemId: string, _fromColumnId: string, toColumnId: string) => {
    const stage = dealStages.find(s => s.id === toColumnId);
    const deal = deals.find(d => d.id === itemId);
    
    if (stage && deal && deal.status === 'active') {
      updateDeal(itemId, { stage: stage.name });
      toast.success('Deal Moved', `Moved to ${stage.name}`);
    }
  }, [dealStages, deals, updateDeal, toast]);

  const handleRowClick = useCallback((deal: Deal) => {
    handleViewDeal(deal);
  }, [handleViewDeal]);

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: DataTableColumn<Deal>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Deal Name',
      sortable: true,
      render: (deal) => (
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            deal.status === 'won' ? 'bg-green-100 dark:bg-green-900/30' :
            deal.status === 'lost' ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-blue-100 dark:bg-blue-900/30'
          )}>
            {deal.status === 'won' ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : deal.status === 'lost' ? (
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <span className={clsx(
              'font-medium',
              deal.status === 'lost' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'
            )}>
              {deal.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (deal) => {
        const stageConfig = dealStages.find(s => s.name === deal.stage);
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stageConfig?.color || '#64748b' }}
            />
            <span className="text-slate-600 dark:text-slate-400">{deal.stage}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (deal) => (
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs font-medium',
          deal.status === 'won' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          deal.status === 'lost' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          deal.status === 'active' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        )}>
          {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (deal) => (
        <span className="text-slate-600 dark:text-slate-400">
          {deal.companyName || '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      align: 'right',
      render: (deal) => (
        <span className={clsx(
          'font-medium',
          deal.status === 'lost' ? 'text-slate-400 line-through' :
          deal.value && deal.value > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
        )}>
          {deal.value ? `$${deal.value.toLocaleString()}` : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      render: (deal) => (
        <span className="text-slate-600 dark:text-slate-400">
          {deal.ownerName || '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (deal) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">
          {formatDate(deal.createdAt)}
        </span>
      ),
      hideOnMobile: true,
    },
  ], [dealStages]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Page
      title="Deals"
      description="Track and manage your sales opportunities"
      actions={
        <Button variant="primary" onClick={handleAddDeal}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Deal
        </Button>
      }
    >
      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Pipeline:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${stats.totalValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Won:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${stats.wonValue.toLocaleString()}
          </span>
          <span className="text-slate-400">({stats.won})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Active:</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{stats.active}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Lost:</span>
          <span className="font-medium text-red-600 dark:text-red-400">{stats.lost}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        rightContent={
          <div className="flex items-center gap-3">
            <FilterCount count={filteredDeals.length} singular="deal" />
            <FilterToggle
              options={[
                { value: 'kanban', label: 'Kanban', icon: <LayoutGrid className="w-4 h-4" /> },
                { value: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search deals..."
          className="w-48 [&_input]:h-[34px] [&_input]:text-sm"
        />
        {viewMode === 'list' && (
          <SelectFilter
            label="Stage"
            value={stageFilter}
            onChange={setStageFilter}
            options={stageOptions}
            icon={TrendingUp}
            size="sm"
            className="w-36"
          />
        )}
        <SelectFilter
          label="Status"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as StatusFilter)}
          options={statusOptions}
          icon={Tag}
          size="sm"
          className="w-36"
        />
        <SelectFilter
          label="Owner"
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={ownerOptions}
          icon={User}
          size="sm"
          className="w-36"
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          columns={kanbanColumns}
          renderCard={(props) => <DealCard {...props} />}
          getItemId={(item) => item.id}
          getItemValue={(item) => item.status === 'active' ? (item.value || 0) : 0}
          formatValue={(val) => `$${val.toLocaleString()}`}
          onItemMove={handleKanbanMove}
          onCardClick={handleViewDeal}
          onAddClick={handleAddDeal}
          showTotals
        />
      ) : (
        <DataTable
          data={filteredDeals}
          columns={columns}
          rowKey={(deal) => deal.id}
          onRowClick={handleRowClick}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          emptyState={
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No deals yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Create your first deal to start tracking your sales pipeline.</p>
              <Button variant="primary" onClick={handleAddDeal}>
                <Plus className="w-4 h-4 mr-1.5" />
                New Deal
              </Button>
            </div>
          }
        />
      )}
    </Page>
  );
}

export default DealsPage;