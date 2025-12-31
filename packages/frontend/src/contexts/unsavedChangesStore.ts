import { create } from 'zustand';

interface UnsavedChangesState {
  hasUnsavedChanges: boolean;
  showModal: boolean;
  pendingNavigation: string | null;
  onSave: (() => void) | null;
  onDiscard: (() => void) | null;
  
  setHasUnsavedChanges: (value: boolean) => void;
  showUnsavedModal: (destination: string) => void;
  hideUnsavedModal: () => void;
  setCallbacks: (onSave: () => void, onDiscard: () => void) => void;
  reset: () => void;
}

export const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  hasUnsavedChanges: false,
  showModal: false,
  pendingNavigation: null,
  onSave: null,
  onDiscard: null,
  
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
  
  showUnsavedModal: (destination) => set({ 
    showModal: true, 
    pendingNavigation: destination 
  }),
  
  hideUnsavedModal: () => set({ 
    showModal: false, 
    pendingNavigation: null 
  }),
  
  setCallbacks: (onSave, onDiscard) => set({ onSave, onDiscard }),
  
  reset: () => set({
    hasUnsavedChanges: false,
    showModal: false,
    pendingNavigation: null,
    onSave: null,
    onDiscard: null,
  }),
}));