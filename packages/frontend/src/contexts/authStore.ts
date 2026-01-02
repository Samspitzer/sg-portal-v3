import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@sg-portal/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

// Default admin user for development
const devAdminUser: User = {
  id: 'dev-admin-001',
  email: 'admin@sgbsny.com',
  displayName: 'Admin User',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  permissions: [
    'dashboard:view',
    'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
    'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
    'estimating:view', 'estimating:create', 'estimating:edit', 'estimating:delete', 'estimating:approve',
    'accounting:view', 'accounting:create', 'accounting:edit', 'accounting:delete', 'accounting:payments',
    'admin:view', 'admin:users', 'admin:roles', 'admin:departments', 'admin:company',
    'developer:view',
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        login: async () => {
          set({ isLoading: true, error: null });
          
          // Simulate a small delay for realism
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          set({
            user: devAdminUser,
            isAuthenticated: true,
            isLoading: false,
          });
        },

        logout: async () => {
          set({ isLoading: true });
          
          // Simulate a small delay
          await new Promise((resolve) => setTimeout(resolve, 300));
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        },

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearAuth: () => set({
          user: null,
          isAuthenticated: false,
          error: null,
        }),
      }),
      {
        name: 'sg-portal-auth',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);