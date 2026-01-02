import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
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
      }),
      { name: 'sg-portal-users' }
    ),
    { name: 'UsersStore' }
  )
);