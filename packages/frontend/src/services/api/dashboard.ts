import { useQuery } from '@tanstack/react-query';
import { api } from './client';

// Dashboard Stats Types
export interface DashboardStats {
  revenue: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  projects: {
    active: number;
    completed: number;
    total: number;
  };
  estimates: {
    pending: number;
    approved: number;
    conversionRate: number;
  };
  invoices: {
    outstanding: number;
    overdue: number;
    collected: number;
  };
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
}

export interface QuickStats {
  activeClients: number;
  pendingEstimatesValue: number;
  overdueInvoices: {
    count: number;
    total: number;
  };
  tasksDueThisWeek: number;
}

// Dashboard Hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/dashboard/stats');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

export function useDashboardActivity(limit = 20) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const response = await api.get<Activity[]>('/dashboard/activity', { limit: String(limit) });
      return response.data || [];
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
  });
}

export function useDashboardTasks(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'tasks', limit],
    queryFn: async () => {
      const response = await api.get<Task[]>('/dashboard/tasks', { limit: String(limit) });
      return response.data || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useQuickStats() {
  return useQuery({
    queryKey: ['dashboard', 'quick-stats'],
    queryFn: async () => {
      const response = await api.get<QuickStats>('/dashboard/quick-stats');
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
