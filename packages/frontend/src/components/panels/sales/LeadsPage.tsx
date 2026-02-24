// ============================================================================
// LeadsPage - Lead Management with Kanban and List Views
// Location: src/components/panels/sales/LeadsPage.tsx
// 
// UPDATED: Now uses AddLeadForm from add-forms via useFormStack
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  Target,
  LayoutGrid,
  List,
  User,
  Tag,
  Megaphone,
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
  type Lead,
} from '@/contexts';
import { useDocumentTitle, useTableSort, usePersistedViewMode, useEntityFormFromUrlParams } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

type SortField = 'name' | 'company' | 'value' | 'owner' | 'createdAt';

// ============================================================================
// Main Component
// ============================================================================

export function LeadsPage() {
  useDocumentTitle('Leads');
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { leads, updateLead } = useSalesStore();
  const { leadStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();
  const { openAddLead } = useFormStack();

  // View state - persisted
  const [viewMode, setViewMode] = usePersistedViewMode('leads-view-mode', 'kanban', ['list', 'kanban'] as const);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Sort state (for list view)
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('createdAt', 'desc');

  // Open add form if URL params present
  useEntityFormFromUrlParams('newLead', openAddLead);

  // Check if any filters are active
  const hasActiveFilters = search || stageFilter || labelFilter || ownerFilter || sourceFilter;

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setStageFilter('');
    setLabelFilter('');
    setOwnerFilter('');
    setSourceFilter('');
  }, []);

  // ============================================================================
  // Filtering
  // ============================================================================

  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.companyName?.toLowerCase().includes(searchLower) ||
        lead.contactName?.toLowerCase().includes(searchLower);

      // Stage filter
      const matchesStage = !stageFilter || lead.stage === stageFilter;

      // Label filter
      const matchesLabel = !labelFilter || lead.label === labelFilter;

      // Owner filter
      const matchesOwner = !ownerFilter || lead.ownerId === ownerFilter;

      // Source filter
      const matchesSource = !sourceFilter || lead.source === sourceFilter;

      return matchesSearch && matchesStage && matchesLabel && matchesOwner && matchesSource;
    });

    // Sort (for list view)
    if (viewMode === 'list') {
      result = [...result].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'company':
            aVal = (a.companyName || '').toLowerCase();
            bVal = (b.companyName || '').toLowerCase();
            break;
          case 'value':
            aVal = a.value || 0;
            bVal = b.value || 0;
            break;
          case 'owner':
            aVal = a.ownerName.toLowerCase();
            bVal = b.ownerName.toLowerCase();
            break;
          case 'createdAt':
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [leads, search, stageFilter, labelFilter, ownerFilter, sourceFilter, viewMode, sortField, sortDirection]);

  // ============================================================================
  // Filter Options with Counts
  // ============================================================================

  const getLeadsMatchingOtherFilters = useCallback((excludeFilter: 'stage' | 'label' | 'owner' | 'source') => {
    return leads.filter(lead => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.companyName?.toLowerCase().includes(searchLower) ||
        lead.contactName?.toLowerCase().includes(searchLower);

      const matchesStage = excludeFilter === 'stage' || !stageFilter || lead.stage === stageFilter;
      const matchesLabel = excludeFilter === 'label' || !labelFilter || lead.label === labelFilter;
      const matchesOwner = excludeFilter === 'owner' || !ownerFilter || lead.ownerId === ownerFilter;
      const matchesSource = excludeFilter === 'source' || !sourceFilter || lead.source === sourceFilter;

      return matchesSearch && matchesStage && matchesLabel && matchesOwner && matchesSource;
    });
  }, [leads, search, stageFilter, labelFilter, ownerFilter, sourceFilter]);

  // Stage filter options with counts
  const stageOptions = useMemo(() => {
    const matchingLeads = getLeadsMatchingOtherFilters('stage');
    
    return leadStages
      .map(stage => ({
        value: stage.name,
        label: stage.name,
        count: matchingLeads.filter(l => l.stage === stage.name).length,
      }))
      .filter(option => option.count > 0);
  }, [leadStages, getLeadsMatchingOtherFilters]);

  // Label filter options with counts
  const labelOptions = useMemo(() => {
    const matchingLeads = getLeadsMatchingOtherFilters('label');
    
    return leadLabels
      .map(label => ({
        value: label.name,
        label: label.name,
        count: matchingLeads.filter(l => l.label === label.name).length,
      }))
      .filter(option => option.count > 0);
  }, [leadLabels, getLeadsMatchingOtherFilters]);

  // Owner filter options with counts
  const ownerOptions = useMemo(() => {
    const matchingLeads = getLeadsMatchingOtherFilters('owner');
    const activeUsers = users.filter(u => u.isActive);
    
    return activeUsers
      .map(user => ({
        value: user.id,
        label: user.name,
        count: matchingLeads.filter(l => l.ownerId === user.id).length,
      }))
      .filter(option => option.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, getLeadsMatchingOtherFilters]);

  // Source filter options with counts
  const sourceOptions = useMemo(() => {
    const matchingLeads = getLeadsMatchingOtherFilters('source');
    
    return leadSources
      .map(source => ({
        value: source.name,
        label: source.name,
        count: matchingLeads.filter(l => l.source === source.name).length,
      }))
      .filter(option => option.count > 0);
  }, [leadSources, getLeadsMatchingOtherFilters]);

  // ============================================================================
  // Kanban Data
  // ============================================================================

  const getLabelColor = useCallback((labelName?: string) => {
    if (!labelName) return null;
    const label = leadLabels.find(l => l.name === labelName);
    if (!label) return null;
    
    const colorMap: Record<string, string> = {
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      gray: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    
    return colorMap[label.color] || colorMap.gray;
  }, [leadLabels]);

  const kanbanColumns: KanbanColumn<SalesCardData>[] = useMemo(() => {
    return leadStages.map(stage => {
      const stageLeads = filteredLeads
        .filter(lead => lead.stage === stage.name)
        .map(lead => ({
          id: lead.id,
          title: lead.name,
          companyName: lead.companyName,
          contactName: lead.contactName,
          value: lead.value,
          label: lead.label ? {
            text: lead.label,
            color: getLabelColor(lead.label) || '',
          } : undefined,
          owner: lead.ownerName ? { name: lead.ownerName } : undefined,
          source: lead.source,
          createdAt: lead.createdAt,
        }));

      return {
        id: stage.id,
        title: stage.name,
        color: stage.color,
        items: stageLeads,
      };
    });
  }, [leadStages, filteredLeads, getLabelColor]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAddLead = useCallback(() => {
    openAddLead({});
  }, [openAddLead]);

  const handleViewLead = useCallback((leadOrCard: Lead | SalesCardData) => {
    const lead = 'slug' in leadOrCard
      ? leadOrCard as Lead
      : leads.find(l => l.id === leadOrCard.id);
    if (lead) {
      navigate(`/sales/leads/${lead.slug || lead.id}`);
    }
  }, [leads, navigate]);

  const handleKanbanMove = useCallback((itemId: string, _fromColumnId: string, toColumnId: string) => {
    const stage = leadStages.find(s => s.id === toColumnId);
    if (stage) {
      updateLead(itemId, { stage: stage.name });
      toast.success('Lead Moved', `Moved to ${stage.name}`);
    }
  }, [leadStages, updateLead, toast]);

  const handleRowClick = useCallback((lead: Lead) => {
    handleViewLead(lead);
  }, [handleViewLead]);

  // ============================================================================
  // Table Columns
  // ============================================================================

  const columns: DataTableColumn<Lead>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Lead Name',
      sortable: true,
      render: (lead) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <span className="font-medium text-slate-900 dark:text-white">{lead.name}</span>
            {lead.label && (
              <span className={clsx('ml-2 px-1.5 py-0.5 rounded text-xs font-medium', getLabelColor(lead.label))}>
                {lead.label}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (lead) => {
        const stageConfig = leadStages.find(s => s.name === lead.stage);
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stageConfig?.color || '#64748b' }}
            />
            <span className="text-slate-600 dark:text-slate-400">{lead.stage}</span>
          </div>
        );
      },
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (lead) => (
        <span className="text-slate-600 dark:text-slate-400">
          {lead.companyName || '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      align: 'right',
      render: (lead) => (
        <span className={clsx(
          'font-medium',
          lead.value && lead.value > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
        )}>
          {lead.value ? `$${lead.value.toLocaleString()}` : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      render: (lead) => (
        <span className="text-slate-600 dark:text-slate-400">
          {lead.ownerName || '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (lead) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">
          {formatDate(lead.createdAt)}
        </span>
      ),
      hideOnMobile: true,
    },
  ], [leadStages, getLabelColor]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Page
      title="Leads"
      description="Track and manage your sales leads"
      fillHeight
      actions={
        <Button variant="primary" onClick={handleAddLead}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Lead
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
      {/* Filter Bar */}
      <FilterBar
        rightContent={
          <div className="flex items-center gap-3">
            <FilterCount count={filteredLeads.length} singular="lead" />
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
          placeholder="Search leads..."
          className="w-48 [&_input]:h-[34px] [&_input]:text-sm"
        />
        {/* Only show Stage filter in List view */}
        {viewMode === 'list' && (
          <SelectFilter
            label="Stage"
            value={stageFilter}
            onChange={setStageFilter}
            options={stageOptions}
            icon={Target}
            size="sm"
            className="w-36"
          />
        )}
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
          label="Owner"
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={ownerOptions}
          icon={User}
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
            getItemValue={(item) => item.value || 0}
            formatValue={(val) => `$${val.toLocaleString()}`}
            onItemMove={handleKanbanMove}
            onCardClick={handleViewLead}
            onAddClick={handleAddLead}
            showTotals
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <DataTable
            data={filteredLeads}
            columns={columns}
            rowKey={(lead) => lead.id}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            emptyState={
              <EmptyTableState
                icon={Target}
                hasFilters={!!hasActiveFilters}
                entityName="lead"
                onAdd={handleAddLead}
                addLabel="New Lead"
              />
            }
          />
        </div>
      )}
      </div>
    </Page>
  );
}

export default LeadsPage;