export { api, type ApiResponse } from './client';
export * from './dashboard';
export * from './clients';
// Re-export projects without conflicting types (Activity, Task already exported from dashboard)
export { 
  type Project, 
  type ProjectWithDetails, 
  type ProjectsResponse, 
  type CreateProjectInput, 
  type UpdateProjectInput, 
  type ProjectsParams,
  type ProjectStatus,
  type ProjectPriority,
  projectKeys,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  taskKeys,
  useCreateTask,
  useUpdateTask,
} from './projects';
export * from './estimates';
export * from './invoices';
export * from './ai';
