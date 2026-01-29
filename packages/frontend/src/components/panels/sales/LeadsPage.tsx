// ============================================================================
// LeadsPage - Lead Management with Kanban and List Views
// Location: src/components/panels/sales/LeadsPage.tsx
// 
// AUDIT COMPLIANCE:
// - Uses common components: FilterBar, FilterToggle, FilterCount, SelectFilter,
//   SearchInput, DataTable, Button, KanbanBoard
// - Uses hooks: useDocumentTitle
// - Uses contexts: useSalesStore, useFieldsStore, useUsersStore, useClientsStore, useToast
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  Target,
  LayoutGrid,
  List,
  Building2,
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
} from '@/components/common';
import { KanbanBoard, type KanbanColumn, type KanbanCardProps } from '@/components/common/KanbanBoard';
import { LeadDetailPanel } from './LeadDetailPanel';
import {
  useSalesStore,
  useFieldsStore,
  useUsersStore,
  useToast,
  type Lead,
  type LeadInput,
} from '@/contexts';
import { useDocumentTitle } from '@/hooks';
import { formatDate } from '@/utils/dateUtils';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'list' | 'kanban';
type SortField = 'name' | 'company' | 'value' | 'owner' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Lead Card for Kanban
// ============================================================================

interface LeadCardData {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  label?: { text: string; color: string };
  owner?: { name: string };
  companyName?: string;
  contactName?: string;
  source?: string;
  createdAt: string;
}

function LeadCard({
  item,
  onClick,
  onDragStart,
  isDragging,
}: KanbanCardProps<LeadCardData>) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={() => onClick(item)}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        'p-3 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        'group',
        isDragging && 'opacity-50 shadow-lg scale-105'
      )}
    >
      {/* Title Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2">
          {item.title}
        </h4>
        {item.label && (
          <span className={clsx('px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0', item.label.color)}>
            {item.label.text}
          </span>
        )}
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
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
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

      {/* Source */}
      {item.source && (
        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Source: {item.source}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeadsPage() {
  useDocumentTitle('Leads');
  const navigate = useNavigate();
  const toast = useToast();

  // Stores
  const { leads, createLead, updateLead } = useSalesStore();
  const { leadStages, leadLabels, leadSources } = useFieldsStore();
  const { users } = useUsersStore();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Sort state (for list view)
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string | undefined>();

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
  // Filter Options with Counts and Cross-Filter Logic
  // ============================================================================

  // Helper: Get leads that match all OTHER filters (excluding the one we're building options for)
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

  // Stage options with counts - only show stages that have leads
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

  // Label options with counts - only show labels that have leads
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

  // Owner options with counts - only show owners that have leads
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

  // Source options with counts - only show sources that have leads
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

  const kanbanColumns: KanbanColumn<LeadCardData>[] = useMemo(() => {
    return leadStages.map(stage => {
      const stageLeads = filteredLeads
        .filter(lead => lead.stage === stage.name)
        .map(lead => {
          const labelConfig = leadLabels.find(l => l.name === lead.label);
          return {
            id: lead.id,
            title: lead.name,
            companyName: lead.companyName,
            contactName: lead.contactName,
            value: lead.value,
            label: lead.label ? {
              text: lead.label,
              color: labelConfig?.name === 'Hot' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : labelConfig?.name === 'Warm'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            } : undefined,
            owner: lead.ownerName ? { name: lead.ownerName } : undefined,
            source: lead.source,
            createdAt: lead.createdAt,
          };
        });

      return {
        id: stage.id,
        title: stage.name,
        color: stage.color,
        items: stageLeads,
      };
    });
  }, [leadStages, filteredLeads, leadLabels]);

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

  const handleAddLead = useCallback((stageId?: string) => {
    const stage = leadStages.find(s => s.id === stageId);
    setDefaultStage(stage?.name);
    setIsPanelOpen(true);
  }, [leadStages]);

  const handleViewLead = useCallback((leadOrCard: Lead | LeadCardData) => {
    const lead = 'slug' in leadOrCard 
      ? leadOrCard as Lead 
      : leads.find(l => l.id === leadOrCard.id);
    if (lead) {
      navigate(`/sales/leads/${lead.slug || lead.id}`);
    }
  }, [leads, navigate]);

  const handleSaveLead = useCallback(async (data: LeadInput) => {
    createLead(data);
    toast.success('Lead Created', `"${data.name}" has been created`);
  }, [createLead, toast]);

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
            <span className="font-medium text-slate-900 dark:text-white">
              {lead.name}
            </span>
            {lead.label && (
              <span className={clsx(
                'ml-2 px-1.5 py-0.5 rounded text-xs font-medium',
                lead.label === 'Hot' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : lead.label === 'Warm'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              )}>
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
          lead.value && lead.value > 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-slate-400'
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
  ], [leadStages]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Page
      title="Leads"
      description="Manage your sales leads and prospects"
      actions={
        <Button variant="primary" onClick={() => handleAddLead()}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Lead
        </Button>
      }
    >
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
        {/* Only show Stage filter in List view - Kanban already shows stages as columns */}
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
        <KanbanBoard
          columns={kanbanColumns}
          renderCard={(props) => <LeadCard {...props} />}
          getItemId={(item) => item.id}
          getItemValue={(item) => item.value || 0}
          formatValue={(val) => `$${val.toLocaleString()}`}
          onItemMove={handleKanbanMove}
          onCardClick={handleViewLead}
          onAddClick={handleAddLead}
          showTotals
        />
      ) : (
        <DataTable
          data={filteredLeads}
          columns={columns}
          rowKey={(lead) => lead.id}
          onRowClick={handleRowClick}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          emptyState={
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No leads yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Create your first lead to start tracking your sales pipeline.</p>
              <Button variant="primary" onClick={() => handleAddLead()}>
                <Plus className="w-4 h-4 mr-1.5" />
                New Lead
              </Button>
            </div>
          }
        />
      )}

      {/* Lead Detail Panel - Create Mode Only */}
      <LeadDetailPanel
        lead={null}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setDefaultStage(undefined);
        }}
        onSave={handleSaveLead}
        defaultStage={defaultStage}
      />
    </Page>
  );
}

export default LeadsPage;