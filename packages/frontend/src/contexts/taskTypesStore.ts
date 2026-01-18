import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Available icons for task types
export const TASK_TYPE_ICONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'users', label: 'Meeting' },
  { value: 'check-square', label: 'Task' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'clock', label: 'Clock' },
  { value: 'mail', label: 'Email' },
  { value: 'message-circle', label: 'Message' },
  { value: 'file-text', label: 'Document' },
  { value: 'flag', label: 'Flag' },
  { value: 'alert-circle', label: 'Alert' },
  { value: 'star', label: 'Star' },
  { value: 'target', label: 'Target' },
  { value: 'send', label: 'Send' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'bell', label: 'Bell' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'edit', label: 'Edit' },
  { value: 'thumbs-up', label: 'Thumbs Up' },
] as const;

export type TaskTypeIconName = typeof TASK_TYPE_ICONS[number]['value'];

export interface TaskTypeConfig {
  id: string;
  value: string; // The value used in tasks (e.g., 'call', 'meeting')
  label: string; // Display label (e.g., 'Call', 'Meeting')
  icon: TaskTypeIconName;
  color?: string; // Optional color
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskTypesState {
  taskTypes: TaskTypeConfig[];
  isLoading: boolean;
  
  // Actions
  fetchTaskTypes: () => Promise<void>;
  createTaskType: (data: Omit<TaskTypeConfig, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Promise<TaskTypeConfig>;
  updateTaskType: (id: string, data: Partial<TaskTypeConfig>) => Promise<void>;
  deleteTaskType: (id: string) => Promise<void>;
  reorderTaskTypes: (orderedIds: string[]) => Promise<void>;
  getActiveTaskTypes: () => TaskTypeConfig[];
}

// Default task types
const DEFAULT_TASK_TYPES: TaskTypeConfig[] = [
  { id: '1', value: 'call', label: 'Call', icon: 'phone', isActive: true, sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', value: 'meeting', label: 'Meeting', icon: 'users', isActive: true, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', value: 'task', label: 'Task', icon: 'check-square', isActive: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', value: 'deadline', label: 'Deadline', icon: 'flag', isActive: true, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', value: 'email', label: 'Email', icon: 'mail', isActive: true, sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '6', value: 'follow_up', label: 'Follow Up', icon: 'repeat', isActive: true, sortOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const useTaskTypesStore = create<TaskTypesState>()(
  persist(
    (set, get) => ({
      taskTypes: DEFAULT_TASK_TYPES,
      isLoading: false,

      fetchTaskTypes: async () => {
        set({ isLoading: true });
        // Simulate API call - in production, fetch from backend
        await new Promise(resolve => setTimeout(resolve, 100));
        set({ isLoading: false });
      },

      createTaskType: async (data) => {
        const { taskTypes } = get();
        const newTaskType: TaskTypeConfig = {
          ...data,
          id: `tt-${Date.now()}`,
          sortOrder: taskTypes.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ taskTypes: [...taskTypes, newTaskType] });
        return newTaskType;
      },

      updateTaskType: async (id, data) => {
        set(state => ({
          taskTypes: state.taskTypes.map(tt =>
            tt.id === id
              ? { ...tt, ...data, updatedAt: new Date().toISOString() }
              : tt
          ),
        }));
      },

      deleteTaskType: async (id) => {
        set(state => ({
          taskTypes: state.taskTypes.filter(tt => tt.id !== id),
        }));
      },

      reorderTaskTypes: async (orderedIds) => {
        set(state => ({
          taskTypes: orderedIds
            .map((id, index) => {
              const tt = state.taskTypes.find(t => t.id === id);
              return tt ? { ...tt, sortOrder: index } : null;
            })
            .filter((tt): tt is TaskTypeConfig => tt !== null),
        }));
      },

      getActiveTaskTypes: () => {
        return get()
          .taskTypes
          .filter(tt => tt.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
    }),
    {
      name: 'task-types-storage',
    }
  )
);

export default useTaskTypesStore;