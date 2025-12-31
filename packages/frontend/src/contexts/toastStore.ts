import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Toast } from '@sg-portal/shared';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const DEFAULT_DURATION = 5000;

let toastId = 0;
const generateId = () => `toast-${++toastId}`;

export const useToastStore = create<ToastStore>()(
  devtools(
    (set, get) => ({
      toasts: [],

      addToast: (toast) => {
        const id = generateId();
        const newToast: Toast = {
          id,
          duration: DEFAULT_DURATION,
          dismissible: true,
          ...toast,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }

        return id;
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toasts: [] });
      },

      success: (title, message) => {
        return get().addToast({ type: 'success', title, message });
      },

      error: (title, message) => {
        return get().addToast({ type: 'error', title, message, duration: 8000 });
      },

      warning: (title, message) => {
        return get().addToast({ type: 'warning', title, message });
      },

      info: (title, message) => {
        return get().addToast({ type: 'info', title, message });
      },
    }),
    { name: 'ToastStore' }
  )
);

/**
 * Hook for easy toast usage
 */
export function useToast() {
  const { success, error, warning, info, removeToast } = useToastStore();
  
  return {
    success,
    error,
    warning,
    info,
    dismiss: removeToast,
  };
}
