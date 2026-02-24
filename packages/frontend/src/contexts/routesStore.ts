// ============================================================================
// Routes Store - Saved Sales Routes
// Location: src/contexts/routesStore.ts
//
// Persists named routes created on the Routes page so reps can reload them.
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type SavedStopType = 'company' | 'lead' | 'deal';

export interface SavedRouteStop {
  id: string;           // unique stop instance id
  sourceId: string;     // company/lead/deal id
  type: SavedStopType;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  subtitle?: string;
  // Note: coords are NOT saved — re-geocoded from session cache when loaded
}

export interface SavedRoute {
  id: string;
  name: string;
  repId?: string;
  startAddress: string;
  stops: SavedRouteStop[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Store
// ============================================================================

interface RoutesStore {
  savedRoutes: SavedRoute[];

  saveRoute: (route: Omit<SavedRoute, 'id' | 'createdAt' | 'updatedAt'>) => SavedRoute;
  updateRoute: (id: string, data: Partial<Omit<SavedRoute, 'id' | 'createdAt'>>) => void;
  deleteRoute: (id: string) => void;
  getRouteById: (id: string) => SavedRoute | undefined;
}

export const useRoutesStore = create<RoutesStore>()(
  devtools(
    persist(
      (set, get) => ({
        savedRoutes: [],

        saveRoute: (routeData) => {
          const now = new Date().toISOString();
          const newRoute: SavedRoute = {
            ...routeData,
            id: `route-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          };
          set(state => ({
            savedRoutes: [newRoute, ...state.savedRoutes],
          }));
          return newRoute;
        },

        updateRoute: (id, data) => {
          set(state => ({
            savedRoutes: state.savedRoutes.map(r =>
              r.id === id
                ? { ...r, ...data, updatedAt: new Date().toISOString() }
                : r
            ),
          }));
        },

        deleteRoute: (id) => {
          set(state => ({
            savedRoutes: state.savedRoutes.filter(r => r.id !== id),
          }));
        },

        getRouteById: (id) => {
          return get().savedRoutes.find(r => r.id === id);
        },
      }),
      {
        name: 'sg-portal-routes',
        version: 1,
      }
    ),
    { name: 'RoutesStore' }
  )
);