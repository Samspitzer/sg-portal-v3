// PATH: src/contexts/usersStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { generateUserSlug } from '@/utils/slugUtils';

export interface User {
  id: string;
  slug?: string; // URL-friendly identifier (e.g., "john-smith")
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  officeId?: string; // Optional - links to CompanyOffice.id (only required when company has 2+ offices)
  supervisorId?: string; // Optional - additional/override supervisor (can be alongside default)
  defaultSupervisorDisabled?: boolean; // If true, the default supervisor from position is disabled
  isActive: boolean;
  createdAt: string;
}

interface UsersState {
  users: User[];
}

interface UsersStore extends UsersState {
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserActive: (id: string) => void;
  getActiveUsers: () => User[];
  getUsersByOffice: (officeId: string) => User[];
  getUsersByPosition: (positionId: string) => User[];
  getUserById: (id: string) => User | undefined;
  migrateSlug: () => void;
}

export const useUsersStore = create<UsersStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Empty by default - no phantom data
        users: [],

        addUser: (userData) => {
          const newUser: User = {
            ...userData,
            id: `user-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ users: [...state.users, newUser] }));
        },

        updateUser: (id, data) => {
          set((state) => ({
            users: state.users.map((user) =>
              user.id === id ? { ...user, ...data } : user
            ),
          }));
        },

        deleteUser: (id) => {
          set((state) => ({
            users: state.users.filter((user) => user.id !== id),
          }));
        },

        toggleUserActive: (id) => {
          set((state) => ({
            users: state.users.map((user) =>
              user.id === id ? { ...user, isActive: !user.isActive } : user
            ),
          }));
        },

        getActiveUsers: () => {
          return get().users.filter((user) => user.isActive);
        },

        getUsersByOffice: (officeId) => {
          return get().users.filter((user) => user.officeId === officeId);
        },

        getUsersByPosition: (positionId) => {
          return get().users.filter((user) => user.positionId === positionId);
        },

        getUserById: (id) => {
          return get().users.find((user) => user.id === id);
        },

        // Migration: Generate slugs for users that don't have one
        migrateSlug: () => {
          const { users } = get();
          const needsMigration = users.some(u => !u.slug);
          
          if (needsMigration) {
            const updatedUsers = users.map(user => {
              if (user.slug) return user;
              const slug = generateUserSlug(user.name, users, user.id);
              return { ...user, slug };
            });
            set({ users: updatedUsers });
          }
        },
      }),
      { name: 'sg-portal-users' }
    ),
    { name: 'UsersStore' }
  )
);

// Auto-run migration on store load
useUsersStore.getState().migrateSlug();