import { create } from 'zustand';

interface NavigationGuardState {
  hasUnsavedChanges: boolean;
  isBlocked: boolean;
  pendingPath: string | null;
  onSave: (() => void) | null;
  onDiscard: (() => void) | null;
}

interface NavigationGuardStore extends NavigationGuardState {
  setGuard: (hasChanges: boolean, onSave?: () => void, onDiscard?: () => void) => void;
  clearGuard: () => void;
  requestNavigation: (path: string) => boolean;
  showModal: (path: string) => void;
  hideModal: () => void;
  getPendingPath: () => string | null;
}

export const useNavigationGuardStore = create<NavigationGuardStore>((set, get) => ({
  hasUnsavedChanges: false,
  isBlocked: false,
  pendingPath: null,
  onSave: null,
  onDiscard: null,

  setGuard: (hasChanges, onSave, onDiscard) => {
    set({
      hasUnsavedChanges: hasChanges,
      onSave: onSave || null,
      onDiscard: onDiscard || null,
    });
  },

  clearGuard: () => {
    set({
      hasUnsavedChanges: false,
      isBlocked: false,
      pendingPath: null,
      onSave: null,
      onDiscard: null,
    });
  },

  requestNavigation: (path) => {
    const { hasUnsavedChanges } = get();
    if (hasUnsavedChanges) {
      set({ isBlocked: true, pendingPath: path });
      return false; // Block navigation
    }
    return true; // Allow navigation
  },

  showModal: (path) => {
    set({ isBlocked: true, pendingPath: path });
  },

  hideModal: () => {
    set({ isBlocked: false, pendingPath: null });
  },

  getPendingPath: () => get().pendingPath,
}));