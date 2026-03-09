// ============================================================================
// DeliveryProjectsPage
// Location: src/components/panels/estimating/DeliveryProjectsPage.tsx
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, User, ExternalLink } from 'lucide-react';
import { Page } from '@/components/layout';
import {
  FilterBar, FilterCount, SearchInput, SelectFilter,
  DataTable, type DataTableColumn, EmptyTableState, Button,
} from '@/components/common';
import { useEstimatingStore, useUsersStore, type DeliveryProject, type DeliveryStatus } from '@/contexts';
import { useFormStack } from '@/components/panels/add-forms';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function DeliveryProjectsPage() {
  const navigate = useNavigate();
  const { deliveryProjects } = useEstimatingStore();
  const { users } = useUsersStore();
  const { openAddDeliveryProject } = useFormStack();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const ownerOptions = useMemo(() => {
    const ownerIds = new Set(deliveryProjects.map((p: DeliveryProject) => p.ownerId).filter(Boolean));
    return users.filter(u => ownerIds.has(u.id)).map(u => ({ value: u.id, label: u.name }));
  }, [deliveryProjects, users]);

  const filtered = useMemo((): DeliveryProject[] => {
    return deliveryProjects.filter((p: DeliveryProject) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.projectNumber.toLowerCase().includes(search.toLowerCase()) &&
        !(p.companyName || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (ownerFilter && p.ownerId !== ownerFilter) return false;
      return true;
    });
  }, [deliveryProjects, search, statusFilter, ownerFilter]);

  const hasFilters = !!(search || statusFilter || ownerFilter);

  const columns: DataTableColumn<DeliveryProject>[] = [
    {
      key: 'projectNumber',
      header: 'Project #',
      width: 120,
      render: (p: DeliveryProject) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.projectNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Project Name',
      render: (p: DeliveryProject) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
          {p.companyName && <div className="text-xs text-slate-400 mt-0.5">{p.companyName}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      render: (p: DeliveryProject) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
          {STATUS_OPTIONS.find(s => s.value === p.status)?.label ?? p.status}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Est. Value',
      width: 120,
      render: (p: DeliveryProject) => (
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {p.value ? `$${p.value.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      width: 130,
      render: (p: DeliveryProject) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">{p.deliveryDate || '—'}</span>
      ),
    },
    {
      key: 'ownerName',
      header: 'Owner',
      width: 130,
      render: (p: DeliveryProject) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300">{p.ownerName || '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 50,
      render: (p: DeliveryProject) => (
        <button
          onClick={e => { e.stopPropagation(); navigate(`/estimates/delivery/${p.id}`); }}
          className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <Page
      title="Delivery Projects"
      fillHeight
      actions={
        <Button onClick={() => openAddDeliveryProject()}>
          <Plus className="w-4 h-4 mr-1.5" />New Project
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <FilterBar
          rightContent={
            <FilterCount count={filtered.length} singular="project" />
          }
        >
          <SearchInput
            value={search} onChange={setSearch} placeholder="Search projects…"
            className="w-48 [&_input]:h-[34px] [&_input]:text-sm"
          />
          <SelectFilter
            label="Status" value={statusFilter} onChange={setStatusFilter}
            options={STATUS_OPTIONS} className="w-36"
          />
          <SelectFilter
            label="Owner" value={ownerFilter} onChange={setOwnerFilter}
            options={ownerOptions} icon={User} className="w-36"
          />
        </FilterBar>
        <div className="flex-1 min-h-0">
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(p: DeliveryProject) => p.id}
            onRowClick={(p: DeliveryProject) => navigate(`/estimates/delivery/${p.id}`)}
            emptyState={
              <EmptyTableState
                icon={Truck}
                hasFilters={hasFilters}
                entityName="delivery project"
                onAdd={() => openAddDeliveryProject()}
                addLabel="New Delivery Project"
              />
            }
          />
        </div>
      </div>
    </Page>
  );
}

export default DeliveryProjectsPage;