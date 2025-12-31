import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { PanelId } from '@sg-portal/shared';

interface UIStore {
  // Sidebar state
  sidebarExpanded: boolean;
  sidebarPinned: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarPinned: (pinned: boolean) => void;

  // Active panel
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Modal state
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Search
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;

  // Mobile
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // Sidebar
        sidebarExpanded: true,
        sidebarPinned: true,
        toggleSidebar: () =>
          set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
        setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
        setSidebarPinned: (pinned) => set({ sidebarPinned: pinned }),

        // Active panel
        activePanel: 'dashboard',
        setActivePanel: (panel) => set({ activePanel: panel }),

        // Theme
        theme: 'system',
        setTheme: (theme) => {
          set({ theme });
          
          // Apply theme to document
          const root = document.documentElement;
          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
          } else {
            root.classList.toggle('dark', theme === 'dark');
          }
        },

        // Modal
        activeModal: null,
        modalData: null,
        openModal: (modalId, data) =>
          set({ activeModal: modalId, modalData: data ?? null }),
        closeModal: () => set({ activeModal: null, modalData: null }),

        // Command palette
        commandPaletteOpen: false,
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        toggleCommandPalette: () =>
          set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

        // Search
        globalSearchQuery: '',
        setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

        // Mobile
        isMobileMenuOpen: false,
        setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      }),
      {
        name: 'sg-portal-ui',
        partialize: (state) => ({
          sidebarPinned: state.sidebarPinned,
          theme: state.theme,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

/**
 * Initialize theme on app load
 */
export function initializeTheme() {
  const stored = localStorage.getItem('sg-portal-ui');
  let theme: 'light' | 'dark' | 'system' = 'system';

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      theme = parsed.state?.theme ?? 'system';
    } catch {
      // Ignore parse errors
    }
  }

  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useUIStore.getState().theme;
    if (currentTheme === 'system') {
      root.classList.toggle('dark', e.matches);
    }
  });
}
