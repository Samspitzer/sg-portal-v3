// ============================================================================
// RoutesPage - Sales Route Planner (v3)
// Location: src/components/panels/sales/RoutesPage.tsx
//
// Layout:
//   Top: FilterBar (z-[100] wrapper fixes Leaflet stacking context clash)
//   Left panel: Map (h-56, flex-shrink-0) + scrollable candidate list below
//   Right panel: Config card, Saved Routes section, current route stop list
//
// Features:
// - Interactive Leaflet map (OpenStreetMap, no API key)
// - Color-coded pins per type; numbered pins for active route stops
// - "Use My Location" (Geolocation API) or geocoded address start point
// - Nearest-neighbor TSP optimization (client-side, no API)
// - Radius filter hides candidates outside N miles from start
// - Map markers update live from active filters
// - Click map popup "Add to Route"
// - Save / load / delete named routes (persisted via routesStore)
// ============================================================================

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { clsx } from 'clsx';
import {
  Map as MapIcon,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Navigation,
  Building2,
  Target,
  TrendingUp,
  MapPin,
  ExternalLink,
  User,
  Filter,
  Route,
  Trash2,
  Sparkles,
  Loader2,
  LocateFixed,
  RefreshCw,
  Save,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { Page } from '@/components/layout';
import {
  Button,
  SearchInput,
  SelectFilter,
  FilterBar,
  FilterCount,
  Card,
  CardContent,
} from '@/components/common';
import {
  useClientsStore,
  useSalesStore,
  useUsersStore,
} from '@/contexts';
import { useRoutesStore, type SavedRoute, type SavedRouteStop } from '@/contexts/routesStore';
import { useDocumentTitle } from '@/hooks';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// Types
// ============================================================================

type StopType = 'company' | 'lead' | 'deal';

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteStop {
  id: string;
  sourceId: string;
  slug?: string;
  type: StopType;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  subtitle?: string;
  coords?: LatLng;
}

interface StopCandidate {
  sourceId: string;
  slug?: string;
  type: StopType;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  subtitle?: string;
  coords?: LatLng;
}

// ============================================================================
// Module-level geocoding cache + rate-limited queue
// ============================================================================

const geocodeCache = new Map<string, LatLng | null>();
let geocodeQueueRunning = false;
const geocodeQueue: Array<() => Promise<void>> = [];

async function runGeocodeQueue() {
  if (geocodeQueueRunning) return;
  geocodeQueueRunning = true;
  while (geocodeQueue.length > 0) {
    const task = geocodeQueue.shift();
    if (task) await task();
    await new Promise(r => setTimeout(r, 1100)); // Nominatim: 1 req/sec
  }
  geocodeQueueRunning = false;
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null;
  return new Promise(resolve => {
    geocodeQueue.push(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'SGPortalV3/1.0' },
        });
        const data = await res.json();
        if (data?.[0]) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          geocodeCache.set(address, coords);
          resolve(coords);
        } else {
          geocodeCache.set(address, null);
          resolve(null);
        }
      } catch {
        geocodeCache.set(address, null);
        resolve(null);
      }
    });
    runGeocodeQueue();
  });
}

// ============================================================================
// Distance & Optimization
// ============================================================================

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function haversineMiles(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 0.621371;
}

function nearestNeighborTSP(
  startCoords: LatLng,
  stops: Array<{ id: string; coords: LatLng }>
): string[] {
  const remaining = [...stops];
  const order: string[] = [];
  let current = startCoords;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = haversineKm(current, remaining[0]!.coords);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]!.coords);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    const nearest = remaining[nearestIdx]!;
    order.push(nearest.id);
    current = nearest.coords;
    remaining.splice(nearestIdx, 1);
  }
  return order;
}

// ============================================================================
// Helpers
// ============================================================================

function formatAddress(street: string, city: string, state: string, zip: string): string {
  return [street, city, state, zip].filter(Boolean).join(', ');
}

