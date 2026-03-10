// ============================================================================
// ContractProjectsPage
// Location: src/components/panels/estimating/ContractProjectsPage.tsx
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, Plus, User, ExternalLink } from 'lucide-react';
import { Page } from '@/components/layout';
import {
  FilterBar, FilterCount, SearchInput, SelectFilter,
  DataTable, type DataTableColumn, EmptyTableState, Button,
} from '@/components/common';
import { useEstimatingStore, useUsersStore, useFieldsStore, type ContractProject } from '@/contexts';
import { useFormStack } from '@/components/panels/add-forms';
import { formatDate } from '@/utils/dateUtils';

const CONTRACT_TYPE_OPTIONS = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'retainer', label: 'Retainer' },
];

export function ContractProjectsPage() {
  const navigate = useNavigate();
  const { contractProjects } = useEstimatingStore();
  const { users } = useUsersStore();
  const { estimateStatuses } = useFieldsStore();
  const { openAddContractProject } = useFormStack();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const statusOptions = useMemo(() =>
    [...estimateStatuses].sort((a, b) => a.order - b.order).map(s => ({ value: s.id, label: s.name })),
    [estimateStatuses]
  );

  const ownerOptions = useMemo(() => {
    const ownerIds = new Set(contractProjects.map((p: ContractProject) => p.ownerId).filter(Boolean));
    return users.filter(u => ownerIds.has(u.id)).map(u => ({ value: u.id, label: u.name }));
  }, [contractProjects, users]);

  const filtered = useMemo((): ContractProject[] => {
    return contractProjects.filter((p: ContractProject) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.projectNumber.toLowerCase().includes(search.toLowerCase()) &&
        !(p.companyName || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter && p.contractType !== typeFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (ownerFilter && p.ownerId !== ownerFilter) return false;
      return true;
    });
  }, [contractProjects, search, typeFilter, statusFilter, ownerFilter]);

  const hasFilters = !!(search || typeFilter || statusFilter || ownerFilter);

  const getStatusDisplay = (statusId: string) => {
    const s = estimateStatuses.find(x => x.id === statusId);
    if (!s) return { name: statusId, color: '#64748b' };
    return s;
  };

  const columns: DataTableColumn<ContractProject>[] = [
    {
      key: 'projectNumber',
      header: 'Project #',
      width: 120,
      render: (p: ContractProject) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.projectNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Project Name',
      render: (p: ContractProject) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
          {p.companyName && <div className="text-xs text-slate-400 mt-0.5">{p.companyName}</div>}
        </div>
      ),
    },
    {
      key: 'contractType',
      header: 'Type',
      width: 140,
      render: (p: ContractProject) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {CONTRACT_TYPE_OPTIONS.find(t => t.value === p.contractType)?.label ?? p.contractType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 140,
      render: (p: ContractProject) => {
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
      key: 'contractValue',
      header: 'Value',
      width: 110,
      render: (p: ContractProject) => (
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {p.contractValue ? `$${p.contractValue.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Period',
      width: 160,
      render: (p: ContractProject) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {p.startDate ? formatDate(p.startDate, 'short') : '—'}
          {' → '}
          {p.endDate ? formatDate(p.endDate, 'short') : '—'}
        </span>
      ),
    },
    {
      key: 'ownerName',
      header: 'Owner',
      width: 130,
      render: (p: ContractProject) => (
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
      render: (p: ContractProject) => (
        <button
          onClick={e => { e.stopPropagation(); navigate(`/estimates/contracts/${p.id}`); }}
          className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <Page
      title="Contract Projects"
      fillHeight
      actions={
        <Button onClick={() => openAddContractProject()}>
          <Plus className="w-4 h-4 mr-1.5" />New Project
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <FilterBar rightContent={<FilterCount count={filtered.length} singular="project" />}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" className="w-48 [&_input]:h-[34px] [&_input]:text-sm" />
          <SelectFilter label="Type" value={typeFilter} onChange={setTypeFilter} options={CONTRACT_TYPE_OPTIONS} className="w-36" />
          <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-36" />
          <SelectFilter label="Owner" value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} icon={User} className="w-36" />
        </FilterBar>
        <div className="flex-1 min-h-0">
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(p: ContractProject) => p.id}
            onRowClick={(p: ContractProject) => navigate(`/estimates/contracts/${p.id}`)}
            emptyState={
              <EmptyTableState icon={FileSignature} hasFilters={hasFilters} entityName="contract project"
                onAdd={() => openAddContractProject()} addLabel="New Contract Project" />
            }
          />
        </div>
      </div>
    </Page>
  );
}

export default ContractProjectsPage;