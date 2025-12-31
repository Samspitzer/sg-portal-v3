import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  spent: number;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  clientName?: string;
  managerName?: string;
}

export interface ProjectWithDetails extends Project {
  tasks: Task[];
  recentActivity: Activity[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: ProjectPriority;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeName?: string;
}

export interface Activity {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
  userName?: string;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  managerId?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  spent?: number;
}

export interface ProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  managerId?: string;
}

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ProjectsParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Get all projects with pagination and filtering
export function useProjects(params: ProjectsParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);
  if (params.priority) queryParams.set('priority', params.priority);
  if (params.clientId) queryParams.set('clientId', params.clientId);
  if (params.managerId) queryParams.set('managerId', params.managerId);

  const queryString = queryParams.toString();
  const url = `/projects${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => api.get<ProjectsResponse>(url),
    staleTime: 30 * 1000,
  });
}

// Get single project by ID
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.get<ProjectWithDetails>(`/projects/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      api.post<Project>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      api.patch<Project>(`/projects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Task mutations
export const taskKeys = {
  all: ['tasks'] as const,
  byProject: (projectId: string) => [...taskKeys.all, 'project', projectId] as const,
};

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      description?: string;
      priority?: ProjectPriority;
      assigneeId?: string;
      dueDate?: string;
    }) => api.post<Task>('/tasks', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      projectId: string;
      data: Partial<{
        title: string;
        description: string;
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        priority: ProjectPriority;
        assigneeId: string;
        dueDate: string;
      }>;
    }) => api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}
