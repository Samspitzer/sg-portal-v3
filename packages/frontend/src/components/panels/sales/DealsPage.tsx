// ============================================================================
// DealsPage - Deal Management with Kanban and List Views
// Location: src/components/panels/sales/DealsPage.tsx
// 
// UPDATED: Now uses AddDealForm from add-forms via useFormStack
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  TrendingUp,
  LayoutGrid,
  List,
  User,
  Tag,
  Megaphone,
  CheckCircle,
  XCircle,
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
  EmptyTableState,
} from '@/components/common';
import { KanbanBoard, type KanbanColumn } from '@/components/common/KanbanBoard';
import { SalesKanbanCard, type SalesCardData } from './SalesKanbanCard';
import { useFormStack } from '@/components/panels/add-forms';
import {
  useSalesStore,
  useFieldsStore,
  useUsersStore,
  useToast,
  type Deal,
} from '@/contexts';
import { useDocumentTitle, useTableSort, usePersistedViewMode, useEntityFormFromUrlParams } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

type SortField = 'name' | 'company' | 'value' | 'owner' | 'createdAt';
type StatusFilter = '' | 'active' | 'won' | 'lost';

// ============================================================================
// Deal Card for Kanban
// ============================================================================
// Main Component
// ============================================================================

export function DealsPage() {
  useDocumentTitle('Deals');
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { deals, updateDeal } = useSalesStore();
  const { dealStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();
  const { openAddDeal } = useFormStack();

  // View state - persisted
  const [viewMode, setViewMode] = usePersistedViewMode('deals-view-mode', 'kanban', ['list', 'kanban'] as const);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [labelFilter, setLabelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Sort state (for list view)
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('createdAt', 'desc');

  // Open add form if URL params present
  useEntityFormFromUrlParams('newDeal', openAddDeal);

  // Check if any filters are active
  const hasActiveFilters = search || stageFilter || statusFilter || labelFilter || sourceFilter || ownerFilter;

  const clearFilters = useCallback(() => {
    setSearch('');
    setStageFilter('');
    setStatusFilter('');
    setLabelFilter('');
    setSourceFilter('');
    setOwnerFilter('');
  }, []);



  // ============================================================================
  // Filter Options with Counts
  // ============================================================================

  const getDealsMatchingOtherFilters = useCallback((excludeFilter: 'stage' | 'status' | 'label' | 'source' | 'owner') => {
    return deals.filter(deal => !deal.deletedAt).filter(deal => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        deal.name.toLowerCase().includes(searchLower) ||
        deal.companyName?.toLowerCase().includes(searchLower) ||
        deal.contactName?.toLowerCase().includes(searchLower);

      const matchesStage = excludeFilter === 'stage' || !stageFilter || deal.stage === stageFilter;
      const matchesStatus = excludeFilter === 'status' || !statusFilter || deal.status === statusFilter;
      const matchesLabel = excludeFilter === 'label' || !labelFilter || deal.label === labelFilter;
      const matchesSource = excludeFilter === 'source' || !sourceFilter || deal.source === sourceFilter;
      const matchesOwner = excludeFilter === 'owner' || !ownerFilter || deal.ownerId === ownerFilter;

      return matchesSearch && matchesStage && matchesStatus && matchesLabel && matchesSource && matchesOwner;
    });
  }, [deals, search, stageFilter, statusFilter, labelFilter, sourceFilter, ownerFilter]);

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

  const labelOptions = useMemo(() => {
    const matchingDeals = getDealsMatchingOtherFilters('label');
    return leadLabels
      .map(lbl => ({
        value: lbl.name,
        label: lbl.name,
        count: matchingDeals.filter(d => d.label === lbl.name).length,
      }))
      .filter(option => option.count > 0);
  }, [leadLabels, getDealsMatchingOtherFilters]);

  const sourceOptions = useMemo(() => {
    const matchingDeals = getDealsMatchingOtherFilters('source');
    return leadSources
      .map(src => ({
        value: src.name,
        label: src.name,
        count: matchingDeals.filter(d => d.source === src.name).length,
      }))
      .filter(option => option.count > 0);
  }, [leadSources, getDealsMatchingOtherFilters]);

  const getLabelColor = useCallback((labelName?: string) => {
    if (!labelName) return '';
    const lbl = leadLabels.find(l => l.name === labelName);
    if (!lbl) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    const colorMap: Record<string, string> = {
      red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      gray:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return colorMap[lbl.color] || colorMap.gray;
  }, [leadLabels]);

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
      const matchesLabel = !labelFilter || deal.label === labelFilter;
      const matchesSource = !sourceFilter || deal.source === sourceFilter;
      const matchesOwner = !ownerFilter || deal.ownerId === ownerFilter;

      return matchesSearch && matchesStage && matchesStatus && matchesLabel && matchesSource && matchesOwner;
    });
  }, [deals, search, stageFilter, statusFilter, labelFilter, sourceFilter, ownerFilter]);

  // ============================================================================
  // Kanban Data
  // ============================================================================

  const kanbanColumns: KanbanColumn<SalesCardData>[] = useMemo(() => {
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
          label: deal.label ? { text: deal.label, color: getLabelColor(deal.label) } : undefined,
          source: deal.source,
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
  }, [dealStages, filteredDeals, getLabelColor]);

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

  const handleAddDeal = useCallback(() => {
    openAddDeal({});
  }, [openAddDeal]);

  const handleViewDeal = useCallback((dealOrCard: Deal | SalesCardData) => {
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
      key: 'label',
      header: 'Label',
      render: (deal) => {
        if (!deal.label) return <span className="text-slate-400">—</span>;
        return (
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getLabelColor(deal.label))}>
            {deal.label}
          </span>
        );
      },
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
  ], [dealStages, getLabelColor]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Page
      title="Deals"
      description="Track and manage your sales opportunities"
      fillHeight
      actions={
        <Button variant="primary" onClick={handleAddDeal}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Deal
        </Button>
      }
    >
      {/* Stats Bar */}
      <div className="flex flex-col h-full min-h-0">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-4 text-sm flex-shrink-0">
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
          label="Label"
          value={labelFilter}
          onChange={setLabelFilter}
          options={labelOptions}
          icon={Tag}
          size="sm"
          className="w-36"
        />
        <SelectFilter
          label="Source"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={sourceOptions}
          icon={Megaphone}
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
          <div className="flex-1 min-h-0">
            <KanbanBoard
          columns={kanbanColumns}
          renderCard={(props) => <SalesKanbanCard {...props} />}
          getItemId={(item) => item.id}
          getItemValue={(item) => item.status === 'active' ? (item.value || 0) : 0}
          formatValue={(val) => `$${val.toLocaleString()}`}
          onItemMove={handleKanbanMove}
          onCardClick={handleViewDeal}
          onAddClick={handleAddDeal}
          showTotals
        />
          </div>
      ) : (
        <div className="flex-1 min-h-0">
          <DataTable
            data={filteredDeals}
            columns={columns}
            rowKey={(deal) => deal.id}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            emptyState={
              <EmptyTableState
                icon={TrendingUp}
                hasFilters={!!hasActiveFilters}
                entityName="deal"
                onAdd={handleAddDeal}
                addLabel="New Deal"
              />
            }
          />
        </div>
      )}
      </div>
    </Page>
  );
}

export default DealsPage;