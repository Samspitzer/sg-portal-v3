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
import { useEstimatingStore, useUsersStore, useFieldsStore, type DeliveryProject } from '@/contexts';
import { useFormStack } from '@/components/panels/add-forms';
import { formatDate } from '@/utils/dateUtils';

export function DeliveryProjectsPage() {
  const navigate = useNavigate();
  const { deliveryProjects } = useEstimatingStore();
  const { users } = useUsersStore();
  const { estimateStatuses } = useFieldsStore();
  const { openAddDeliveryProject } = useFormStack();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const statusOptions = useMemo(() =>
    [...estimateStatuses].sort((a, b) => a.order - b.order).map(s => ({ value: s.id, label: s.name })),
    [estimateStatuses]
  );

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

  const getStatusDisplay = (statusId: string) => {
    const s = estimateStatuses.find(x => x.id === statusId);
    if (!s) return { name: statusId, color: '#64748b', type: 'workflow' as const };
    return s;
  };

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
      width: 140,
      render: (p: DeliveryProject) => {
        const s = getStatusDisplay(p.status);
        return (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: s.color + '20', color: s.color, border: `1px solid ${s.color}40` }}
          >
            {s.name}
          </span>
        );
      },
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
      header: 'Due Date',
      width: 130,
      render: (p: DeliveryProject) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {p.deliveryDate ? formatDate(p.deliveryDate, 'short') : '—'}
        </span>
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
        <FilterBar rightContent={<FilterCount count={filtered.length} singular="project" />}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" className="w-48 [&_input]:h-[34px] [&_input]:text-sm" />
          <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-36" />
          <SelectFilter label="Owner" value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} icon={User} className="w-36" />
        </FilterBar>
        <div className="flex-1 min-h-0">
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(p: DeliveryProject) => p.id}
            onRowClick={(p: DeliveryProject) => navigate(`/estimates/delivery/${p.id}`)}
            emptyState={
              <EmptyTableState icon={Truck} hasFilters={hasFilters} entityName="delivery project"
                onAdd={() => openAddDeliveryProject()} addLabel="New Delivery Project" />
            }
          />
        </div>
      </div>
    </Page>
  );
}

export default DeliveryProjectsPage;