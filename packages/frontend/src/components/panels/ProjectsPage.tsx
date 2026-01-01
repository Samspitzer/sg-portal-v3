import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Filter,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, ConfirmModal } from '@/components/common';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useClients,
  type Project,
  type CreateProjectInput,
  type ProjectStatus,
  type ProjectPriority,
} from '@/services/api';
import { useToast } from '@/contexts';
// import { AIAssistant } from '@/components/ai/AIAssistant';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  on_hold: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  completed: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  cancelled: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'text-slate-500',
  medium: 'text-brand-500',
  high: 'text-warning-500',
  urgent: 'text-danger-500',
};

interface ProjectFormData {
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  budget: string;
}

const initialFormData: ProjectFormData = {
  name: '',
  clientId: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  startDate: '',
  endDate: '',
  budget: '',
};

function ProjectModal({
  isOpen,
  onClose,
  project,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSave: (data: ProjectFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ProjectFormData>(
    project
      ? {
          name: project.name,
          clientId: project.clientId,
          description: project.description || '',
          status: project.status,
          priority: project.priority,
          startDate: project.startDate?.split('T')[0] || '',
          endDate: project.endDate?.split('T')[0] || '',
          budget: project.budget?.toString() || '',
        }
      : initialFormData
  );

  const { data: clientsData } = useClients({ limit: 100, active: true });
  const clients = clientsData?.data?.clients || [];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {project ? 'Edit Project' : 'New Project'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Project Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as ProjectPriority })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                    bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <Input
                label="Budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />

              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {project ? 'Update Project' : 'Create Project'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProjectCard({ 
  project, 
  onEdit, 
  onDelete 
}: { 
  project: Project; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  
  const progress = project.budget && project.budget > 0 
    ? Math.round((project.spent / project.budget) * 100) 
    : 0;

  return (
    <Card hover className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {project.name}
              </h3>
              {project.clientName && (
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{project.clientName}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 
                  rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-danger-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status and Priority */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className={clsx(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            STATUS_COLORS[project.status]
          )}>
            {STATUS_LABELS[project.status]}
          </span>
          <span className={clsx('text-xs font-medium', PRIORITY_COLORS[project.priority])}>
            {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
          </span>
        </div>

        {/* Dates */}
        {(project.startDate || project.endDate) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>
              {project.startDate && new Date(project.startDate).toLocaleDateString()}
              {project.startDate && project.endDate && ' → '}
              {project.endDate && new Date(project.endDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Budget Progress */}
        {project.budget && project.budget > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500 dark:text-slate-400">Budget</span>
              <span className="font-medium text-slate-900 dark:text-white">
                ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  'h-full rounded-full transition-all',
                  progress > 100 ? 'bg-danger-500' : progress > 80 ? 'bg-warning-500' : 'bg-brand-500'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const toast = useToast();

  const { data, isLoading, error, refetch } = useProjects({
    page,
    limit: 12,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const handleSave = async (formData: ProjectFormData) => {
    const input: CreateProjectInput = {
      name: formData.name,
      clientId: formData.clientId,
      description: formData.description || undefined,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
    };

    try {
      if (editingProject) {
        await updateMutation.mutateAsync({ id: editingProject.id, data: input });
        toast.success('Updated', `${formData.name} has been updated`);
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Created', `${formData.name} has been created`);
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project:', err);
      toast.error('Error', 'Failed to save project');
    }
  };

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try {
        await deleteMutation.mutateAsync(projectToDelete.id);
        toast.success('Deleted', `${projectToDelete.name} has been removed`);
      } catch (err) {
        console.error('Failed to delete project:', err);
        toast.error('Error', 'Failed to delete project');
      }
      setProjectToDelete(null);
    }
  };

  const projects = data?.data?.projects || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <Page
      title="Projects"
      description="Track and manage all your active and completed projects."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
          >
            New Project
          </Button>
        </div>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3"
          >
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ProjectStatus | ''); setPage(1); }}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg 
                bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </motion.div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center gap-4 text-danger-600">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">Failed to load projects</p>
              <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      )}

      {/* Projects grid */}
      {!isLoading && !error && (
        <>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderKanban className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                  No projects found
                </h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {search || statusFilter ? 'Try different filters' : 'Get started by creating your first project'}
                </p>
                {!search && !statusFilter && (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProjectCard
                    project={project}
                    onEdit={() => { setEditingProject(project); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(project)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
        project={editingProject}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* AI Assistant - TODO: Enable when AI is set up
      <AIAssistant
        context={{ type: 'project', entityId: editingProject?.id }}
        entityName={editingProject?.name}
      />
      */}
    </Page>
  );
}