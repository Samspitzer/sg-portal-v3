import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, AuthState } from '@sg-portal/shared';
import { authService } from '@/services/auth';

interface AuthStore extends AuthState {
  // Additional state
  token: string | null; // Internal API token
  azureToken: string | null; // Azure AD token
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: true,
        accessToken: null,
        token: null,
        azureToken: null,
        error: null,

        // Actions
        login: async () => {
          set({ isLoading: true, error: null });
          
          try {
            const account = await authService.login();
            
            if (account) {
              // Get user profile from Microsoft Graph
              const profile = await authService.getUserProfile();
              const photo = await authService.getUserPhoto();
              const azureToken = await authService.getIdToken();

              if (profile) {
                const user: User = {
                  id: profile.id ?? account.localAccountId,
                  email: profile.email ?? account.username,
                  displayName: profile.displayName ?? account.name ?? 'User',
                  firstName: profile.firstName ?? '',
                  lastName: profile.lastName ?? '',
                  avatarUrl: photo ?? undefined,
                  role: 'viewer', // Default role, will be updated from backend
                  permissions: ['dashboard:view'],
                  department: profile.department,
                  jobTitle: profile.jobTitle,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                set({
                  user,
                  isAuthenticated: true,
                  accessToken: azureToken,
                  azureToken,
                  isLoading: false,
                });

                // Sync with backend to get internal token and updated user
                try {
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${azureToken}`,
                    },
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                      set({
                        token: data.data.token,
                        user: {
                          ...user,
                          id: data.data.user.id,
                          role: data.data.user.role,
                          permissions: data.data.user.permissions,
                        },
                      });
                    }
                  }
                } catch {
                  // Backend sync failed, continue with Azure auth only
                  console.warn('Backend sync failed, using Azure auth only');
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          
          try {
            await authService.logout();
            set({
              user: null,
              isAuthenticated: false,
              accessToken: null,
              token: null,
              azureToken: null,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Logout failed';
            set({ error: message, isLoading: false });
          }
        },

        checkAuth: async () => {
          const account = authService.getActiveAccount();
          
          if (!account) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          try {
            // Refresh token and profile
            const azureToken = await authService.getAccessToken();
            const profile = await authService.getUserProfile();
            const photo = await authService.getUserPhoto();

            if (profile && azureToken) {
              const currentUser = get().user;
              
              const user: User = {
                id: profile.id ?? account.localAccountId,
                email: profile.email ?? account.username,
                displayName: profile.displayName ?? account.name ?? 'User',
                firstName: profile.firstName ?? '',
                lastName: profile.lastName ?? '',
                avatarUrl: photo ?? currentUser?.avatarUrl,
                role: currentUser?.role ?? 'viewer',
                permissions: currentUser?.permissions ?? ['dashboard:view'],
                department: profile.department,
                jobTitle: profile.jobTitle,
                createdAt: currentUser?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              set({
                user,
                isAuthenticated: true,
                accessToken: azureToken,
                azureToken,
                isLoading: false,
              });
            }
          } catch {
            // Silent failure for auth check
            set({ isLoading: false });
          }
        },

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setToken: (token) => set({ token }),
        clearAuth: () => set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          token: null,
          azureToken: null,
          error: null,
        }),
      }),
      {
        name: 'sg-portal-auth',
        partialize: (state) => ({
          // Only persist minimal auth state
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          token: state.token,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