function buildGoogleMapsUrl(startAddress: string, userLocation: LatLng | null, stops: RouteStop[]): string {
  if (stops.length === 0) return '';
  const origin = startAddress.trim()
    ? encodeURIComponent(startAddress)
    : userLocation ? `${userLocation.lat},${userLocation.lng}` : null;
  if (stops.length === 1) {
    const dest = encodeURIComponent(stops[0]!.address);
    return origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
  }
  const all: string[] = [];
  if (startAddress.trim()) all.push(startAddress);
  else if (userLocation) all.push(`${userLocation.lat},${userLocation.lng}`);
  stops.slice(0, 9).forEach(s => all.push(s.address)); // Google Maps limit
  return `https://www.google.com/maps/dir/${all.map(a => encodeURIComponent(a)).join('/')}`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_CONFIG: Record<StopType, {
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  label: string;
  markerColor: string;
}> = {
  company: { icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Company', markerColor: '#2563eb' },
  lead:    { icon: Target,    color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Lead', markerColor: '#9333ea' },
  deal:    { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Deal', markerColor: '#059669' },
};

// ============================================================================
// Leaflet loading hook
// ============================================================================

function useLeaflet(onReady: () => void) {
  useEffect(() => {
    if ((window as any).L) { onReady(); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = onReady;
      document.head.appendChild(script);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ============================================================================
// SVG marker factory
// ============================================================================

// SVG icon paths for each type (from Lucide, simplified for small size)
const TYPE_ICON_SVG: Record<StopType, string> = {
  company: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" stroke="white" stroke-width="1.5" fill="none"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="white" stroke-width="1.5" fill="none"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" stroke="white" stroke-width="1.5" fill="none"/><line x1="10" y1="6" x2="10" y2="6.01" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="6" x2="14" y2="6.01" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="10" x2="10" y2="10.01" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="10" x2="14" y2="10.01" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="14" x2="10" y2="14.01" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="14" x2="14" y2="14.01" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
  lead:    `<circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="6" stroke="white" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill="white"/>`,
  deal:    `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="16 7 22 7 22 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
};

function makeMarkerHtml(color: string, type?: StopType, label?: string): string {
  const iconSvg = type ? TYPE_ICON_SVG[type] : '';
  return `<div style="position:relative;width:36px;height:46px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">
    <svg viewBox="0 0 36 46" width="36" height="46" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2C10.27 2 4 8.27 4 16c0 11 14 28 14 28S32 27 32 16C32 8.27 25.73 2 18 2z" fill="${color}" stroke="white" stroke-width="1.5"/>
      ${label !== undefined
        ? `<circle cx="18" cy="16" r="8" fill="white"/><text x="18" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="${color}" font-family="system-ui">${label}</text>`
        : `<svg x="6" y="6" width="24" height="24" viewBox="0 0 24 24">${iconSvg}</svg>`}
    </svg>
  </div>`;
}

function makeUserMarkerHtml(): string {
  return `<div style="position:relative;width:24px;height:24px">
    <div style="width:24px;height:24px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.25);animation:pulse-loc 2s infinite"></div>
    <style>@keyframes pulse-loc{0%,100%{box-shadow:0 0 0 4px rgba(37,99,235,0.25)}50%{box-shadow:0 0 0 10px rgba(37,99,235,0)}}</style>
  </div>`;
}

// ============================================================================
// CandidateCard
// ============================================================================

function getDetailPath(type: StopType, sourceId: string, slug?: string): string {
  const id = slug || sourceId;
  if (type === 'company') return `/clients/companies/${id}`;
  if (type === 'lead')    return `/sales/leads/${id}`;
  return `/sales/deals/${id}`;
}

function CandidateCard({ candidate, isAdded, onAdd, distanceMi, onNavigate }: {
  candidate: StopCandidate; isAdded: boolean; onAdd: () => void; distanceMi?: number | null; onNavigate: () => void;
}) {
  const cfg = TYPE_CONFIG[candidate.type];
  const Icon = cfg.icon;
  const hasCoords = !!(candidate.coords ?? geocodeCache.get(candidate.address));

  return (
    <div className={clsx(
      'flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all',
      isAdded
        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-50'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    )}>
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={clsx('w-4 h-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onNavigate}
          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left w-full transition-colors"
        >
          {candidate.name}
        </button>
        {candidate.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{candidate.subtitle}</p>}
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {candidate.city}, {candidate.state} {candidate.zip}
          {hasCoords && distanceMi != null && (
            <span className="text-blue-500 font-medium ml-1">· {distanceMi < 1 ? `${(distanceMi * 5280).toFixed(0)} ft` : `${distanceMi.toFixed(1)} mi`}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onNavigate}
          className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title={`View ${candidate.type} details`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          type="button" onClick={onAdd} disabled={isAdded}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
            isAdded ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          )}>
          <Plus className="w-3.5 h-3.5" />{isAdded ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// StopRow
// ============================================================================

function StopRow({ stop, index, total, onRemove, onMoveUp, onMoveDown }: {
  stop: RouteStop; index: number; total: number;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const cfg = TYPE_CONFIG[stop.type];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group">
      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{index + 1}</span>
      </div>
      <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', cfg.bg)}>
        <Icon className={clsx('w-3.5 h-3.5', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{stop.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{stop.city}, {stop.state}</p>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onMoveUp} disabled={index === 0}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onRemove}
          className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SavedRouteRow
// ============================================================================

function SavedRouteRow({ route, onLoad, onDelete }: {
  route: SavedRoute; onLoad: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 group transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{route.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''} · {formatRelativeDate(route.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button" onClick={onLoad}
          className="px-2 py-1 text-xs font-medium rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          Load
        </button>
        <button
          type="button" onClick={onDelete}
          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RoutesPage() {
  useDocumentTitle('Route Planning');

  const navigate = useNavigate();
  const { companies } = useClientsStore();
  const { leads, deals } = useSalesStore();
  const { users } = useUsersStore();
  const { savedRoutes, saveRoute, deleteRoute } = useRoutesStore();

  // ── Filter state ──────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [zipFilter, setZipFilter]   = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | StopType>('');
  const [radiusMiles, setRadiusMiles] = useState<number>(999);

  // ── Location ──────────────────────────────────────────────────────────
  const [userLocation, setUserLocation]   = useState<LatLng | null>(null);
  const [isLocating, setIsLocating]       = useState(false);
  const [locationError, setLocationError] = useState('');
  const [startAddress, setStartAddress]   = useState('');
  const [isGeocodingStart, setIsGeocodingStart] = useState(false);
  const [startCoords, setStartCoords]     = useState<LatLng | null>(null);

  // ── Route state ───────────────────────────────────────────────────────
  const [routeStops, setRouteStops]   = useState<RouteStop[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [routeName, setRouteName]     = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [savedRouteId, setSavedRouteId]   = useState<string | null>(null); // currently loaded

  // ── Saved routes panel ────────────────────────────────────────────────
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);

  // ── Leaflet map ───────────────────────────────────────────────────────
  const mapContainerRef     = useRef<HTMLDivElement>(null);
  const leafletMapRef       = useRef<any>(null);
  const userMarkerRef       = useRef<any>(null);
  const candidateMarkersRef = useRef<any[]>([]);
  const routeMarkersRef     = useRef<any[]>([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  // ── Geocode trigger ───────────────────────────────────────────────────
  const [candidateCoords, setCandidateCoords] = useState<Map<string, LatLng | null>>(new Map());

  // ── Build all candidates ──────────────────────────────────────────────
  const allCandidates = useMemo((): StopCandidate[] => {
    const result: StopCandidate[] = [];
    companies.forEach(c => {
      const addr = c.addresses?.[0] ?? c.address;
      if (!addr?.city || !addr?.state) return;
      const address = formatAddress(addr.street ?? '', addr.city, addr.state, addr.zip ?? '');
      result.push({ sourceId: c.id, slug: c.slug, type: 'company', name: c.name, address, city: addr.city, state: addr.state, zip: addr.zip ?? '', coords: geocodeCache.get(address) ?? undefined });
    });
    leads.forEach(l => {
      const a = l.jobsiteAddress;
      if (!a?.city || !a?.state) return;
      const address = formatAddress(a.street ?? '', a.city, a.state, a.zip);
      result.push({ sourceId: l.id, slug: l.slug, type: 'lead', name: l.name, address, city: a.city, state: a.state, zip: a.zip, subtitle: l.companyName ? `Lead · ${l.companyName}` : 'Lead', coords: geocodeCache.get(address) ?? undefined });
    });
    deals.forEach(d => {
      if (d.deletedAt) return;
      const a = d.jobsiteAddress;
      if (!a?.city || !a?.state) return;
      const address = formatAddress(a.street ?? '', a.city, a.state, a.zip);
      result.push({ sourceId: d.id, slug: d.slug, type: 'deal', name: d.name, address, city: a.city, state: a.state, zip: a.zip, subtitle: d.companyName ? `Deal · ${d.companyName}` : 'Deal', coords: geocodeCache.get(address) ?? undefined });
    });
    return result;
  // candidateCoords is the reactive trigger for cache updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, leads, deals, candidateCoords]);

  // ── Geocode all candidates in background ──────────────────────────────
  useEffect(() => {
    const uncached = allCandidates.filter(c => !geocodeCache.has(c.address));
    if (uncached.length === 0) return;
    uncached.forEach(c => {
      geocodeAddress(c.address).then(coords => {
        setCandidateCoords(prev => {
          const next = new Map(prev);
          next.set(c.address, coords);
          return next;
        });
      });
    });
  }, [allCandidates]);

  const stateOptions = useMemo(() => {
    const states = [...new Set(allCandidates.map(c => c.state).filter(Boolean))].sort();
    return states.map(s => ({ value: s, label: s }));
  }, [allCandidates]);

  const effectiveStart: LatLng | null = startCoords ?? userLocation;

  // ── Filter candidates ─────────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    const sl = search.toLowerCase();
    const zl = zipFilter.trim().toLowerCase();
    return allCandidates.filter(c => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (stateFilter && c.state !== stateFilter) return false;
      if (zl && !c.zip.startsWith(zl)) return false;
      if (sl && !c.name.toLowerCase().includes(sl) && !c.city.toLowerCase().includes(sl) && !(c.subtitle?.toLowerCase().includes(sl) ?? false)) return false;
      if (effectiveStart && c.coords && radiusMiles < 999) {
        if (haversineMiles(effectiveStart, c.coords) > radiusMiles) return false;
      }
      return true;
    });
  }, [allCandidates, search, stateFilter, zipFilter, typeFilter, effectiveStart, radiusMiles]);

  // ── Sort candidates by distance from start (when location is known) ──
  const sortedCandidates = useMemo(() => {
    if (!effectiveStart) return filteredCandidates;
    return [...filteredCandidates].sort((a, b) => {
      const coordsA = a.coords ?? geocodeCache.get(a.address);
      const coordsB = b.coords ?? geocodeCache.get(b.address);
      // Un-geocoded items go to the bottom
      if (!coordsA && !coordsB) return 0;
      if (!coordsA) return 1;
      if (!coordsB) return -1;
      return haversineMiles(effectiveStart, coordsA) - haversineMiles(effectiveStart, coordsB);
    });
  }, [filteredCandidates, effectiveStart, candidateCoords]);

  const addedSourceIds = useMemo(() => new Set(routeStops.map(s => `${s.type}:${s.sourceId}`)), [routeStops]);

  // ── Filter list to only what's visible in the current map viewport ────
  const visibleCandidates = useMemo(() => {
    if (!mapBounds) return sortedCandidates;
    return sortedCandidates.filter(c => {
      const coords = c.coords ?? geocodeCache.get(c.address);
      if (!coords) return false; // no pin = not on map
      return (
        coords.lat <= mapBounds.north &&
        coords.lat >= mapBounds.south &&
        coords.lng <= mapBounds.east &&
        coords.lng >= mapBounds.west
      );
    });
  }, [sortedCandidates, mapBounds, candidateCoords]);

  // ── Load Leaflet ──────────────────────────────────────────────────────
  useLeaflet(() => setLeafletReady(true));

  // ── Init map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || leafletMapRef.current) return;
    const L = (window as any).L;
    const map = L.map(mapContainerRef.current, { center: [39.5, -98.35], zoom: 4, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    leafletMapRef.current = map;

    const updateBounds = () => {
      const b = map.getBounds();
      setMapBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    // Set initial bounds after map renders
    setTimeout(updateBounds, 100);
  }, [leafletReady]);

  // ── User/start location marker ────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    const location = startCoords ?? userLocation;
    if (location) {
      const icon = L.divIcon({ html: makeUserMarkerHtml(), className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
      userMarkerRef.current = L.marker([location.lat, location.lng], { icon, zIndexOffset: 1000 })
        .addTo(leafletMapRef.current)
        .bindPopup(startCoords ? `<b>Start: ${startAddress}</b>` : '<b>Your Location</b>');
      leafletMapRef.current.flyTo([location.lat, location.lng], 10, { duration: 1.2 });
    }
  }, [userLocation, startCoords, startAddress]);

  // ── Candidate markers (live from filters) ────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    candidateMarkersRef.current.forEach(m => m.remove());
    candidateMarkersRef.current = [];
    const bounds: [number, number][] = [];
    filteredCandidates.forEach(c => {
      const coords = c.coords ?? geocodeCache.get(c.address);
      if (!coords || addedSourceIds.has(`${c.type}:${c.sourceId}`)) return;
      const cfg = TYPE_CONFIG[c.type];
      const icon = L.divIcon({ html: makeMarkerHtml(cfg.markerColor, c.type), className: '', iconSize: [36, 46], iconAnchor: [18, 46] });
      const marker = L.marker([coords.lat, coords.lng], { icon })
        .addTo(leafletMapRef.current)
        .bindPopup(`
          <div style="min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${c.name}</div>
            ${c.subtitle ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px">${c.subtitle}</div>` : ''}
            <div style="font-size:11px;color:#6b7280">${c.city}, ${c.state}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="window.__addRouteStop('${c.type}','${c.sourceId}')"
                style="flex:1;padding:4px 8px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500">
                + Add
              </button>
              <button onclick="window.__viewDetail('${c.type}','${c.sourceId}','${c.slug ?? ''}')"
                style="flex:1;padding:4px 8px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500">
                View
              </button>
            </div>
          </div>`);
      candidateMarkersRef.current.push(marker);
      bounds.push([coords.lat, coords.lng]);
    });
    // Auto-fit to show all pins when no start location is set
    if (bounds.length > 0 && !effectiveStart) {
      if (bounds.length === 1) {
        leafletMapRef.current.setView(bounds[0]!, 12);
      } else {
        leafletMapRef.current.fitBounds(bounds as [number, number][], { padding: [40, 40], maxZoom: 13 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCandidates, addedSourceIds, leafletReady, candidateCoords]);

  // ── Route stop markers ────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
    routeStops.forEach((stop, idx) => {
      const coords = stop.coords ?? geocodeCache.get(stop.address);
      if (!coords) return;
      const cfg = TYPE_CONFIG[stop.type];
      const icon = L.divIcon({ html: makeMarkerHtml(cfg.markerColor, undefined, String(idx + 1)), className: '', iconSize: [36, 46], iconAnchor: [18, 46] });
      const marker = L.marker([coords.lat, coords.lng], { icon, zIndexOffset: 500 })
        .addTo(leafletMapRef.current)
        .bindPopup(`<div style="min-width:140px"><div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Stop ${idx + 1}</div><div style="font-weight:600;font-size:13px;margin-top:2px">${stop.name}</div><div style="font-size:11px;color:#6b7280">${stop.city}, ${stop.state}</div></div>`);
      routeMarkersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops, leafletReady, candidateCoords]);

  // ── Global popup handler ──────────────────────────────────────────────
  useEffect(() => {
    (window as any).__addRouteStop = (type: StopType, sourceId: string) => {
      const candidate = allCandidates.find(c => c.type === type && c.sourceId === sourceId);
      if (!candidate) return;
      const key = `${type}:${sourceId}`;
      if (addedSourceIds.has(key)) return;
      const coords = candidate.coords ?? (geocodeCache.get(candidate.address) ?? undefined);
      setRouteStops(prev => [...prev, { ...candidate, id: `${key}-${Date.now()}`, coords }]);
      if (leafletMapRef.current) leafletMapRef.current.closePopup();
    };
    (window as any).__viewDetail = (type: StopType, sourceId: string, slug: string) => {
      navigate(getDetailPath(type, sourceId, slug || undefined));
      if (leafletMapRef.current) leafletMapRef.current.closePopup();
    };
    return () => {
      delete (window as any).__addRouteStop;
      delete (window as any).__viewDetail;
    };
  }, [allCandidates, addedSourceIds]);

  // ── Geolocation ───────────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported by your browser.'); return; }
    setIsLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStartAddress(''); setStartCoords(null); setIsLocating(false); },
      err => { setLocationError(err.message ?? 'Unable to get location.'); setIsLocating(false); },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const handleGeocodeStart = useCallback(async () => {
    if (!startAddress.trim()) return;
    setIsGeocodingStart(true);
    const coords = await geocodeAddress(startAddress);
    setStartCoords(coords);
    setUserLocation(null);
    setIsGeocodingStart(false);
    if (!coords) setLocationError('Address not found. Try a more specific address.');
    else setLocationError('');
  }, [startAddress]);

  // ── Stop management ───────────────────────────────────────────────────
  const addStop = useCallback((candidate: StopCandidate) => {
    const key = `${candidate.type}:${candidate.sourceId}`;
    if (addedSourceIds.has(key)) return;
    const coords = candidate.coords ?? (geocodeCache.get(candidate.address) ?? undefined);
    setRouteStops(prev => [...prev, { ...candidate, id: `${key}-${Date.now()}`, coords }]);
  }, [addedSourceIds]);

  const removeStop  = useCallback((id: string) => setRouteStops(prev => prev.filter(s => s.id !== id)), []);
  const clearRoute  = useCallback(() => { setRouteStops([]); setSavedRouteId(null); }, []);

  const moveStop = useCallback((index: number, direction: 'up' | 'down') => {
    setRouteStops(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      const tmp = arr[index] as RouteStop;
      arr[index] = arr[target] as RouteStop;
      arr[target] = tmp;
      return arr;
    });
  }, []);

  // ── Optimization ──────────────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (routeStops.length < 2) return;
    setIsOptimizing(true); setOptimizeError('');
    const stopsWithCoords = await Promise.all(
      routeStops.map(async s => {
        const coords = s.coords ?? geocodeCache.get(s.address) ?? await geocodeAddress(s.address);
        return { ...s, coords: coords ?? undefined };
      })
    );
    const geocoded = stopsWithCoords.filter(s => s.coords) as Array<RouteStop & { coords: LatLng }>;
    if (geocoded.length < 2) {
      setOptimizeError(`Only ${geocoded.length}/${routeStops.length} stops geocoded. Add more address details.`);
      setIsOptimizing(false); return;
    }
    const origin = effectiveStart ?? geocoded[0]!.coords;
    const order = nearestNeighborTSP(origin, geocoded.map(s => ({ id: s.id, coords: s.coords })));
    const byId = new Map(stopsWithCoords.map(s => [s.id, s]));
    const optimized: RouteStop[] = [];
    order.forEach(id => { const s = byId.get(id); if (s) optimized.push(s); });
    stopsWithCoords.filter(s => !s.coords).forEach(s => optimized.push(s));
    setRouteStops(optimized);
    setIsOptimizing(false);
  }, [routeStops, effectiveStart]);

  // ── Save route ────────────────────────────────────────────────────────
  const handleSaveRoute = useCallback(() => {
    if (routeStops.length === 0) return;
    const name = routeName.trim() || `Route — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const stops: SavedRouteStop[] = routeStops.map(s => ({
      id: s.id, sourceId: s.sourceId, type: s.type, name: s.name,
      address: s.address, city: s.city, state: s.state, zip: s.zip, subtitle: s.subtitle,
    }));
    const saved = saveRoute({ name, repId: selectedRepId || undefined, startAddress, stops });
    setSavedRouteId(saved.id);
    setShowSavedRoutes(true);
  }, [routeStops, routeName, selectedRepId, startAddress, saveRoute]);

  // ── Load route ────────────────────────────────────────────────────────
  const handleLoadRoute = useCallback((route: SavedRoute) => {
    setRouteName(route.name);
    setSelectedRepId(route.repId ?? '');
    setStartAddress(route.startAddress);
    setStartCoords(null);
    // Restore stops with coords from cache
    const stops: RouteStop[] = route.stops.map(s => ({
      ...s,
      coords: geocodeCache.get(s.address) ?? undefined,
    }));
    setRouteStops(stops);
    setSavedRouteId(route.id);
    setShowSavedRoutes(false);
  }, []);

  // ── Recenter map ──────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!leafletMapRef.current) return;
    const location = effectiveStart;
    if (location) leafletMapRef.current.flyTo([location.lat, location.lng], 10, { duration: 1 });
    else leafletMapRef.current.flyTo([39.5, -98.35], 4, { duration: 1 });
  }, [effectiveStart]);

  // ── Google Maps URL ───────────────────────────────────────────────────
  const googleMapsUrl = useMemo(() => buildGoogleMapsUrl(startAddress, userLocation, routeStops), [startAddress, userLocation, routeStops]);

  const routeStats = useMemo(() => {
    const states = [...new Set(routeStops.map(s => s.state).filter(Boolean))];
    return { states, geocodedCount: routeStops.filter(s => s.coords ?? geocodeCache.get(s.address)).length };
  }, [routeStops, candidateCoords]);

  const repOptions = useMemo(() => users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name })), [users]);

  const geocodedCount = filteredCandidates.filter(c => c.coords ?? geocodeCache.get(c.address)).length;

  const activeFiltersCount = [search, stateFilter, zipFilter, typeFilter].filter(Boolean).length + (radiusMiles < 999 ? 1 : 0);

  return (
    <Page
      title="Route Planning"
      description="Build and optimize a day's sales route"
      fillHeight
      actions={
        <Button variant="primary" onClick={() => window.open(googleMapsUrl, '_blank')} disabled={routeStops.length === 0}>
          <ExternalLink className="w-4 h-4 mr-1.5" />
          Open in Google Maps
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0">

        {/* ── FilterBar — z-[100] wrapper wins over Leaflet stacking context ── */}
        <div className="relative z-[100] flex-shrink-0">
          <FilterBar
            className="mb-3"
            rightContent={
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{geocodedCount}/{filteredCandidates.length} on map</span>
                <FilterCount count={filteredCandidates.length} singular="stop" />
              </div>
            }
          >
            <SearchInput value={search} onChange={setSearch} placeholder="Search..." className="w-44" />
            <SelectFilter label="Type" value={typeFilter} onChange={v => setTypeFilter(v as '' | StopType)}
              options={[{ value: 'company', label: 'Companies' }, { value: 'lead', label: 'Leads' }, { value: 'deal', label: 'Deals' }]}
              icon={Filter} size="sm" className="w-32" />
            <SelectFilter label="State" value={stateFilter} onChange={setStateFilter}
              options={stateOptions} icon={MapPin} size="sm" className="w-28" />
            <div className="flex items-center gap-1">
              <input type="text" value={zipFilter} onChange={e => setZipFilter(e.target.value)}
                placeholder="ZIP..." maxLength={5}
                className="w-16 text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {effectiveStart && (
              <SelectFilter label="Radius" value={String(radiusMiles)} onChange={v => setRadiusMiles(Number(v))}
                options={[{ value: '5', label: '5 mi' }, { value: '10', label: '10 mi' }, { value: '25', label: '25 mi' }, { value: '50', label: '50 mi' }, { value: '100', label: '100 mi' }, { value: '999', label: 'Any dist.' }]}
                showAllOption={false} icon={Route} size="sm" className="w-28" />
            )}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStateFilter(''); setZipFilter(''); setTypeFilter(''); setRadiusMiles(999); }}>
                Clear {activeFiltersCount > 1 ? `(${activeFiltersCount})` : ''}
              </Button>
            )}
          </FilterBar>
        </div>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* LEFT: Map + Candidate list */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">

            {/* Map */}
            <div className="relative flex-shrink-0 h-56 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <div ref={mapContainerRef} className="w-full h-full" />
              {!leafletReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                  <div className="text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading map...</p>
                  </div>
                </div>
              )}
              {/* Recenter + legend overlay */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2 z-[400]">
                <button type="button" onClick={handleRecenter}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Recenter
                </button>
              </div>
              {/* Type legend overlay */}
              <div className="absolute top-2 left-2 flex items-center gap-2 z-[400]">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <div key={type} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs text-slate-600 dark:text-slate-300">
                      <Icon className={clsx('w-3 h-3', cfg.color)} />
                      {cfg.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Candidates header */}
            <div className="flex items-center justify-between mt-3 mb-2 flex-shrink-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                In Current View
              </p>
              <span className="text-xs text-slate-400">
                {visibleCandidates.length} of {filteredCandidates.length} visible
              </span>
            </div>

            {/* Candidate list */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {visibleCandidates.length === 0 ? (
                <div className="text-center py-10">
                  <MapPin className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {filteredCandidates.length === 0 ? 'No stops found' : 'None in current view'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {allCandidates.length === 0
                      ? 'Add address data to companies, leads, or deals'
                      : filteredCandidates.length === 0
                        ? 'Try adjusting your filters'
                        : 'Pan or zoom out to see stops'}
                  </p>
                </div>
              ) : (
                visibleCandidates.map(c => {
                  const candidateCoords2 = c.coords ?? geocodeCache.get(c.address);
                  const distanceMi = effectiveStart && candidateCoords2
                    ? haversineMiles(effectiveStart, candidateCoords2)
                    : null;
                  return (
                    <CandidateCard
                      key={`${c.type}:${c.sourceId}`}
                      candidate={{ ...c, coords: candidateCoords2 ?? undefined }}
                      isAdded={addedSourceIds.has(`${c.type}:${c.sourceId}`)}
                      distanceMi={distanceMi}
                      onAdd={() => addStop(c)}
                      onNavigate={() => navigate(getDetailPath(c.type, c.sourceId, c.slug))}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Route builder */}
          <div className="flex flex-col w-80 flex-shrink-0 min-h-0">

            {/* Config card */}
            <Card className="mb-3 flex-shrink-0">
              <CardContent className="p-3 space-y-3">

                {/* Route name */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Route Name</label>
                  <input type="text" value={routeName} onChange={e => setRouteName(e.target.value)}
                    placeholder={`Route — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Sales rep */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sales Rep</label>
                  <SelectFilter label="Select rep..." value={selectedRepId} onChange={setSelectedRepId}
                    options={repOptions} icon={User} size="sm" className="w-full" />
                </div>

                {/* Start point */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Starting From <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input type="text" value={startAddress} onChange={e => { setStartAddress(e.target.value); if (!e.target.value) { setStartCoords(null); setLocationError(''); } }}
                      onKeyDown={e => e.key === 'Enter' && handleGeocodeStart()}
                      placeholder="Enter address..."
                      className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={handleGeocodeStart} disabled={!startAddress.trim() || isGeocodingStart}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Geocode address">
                      {isGeocodingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={handleUseMyLocation} disabled={isLocating}
                    className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60 transition-colors">
                    {isLocating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Locating...</> : <><LocateFixed className="w-3.5 h-3.5" /> Use My Location</>}
                  </button>
                  {(userLocation && !startCoords) && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Navigation className="w-3 h-3" /> Using your current location</p>}
                  {startCoords && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address pinned on map</p>}
                  {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}
                </div>

                {/* Optimize + Save row */}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={handleOptimize}
                    disabled={routeStops.length < 2 || isOptimizing} isLoading={isOptimizing}>
                    {!isOptimizing && <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    Optimize
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" onClick={handleSaveRoute}
                    disabled={routeStops.length === 0}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {savedRouteId ? 'Update' : 'Save'}
                  </Button>
                </div>
                {optimizeError && <p className="text-xs text-red-500">{optimizeError}</p>}
              </CardContent>
            </Card>

            {/* Saved routes collapsible */}
            <div className="flex-shrink-0 mb-3">
              <button type="button" onClick={() => setShowSavedRoutes(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Saved Routes</span>
                  {savedRoutes.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {savedRoutes.length}
                    </span>
                  )}
                </div>
                <ChevronRight className={clsx('w-4 h-4 text-slate-400 transition-transform', showSavedRoutes && 'rotate-90')} />
              </button>

              {showSavedRoutes && (
                <div className="mt-1.5 space-y-1.5">
                  {savedRoutes.length === 0 ? (
                    <div className="text-center py-6 px-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                      <Clock className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                      <p className="text-xs text-slate-400 dark:text-slate-500">No saved routes yet</p>
                    </div>
                  ) : (
                    savedRoutes.map(route => (
                      <SavedRouteRow
                        key={route.id}
                        route={route}
                        onLoad={() => handleLoadRoute(route)}
                        onDelete={() => deleteRoute(route.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Route stats */}
            {routeStops.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 mb-3 flex-shrink-0">
                <Route className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''}
                    {routeStats.geocodedCount < routeStops.length && (
                      <span className="ml-1 text-amber-500">({routeStops.length - routeStats.geocodedCount} pending)</span>
                    )}
                    {savedRouteId && <span className="ml-1 text-blue-400 dark:text-blue-500">· Saved</span>}
                  </p>
                  {routeStats.states.length > 0 && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 truncate">{routeStats.states.join(' · ')}</p>
                  )}
                </div>
                <button type="button" onClick={clearRoute}
                  className="p-1 rounded text-blue-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Clear route">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Current stop list */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {routeStops.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Navigation className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No stops yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Click a map pin or use the list on the left
                  </p>
                </div>
              ) : (
                <>
                  {(startAddress.trim() || userLocation) && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Navigation className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">Start</p>
                        <p className="text-xs text-green-600 dark:text-green-500 truncate">
                          {startAddress.trim() ? startAddress : 'Current Location'}
                        </p>
                      </div>
                    </div>
                  )}
                  {routeStops.map((stop, idx) => (
                    <StopRow key={stop.id} stop={stop} index={idx} total={routeStops.length}
                      onRemove={() => removeStop(stop.id)}
                      onMoveUp={() => moveStop(idx, 'up')}
                      onMoveDown={() => moveStop(idx, 'down')} />
                  ))}
                </>
              )}
            </div>

            {/* Open in Maps */}
            {routeStops.length > 0 && (
              <div className="mt-3 flex-shrink-0">
                <Button variant="primary" className="w-full" onClick={() => window.open(googleMapsUrl, '_blank')}>
                  <MapIcon className="w-4 h-4 mr-1.5" />
                  Open Route in Google Maps
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                </Button>
                {routeStops.length > 9 && (
                  <p className="text-center text-xs text-amber-500 dark:text-amber-400 mt-1.5">
                    First 9 stops used (Google Maps limit)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

export default RoutesPage;