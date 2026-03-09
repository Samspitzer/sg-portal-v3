// ============================================================================
// SalesDashboardPage – Customizable Sales Insights Dashboard
// Location: src/components/panels/sales/SalesDashboardPage.tsx
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Trophy, Percent, Target, TrendingUp,
  Activity, ChevronRight, CheckCircle2, XCircle,
  ArrowUpRight, ArrowDownRight, Minus, Users, LayoutDashboard,
  BarChart2, Pencil, Check, Plus, GripVertical, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSalesStore }     from '@/contexts/salesStore';
import { useTaskStore }      from '@/contexts/taskStore';
import { useUsersStore }     from '@/contexts/usersStore';
import { useFieldsStore }    from '@/contexts/fieldsStore';
import { useTaskTypesStore } from '@/contexts/taskTypesStore';
import { useDocumentTitle }  from '@/hooks';

// ── Widget system types ───────────────────────────────────────────────────────

type WidgetType =
  | 'kpi-row'
  | 'pipeline-health'
  | 'deals-by-rep'
  | 'activities-status'
  | 'leads-by-source'
  | 'lead-temperature'
  | 'lead-pipeline'
  | 'won-deals'
  | 'lost-deals';

type WidgetSize = 'full' | 'half' | 'third';

interface WidgetInstance {
  id: string;
  type: WidgetType;
  size: WidgetSize;
}

interface WidgetMeta {
  type: WidgetType;
  name: string;
  description: string;
  size: WidgetSize;
  previewIcon: React.FC<{ className?: string }>;
}

const WIDGET_REGISTRY: WidgetMeta[] = [
  { type: 'kpi-row',           name: 'KPI Summary',           description: 'Pipeline value, wins, win rate, leads & deals at a glance',  size: 'full',  previewIcon: DollarSign },
  { type: 'pipeline-health',   name: 'Pipeline Health',        description: 'Stage funnel with conversion rates (Pipedrive style)',        size: 'full',  previewIcon: BarChart2 },
  { type: 'deals-by-rep',      name: 'Deals by Sales Person',  description: 'Stacked bar — open, lost, won per rep',                      size: 'half',  previewIcon: Users },
  { type: 'activities-status', name: 'Activities Status',       description: 'To-do vs done broken down by activity type',                 size: 'half',  previewIcon: Activity },
  { type: 'leads-by-source',   name: 'Leads by Source',         description: 'Donut chart of lead origin distribution',                    size: 'third', previewIcon: Target },
  { type: 'lead-temperature',  name: 'Lead Temperature',        description: 'Hot / warm / cold progress bars',                           size: 'third', previewIcon: TrendingUp },
  { type: 'lead-pipeline',     name: 'Lead Pipeline by Stage',  description: 'Vertical bar chart of leads per stage',                     size: 'third', previewIcon: BarChart2 },
  { type: 'won-deals',         name: 'Recently Won',            description: 'List of deals won this period',                             size: 'half',  previewIcon: Trophy },
  { type: 'lost-deals',        name: 'Lost Deals',              description: 'List of deals lost this period',                            size: 'half',  previewIcon: XCircle },
];

const DEFAULT_LAYOUT: WidgetInstance[] = WIDGET_REGISTRY.map(m => ({ id: m.type, type: m.type, size: m.size }));

const LS_KEY = 'sg_sales_dashboard_layout_v1';

function loadLayout(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetInstance[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: WidgetInstance[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(layout)); } catch { /* ignore */ }
}

// ── Period helpers ────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'quarter' | 'year';

const PERIOD_LABEL: Record<Period, string> = {
  week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year',
};

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === 'week')    { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (p === 'month')   return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return new Date(now.getFullYear(), 0, 1);
}

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n: number) { return `${Math.round(n)}%`; }

const CHART_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316'];

// ── Shared chart primitives ───────────────────────────────────────────────────

function EmptyChart({ msg = 'No data for this period' }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <BarChart2 className="w-8 h-8 text-slate-200 dark:text-slate-700" />
      <p className="text-xs text-slate-400 dark:text-slate-500">{msg}</p>
    </div>
  );
}

function PipelineHealthChart({ stages }: { stages: { label: string; reached: number; won: number }[] }) {
  if (stages.length === 0 || stages.every(s => s.reached === 0)) return <EmptyChart />;
  const maxVal = Math.max(...stages.map(s => s.reached), 1);
  const BAR_H = 130;
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-0 min-w-max px-1" style={{ minHeight: BAR_H + 72 }}>
        {stages.map((s, i) => {
          const next = stages[i + 1];
          const conv = next && s.reached > 0 ? Math.round((next.reached / s.reached) * 100) : null;
          const reachedH = Math.max(4, (s.reached / maxVal) * BAR_H);
          const wonH     = s.won > 0 ? Math.max(4, (s.won / maxVal) * BAR_H) : 0;
          const isWon    = s.label === 'Won';
          return (
            <div key={s.label} className="flex items-end">
              <div className="flex flex-col items-center" style={{ width: 70 }}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{s.reached}</span>
                <div className="flex items-end gap-0.5" style={{ height: BAR_H }}>
                  <div className="flex flex-col justify-end" style={{ width: isWon ? 60 : 28 }}>
                    <div className="w-full rounded-t-sm" style={{ height: reachedH, background: isWon ? '#34d399' : '#fbbf24', opacity: 0.9 }} />
                  </div>
                  {!isWon && wonH > 0 && (
                    <div className="flex flex-col justify-end" style={{ width: 28 }}>
                      <div className="w-full rounded-t-sm" style={{ height: wonH, background: '#34d399', opacity: 0.9 }} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center leading-tight px-0.5 truncate w-full" title={s.label}>{s.label}</p>
                {!isWon && s.won > 0 && s.reached > 0 && (
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">{Math.round((s.won / s.reached) * 100)}% won</p>
                )}
              </div>
              {conv !== null && (
                <div className="flex flex-col items-center justify-end pb-12 w-8">
                  <span className="text-[10px] font-semibold text-white bg-slate-600 dark:bg-slate-500 px-1.5 py-0.5 rounded leading-none">{conv}%</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 mt-0.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-1 px-1">
        <LegendDot color="#fbbf24" label="Reached stage" />
        <LegendDot color="#34d399" label="Won" />
      </div>
    </div>
  );
}

function RepStackChart({ rows }: { rows: { label: string; open: number; lost: number; won: number; total: number }[] }) {
  if (rows.length === 0) return <EmptyChart />;
  const maxT = Math.max(...rows.map(r => r.total), 1);
  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 text-right w-24 flex-shrink-0 truncate">{row.label}</span>
          <div className="flex-1 flex h-6 rounded overflow-hidden bg-slate-100 dark:bg-slate-700">
            {row.won  > 0 && <div style={{ width: `${(row.won  / maxT) * 100}%`, background: '#34d399' }} />}
            {row.lost > 0 && <div style={{ width: `${(row.lost / maxT) * 100}%`, background: '#f87171' }} />}
            {row.open > 0 && <div style={{ width: `${(row.open / maxT) * 100}%`, background: '#60a5fa' }} />}
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-5 text-right">{row.total}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityTypeChart({ data }: { data: { label: string; todo: number; done: number; color: string }[] }) {
  const nonEmpty = data.filter(d => d.todo + d.done > 0);
  if (nonEmpty.length === 0) return <EmptyChart msg="No activities recorded" />;
  const groupMax = Math.max(...nonEmpty.map(d => Math.max(d.todo, d.done)), 1);
  const BAR_H = 110;
  const BAR_W = Math.min(40, Math.floor(220 / nonEmpty.length));
  return (
    <div>
      <div className="flex justify-center gap-16">
        {(['todo', 'done'] as const).map(group => (
          <div key={group} className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-1" style={{ height: BAR_H }}>
              {nonEmpty.map((d, i) => {
                const val = d[group];
                const h = val > 0 ? Math.max(4, (val / groupMax) * BAR_H) : 0;
                return (
                  <div key={i} className="flex flex-col justify-end items-center" style={{ width: BAR_W }}>
                    {val > 0 && <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">{val}</span>}
                    {h > 0 && <div className="w-full rounded-t-sm" style={{ height: h, background: d.color, opacity: 0.85 }} />}
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{group === 'todo' ? 'To Do' : 'Done'}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {nonEmpty.map(d => <LegendDot key={d.label} color={d.color} label={d.label} square />)}
      </div>
    </div>
  );
}

function DonutChart({ data, size = 110 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = size / 2; const cy = size / 2; const R = size / 2 - 6; const r = R * 0.58;
  let cum = -90;
  const xy = (a: number, rad: number) => ({ x: cx + rad * Math.cos(a * Math.PI / 180), y: cy + rad * Math.sin(a * Math.PI / 180) });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const s = xy(cum, R); const e = xy(cum + angle, R);
        const si = xy(cum, r); const ei = xy(cum + angle, r);
        const large = angle > 180 ? 1 : 0;
        const path = `M${s.x},${s.y}A${R},${R},0,${large},1,${e.x},${e.y}L${ei.x},${ei.y}A${r},${r},0,${large},0,${si.x},${si.y}Z`;
        cum += angle;
        return <path key={i} d={path} fill={d.color} fillOpacity={0.88} />;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={15} fontWeight="bold" fill="currentColor">{total}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill="#94a3b8">total</text>
    </svg>
  );
}

function LegendDot({ color, label, square }: { color: string; label: string; square?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={clsx('w-2.5 h-2.5 flex-shrink-0', square ? 'rounded-sm' : 'rounded-full')} style={{ background: color }} />
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────

function DCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
      'flex flex-col h-full',
      className
    )}>
      {children}
    </div>
  );
}

function DCardHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 flex-shrink-0">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function VLink({ to, nav }: { to: string; nav: ReturnType<typeof useNavigate> }) {
  return (
    <button type="button" onClick={() => nav(to)}
      className="flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0">
      View <ChevronRight className="w-3 h-3" />
    </button>
  );
}

function KpiCard({ label, value, sub, Icon, iconCls, onClick, trend }: {
  label: string; value: string; sub?: string;
  Icon: React.FC<{ className?: string }>; iconCls: string;
  onClick?: () => void; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <button type="button" onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm text-left flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all w-full h-full">
      <div className="flex items-start justify-between">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', iconCls)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {trend === 'up'      && <ArrowUpRight   className="w-4 h-4 text-emerald-500" />}
        {trend === 'down'    && <ArrowDownRight  className="w-4 h-4 text-red-400" />}
        {trend === 'neutral' && <Minus           className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

// ── Widget col-span classes (6-column grid) ───────────────────────────────────

function colSpanClass(size: WidgetSize): string {
  if (size === 'full')  return 'col-span-6';
  if (size === 'half')  return 'col-span-3';
  return 'col-span-2';
}

// ── Add Widget Panel ──────────────────────────────────────────────────────────

function AddWidgetPanel({
  available,
  onAdd,
  onClose,
}: {
  available: WidgetMeta[];
  onAdd: (type: WidgetType) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add Report</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a widget to add to your dashboard</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {available.length === 0 ? (
            <div className="text-center py-12">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All reports are on your dashboard</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {available.map(meta => {
                const Icon = meta.previewIcon;
                const sizeLabel = meta.size === 'full' ? 'Full width' : meta.size === 'half' ? 'Half width' : 'One third';
                return (
                  <button key={meta.type} type="button"
                    onClick={() => { onAdd(meta.type); }}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{meta.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{meta.description}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{sizeLabel}</span>
                    </div>
                    <Plus className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SalesDashboardPage() {
  useDocumentTitle('Sales Dashboard');
  const navigate = useNavigate();

  // ── Data ──
  const { leads, deals }                           = useSalesStore();
  const { tasks }                                  = useTaskStore();
  const { users }                                  = useUsersStore();
  const { leadStages, dealStages, leadLabels }     = useFieldsStore();
  const { taskTypes }                              = useTaskTypesStore();

  const [period, setPeriod]         = useState<Period>('year');
  const [repFilter, setRepFilter]   = useState('');
  const [editMode, setEditMode]     = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [layout, setLayout]         = useState<WidgetInstance[]>(loadLayout);
  const [dragIndex, setDragIndex]   = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // ── Computed data ──
  const pStart  = useMemo(() => periodStart(period), [period]);
  const activeU = useMemo(() => users.filter(u => u.isActive), [users]);

  const allDeals = useMemo(() => deals.filter(d => !d.deletedAt), [deals]);
  const repDeals = useMemo(() => repFilter ? allDeals.filter(d => d.ownerId === repFilter) : allDeals, [allDeals, repFilter]);
  const repLeads = useMemo(() => repFilter ? leads.filter(l => l.ownerId === repFilter) : leads, [leads, repFilter]);
  const pDeals   = useMemo(() => repDeals.filter(d => new Date(d.createdAt) >= pStart), [repDeals, pStart]);
  const pLeads   = useMemo(() => repLeads.filter(l => new Date(l.createdAt) >= pStart), [repLeads, pStart]);

  const wonDeals  = pDeals.filter(d => d.status === 'won');
  const lostDeals = pDeals.filter(d => d.status === 'lost');
  const openDeals = repDeals.filter(d => d.status === 'active');
  const wonVal    = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const pipeVal   = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const winRate   = (wonDeals.length + lostDeals.length) > 0
    ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0;

  const sortedDealStages = useMemo(() => dealStages.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [dealStages]);
  const wonCount = repDeals.filter(d => d.status === 'won').length;

  const pipelineData = useMemo(() => {
    const data = sortedDealStages.map(s => ({
      label:   s.name,
      reached: repDeals.filter(d => d.stage === s.name).length,
      won:     repDeals.filter(d => d.stage === s.name && d.status === 'won').length,
    }));
    if (wonCount > 0) data.push({ label: 'Won', reached: wonCount, won: wonCount });
    return data;
  }, [sortedDealStages, repDeals, wonCount]);

  const byRepData = useMemo(() =>
    activeU.map(u => {
      const ud = repDeals.filter(d => d.ownerId === u.id);
      return { label: u.name, total: ud.length, open: ud.filter(d => d.status === 'active').length, lost: ud.filter(d => d.status === 'lost').length, won: ud.filter(d => d.status === 'won').length };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 8)
  , [activeU, repDeals]);

  const TYPE_COLORS: Record<string, string> = { call: '#3b82f6', meeting: '#8b5cf6', task: '#10b981', deadline: '#ef4444', email: '#f59e0b', follow_up: '#06b6d4' };

  const activityData = useMemo(() => {
    const salesTasks = tasks.filter(t => t.linkedItem?.type === 'lead' || t.linkedItem?.type === 'deal');
    const filtered   = repFilter ? salesTasks.filter(t => t.assignedUserId === repFilter) : salesTasks;
    return taskTypes.filter(tt => tt.isActive).map((tt, idx) => ({
      label: tt.label,
      todo:  filtered.filter(t => t.type === tt.value && t.status !== 'completed' && t.status !== 'cancelled').length,
      done:  filtered.filter(t => t.type === tt.value && t.status === 'completed').length,
      color: TYPE_COLORS[tt.value] ?? CHART_COLORS[idx % CHART_COLORS.length]!,
    }));
  }, [tasks, repFilter, taskTypes]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    repLeads.forEach(l => { const k = l.source || 'Unknown'; counts[k] = (counts[k] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length]! }));
  }, [repLeads]);

  const tempData = useMemo(() => {
    const colorMap: Record<string, string> = {};
    leadLabels.forEach(l => { colorMap[l.name] = l.color; });
    const counts: Record<string, number> = {};
    pLeads.forEach(l => { const k = l.label || 'Unlabeled'; counts[k] = (counts[k] ?? 0) + 1; });
    const tot = pLeads.length || 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({
      label, count, pct: Math.round(count / tot * 100), color: colorMap[label] ?? '#94a3b8',
    }));
  }, [leadLabels, pLeads]);

  const leadStageData = useMemo(() =>
    leadStages.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(s => ({ label: s.name, value: repLeads.filter(l => l.stage === s.name).length, color: s.color ?? '#3b82f6' }))
      .filter(s => s.value > 0)
  , [leadStages, repLeads]);

  const repName = activeU.find(u => u.id === repFilter)?.name ?? 'All Reps';

  // ── Layout editing ──
  const handleSaveDone = useCallback(() => {
    saveLayout(layout);
    setEditMode(false);
    setShowAddPanel(false);
  }, [layout]);

  const handleRemoveWidget = useCallback((id: string) => {
    setLayout(prev => prev.filter(w => w.id !== id));
  }, []);

  const handleAddWidget = useCallback((type: WidgetType) => {
    const meta = WIDGET_REGISTRY.find(m => m.type === type);
    if (!meta) return;
    const id = `${type}-${Date.now()}`;
    setLayout(prev => [...prev, { id, type, size: meta.size }]);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((index: number) => setDragIndex(index), []);
  const handleDragOver  = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setHoverIndex(index);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); setHoverIndex(null); return; }
    setLayout(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
    setDragIndex(null);
    setHoverIndex(null);
  }, [dragIndex]);
  const handleDragEnd = useCallback(() => { setDragIndex(null); setHoverIndex(null); }, []);

  // Available widgets = registry types not currently in layout
  const availableToAdd = WIDGET_REGISTRY.filter(m => !layout.some(w => w.type === m.type));

  // ── Widget renderer ──
  const renderWidget = useCallback((widget: WidgetInstance, index: number) => {
    const isDragging = dragIndex === index;
    const isHover    = hoverIndex === index && dragIndex !== null && dragIndex !== index;

    const shell = (content: React.ReactNode, title: string, sub?: string, action?: React.ReactNode) => (
      <DCard className={clsx(
        isDragging && 'opacity-40',
        isHover && 'ring-2 ring-blue-400 dark:ring-blue-500',
        editMode && 'cursor-grab active:cursor-grabbing',
      )}>
        {editMode && (
          <div className="flex items-center justify-between px-4 pt-3 pb-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <GripVertical className="w-4 h-4" />
              <span className="text-[11px] font-medium uppercase tracking-wide">{title}</span>
            </div>
            <button type="button" onClick={() => handleRemoveWidget(widget.id)}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {!editMode && <DCardHead title={title} sub={sub} action={action} />}
        <div className="flex-1 min-h-0">
          {content}
        </div>
      </DCard>
    );

    switch (widget.type) {

      case 'kpi-row':
        return (
          <div
            className={clsx(
              isDragging && 'opacity-40',
              isHover && 'ring-2 ring-blue-400 rounded-xl',
              editMode && 'cursor-grab'
            )}
          >
            {editMode && (
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">KPI Summary</span>
                </div>
                <button type="button" onClick={() => handleRemoveWidget(widget.id)}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-5 gap-3">
              <KpiCard label="Pipeline Value" value={fmtCurrency(pipeVal)}
                sub={`${openDeals.length} open deal${openDeals.length !== 1 ? 's' : ''}`}
                Icon={DollarSign} iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                onClick={editMode ? undefined : () => navigate('/sales/deals')} trend="neutral" />
              <KpiCard label="Won This Period" value={fmtCurrency(wonVal)}
                sub={`${wonDeals.length} deal${wonDeals.length !== 1 ? 's' : ''} closed`}
                Icon={Trophy} iconCls="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                onClick={editMode ? undefined : () => navigate('/sales/deals')} trend={wonDeals.length > 0 ? 'up' : 'neutral'} />
              <KpiCard label="Win Rate" value={fmtPct(winRate)}
                sub={`${wonDeals.length}W · ${lostDeals.length}L`}
                Icon={Percent}
                iconCls={winRate >= 40 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : winRate >= 20 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'}
                trend={winRate >= 40 ? 'up' : winRate < 20 && wonDeals.length + lostDeals.length > 0 ? 'down' : 'neutral'} />
              <KpiCard label="New Leads" value={String(pLeads.length)}
                sub={`${pLeads.filter(l => l.label === 'Hot').length} hot leads`}
                Icon={Target} iconCls="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                onClick={editMode ? undefined : () => navigate('/sales/leads')} trend="neutral" />
              <KpiCard label="New Deals" value={String(pDeals.length)}
                sub={`${lostDeals.length} lost this period`}
                Icon={TrendingUp} iconCls="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                onClick={editMode ? undefined : () => navigate('/sales/deals')} trend="neutral" />
            </div>
          </div>
        );

      case 'pipeline-health':
        return shell(
          <div className="px-5 pb-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Win rate is <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtPct(winRate)}</span>
            </p>
            <PipelineHealthChart stages={pipelineData} />
          </div>,
          'Pipeline Health',
          `S&G Pipeline · ${PERIOD_LABEL[period]} · Won, Lost, Open`,
          !editMode ? <VLink to="/sales/deals" nav={navigate} /> : undefined
        );

      case 'deals-by-rep':
        return shell(
          <div className="px-5 pb-5">
            {byRepData.length === 0 ? <EmptyChart /> : (
              <>
                <RepStackChart rows={byRepData} />
                <div className="flex items-center gap-4 mt-4">
                  <LegendDot color="#34d399" label="Won" square />
                  <LegendDot color="#f87171" label="Lost" square />
                  <LegendDot color="#60a5fa" label="Open" square />
                </div>
              </>
            )}
          </div>,
          'Deals by Sales Person',
          PERIOD_LABEL[period],
          !editMode ? <VLink to="/sales/deals" nav={navigate} /> : undefined
        );

      case 'activities-status':
        return shell(
          <div className="px-5 pb-5">
            <ActivityTypeChart data={activityData} />
          </div>,
          'Activities Status',
          'Sales tasks · all time',
          !editMode ? <VLink to="/sales/activities" nav={navigate} /> : undefined
        );

      case 'leads-by-source':
        return shell(
          <div className="px-5 pb-5">
            {sourceData.length === 0 ? <EmptyChart /> : (
              <div className="flex items-center gap-4">
                <DonutChart data={sourceData} size={110} />
                <div className="flex-1 space-y-1.5 min-w-0">
                  {sourceData.slice(0, 7).map(s => (
                    <div key={s.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{s.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>,
          'Leads by Source',
          'All time'
        );

      case 'lead-temperature':
        return shell(
          <div className="px-5 pb-5">
            {tempData.length === 0 ? <EmptyChart /> : (
              <div className="space-y-3">
                {tempData.map(l => (
                  <div key={l.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{l.label}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{l.count} ({l.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${l.pct}%`, background: l.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>,
          'Lead Temperature',
          `${PERIOD_LABEL[period]} · ${pLeads.length} leads`,
          !editMode ? <VLink to="/sales/leads" nav={navigate} /> : undefined
        );

      case 'lead-pipeline':
        return shell(
          <div className="px-5 pb-5">
            {leadStageData.length === 0 ? <EmptyChart /> : (() => {
              const maxV = Math.max(...leadStageData.map(s => s.value), 1);
              return (
                <div className="flex items-end gap-1.5" style={{ height: 132 }}>
                  {leadStageData.map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.value}</span>
                      <div className="w-full rounded-t-sm" style={{ height: `${Math.max(4, (s.value / maxV) * 100)}px`, background: s.color, opacity: 0.85 }} />
                      <span className="text-[10px] text-slate-400 text-center leading-tight truncate w-full" title={s.label}>
                        {s.label.length > 8 ? s.label.slice(0, 7) + '…' : s.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>,
          'Lead Pipeline by Stage',
          'All leads · all time',
          !editMode ? <VLink to="/sales/leads" nav={navigate} /> : undefined
        );

      case 'won-deals':
        return shell(
          <div className="px-3 pb-3">
            {wonDeals.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Trophy className="w-7 h-7 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No wins yet this period</p>
              </div>
            ) : (
              <>
                {wonDeals.slice(0, 6).map(d => (
                  <button key={d.id} type="button" disabled={editMode}
                    onClick={() => navigate(`/sales/deals/${d.slug || d.id}`)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group text-left transition-colors disabled:pointer-events-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{d.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{d.ownerName}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">{d.value ? fmtCurrency(d.value) : '—'}</span>
                  </button>
                ))}
                {wonDeals.length > 6 && <p className="text-xs text-center text-slate-400 py-2">+{wonDeals.length - 6} more</p>}
              </>
            )}
          </div>,
          'Recently Won',
          `${wonDeals.length} deal${wonDeals.length !== 1 ? 's' : ''} · ${PERIOD_LABEL[period]}`,
          !editMode ? <VLink to="/sales/deals" nav={navigate} /> : undefined
        );

      case 'lost-deals':
        return shell(
          <div className="px-3 pb-3">
            {lostDeals.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Activity className="w-7 h-7 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No lost deals this period</p>
              </div>
            ) : (
              <>
                {lostDeals.slice(0, 6).map(d => (
                  <button key={d.id} type="button" disabled={editMode}
                    onClick={() => navigate(`/sales/deals/${d.slug || d.id}`)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group text-left transition-colors disabled:pointer-events-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{d.name}</p>
                        {d.lostReason ? <p className="text-[11px] text-slate-400 truncate">{d.lostReason}</p> : <p className="text-[11px] text-slate-400">{d.ownerName}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-400 flex-shrink-0">{d.value ? fmtCurrency(d.value) : '—'}</span>
                  </button>
                ))}
                {lostDeals.length > 6 && <p className="text-xs text-center text-slate-400 py-2">+{lostDeals.length - 6} more</p>}
              </>
            )}
          </div>,
          'Lost Deals',
          `${lostDeals.length} deal${lostDeals.length !== 1 ? 's' : ''} · ${PERIOD_LABEL[period]}`,
          !editMode ? <VLink to="/sales/deals" nav={navigate} /> : undefined
        );

      default: return null;
    }
  }, [
    period, repFilter, pipeVal, openDeals, wonDeals, lostDeals, wonVal, winRate,
    pDeals, pLeads, pipelineData, byRepData, activityData, sourceData, tempData, leadStageData,
    editMode, dragIndex, hoverIndex, navigate, handleRemoveWidget, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  ]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-full">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + title + subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm flex-shrink-0">
              <LayoutDashboard className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Sales Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{PERIOD_LABEL[period]} · {repName}</p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Period filter — hidden in edit mode */}
            {!editMode && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 gap-0.5">
                {(['week','month','quarter','year'] as Period[]).map(p => (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      period === p ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}>
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
            )}

            {/* Rep filter — hidden in edit mode, only shown when >1 user */}
            {!editMode && activeU.length > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select value={repFilter} onChange={e => setRepFilter(e.target.value)}
                  className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                  <option value="">All Reps</option>
                  {activeU.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}

            {/* Edit / Done buttons */}
            {!editMode ? (
              <button type="button" onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all">
                <Pencil className="w-3.5 h-3.5" />
                Edit Dashboard
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setShowAddPanel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all">
                  <Plus className="w-3.5 h-3.5" />
                  Add Report
                </button>
                <button type="button" onClick={handleSaveDone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
                  <Check className="w-3.5 h-3.5" />
                  Done
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode hint banner */}
        {editMode && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <GripVertical className="w-3.5 h-3.5 flex-shrink-0" />
            Drag reports to reorder · click <X className="w-3 h-3 inline mx-0.5" /> to remove · click <strong>Add Report</strong> to add new reports
          </div>
        )}
      </div>

      {/* ── Widget grid ─────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-6 gap-4 items-start">
          {layout.map((widget, index) => (
            <div
              key={widget.id}
              className={clsx(
                colSpanClass(widget.size),
                'min-h-0',
              )}
              draggable={editMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {renderWidget(widget, index)}
            </div>
          ))}

          {/* Empty state in edit mode when all widgets removed */}
          {layout.length === 0 && editMode && (
            <div className="col-span-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
              <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No reports on dashboard</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click <strong>Add Report</strong> to add your first widget</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Widget Modal */}
      {showAddPanel && (
        <AddWidgetPanel
          available={availableToAdd}
          onAdd={(type) => { handleAddWidget(type); }}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}

export default SalesDashboardPage;