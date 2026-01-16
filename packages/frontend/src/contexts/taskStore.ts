// PATH: src/contexts/taskStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export type TaskType = 'call' | 'meeting' | 'task' | 'deadline' | 'email' | 'follow_up';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LinkedEntityType = 'contact' | 'project' | 'estimate' | 'invoice' | 'company' | 'deal';

export interface LinkedEntity {
  type: LinkedEntityType;
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type?: TaskType;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  assignedUserId: string;
  assignedUserName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  linkedEntities: LinkedEntity[];
  primaryEntityType?: LinkedEntityType;
  primaryEntityId?: string;
  primaryEntityName?: string;
  notes?: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  assignedUserId: string;
  assignedUserName?: string;
  linkedEntities?: LinkedEntity[];
  notes?: string;
}

export interface TaskFilters {
  search: string;
  statuses: TaskStatus[];
  assignedUserIds: string[];
  timeFilter: 'all' | 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'next-week';
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

interface TaskActions {
  fetchTasks: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: Partial<TaskInput>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  reassignTasksByEntity: (entityType: LinkedEntityType, entityId: string, newUserId: string, newUserName: string) => Promise<void>;
}

export const useTaskStore = create<TaskState & TaskActions>()(
  devtools(
    persist(
      (set, get) => ({
        tasks: [],
        isLoading: false,
        error: null,

        fetchTasks: async () => {
          set({ isLoading: true, error: null });
          try {
            // TODO: Replace with API call
            // const response = await api.get('/tasks');
            // set({ tasks: response.data, isLoading: false });
            set({ isLoading: false });
          } catch (error) {
            set({ error: 'Failed to fetch tasks', isLoading: false });
          }
        },

        createTask: async (input: TaskInput) => {
          const primaryEntity = input.linkedEntities?.[0];
          const newTask: Task = {
            id: `task-${Date.now()}`,
            title: input.title,
            description: input.description,
            type: input.type,
            priority: input.priority,
            dueDate: input.dueDate,
            dueTime: input.dueTime,
            status: 'todo',
            assignedUserId: input.assignedUserId,
            assignedUserName: input.assignedUserName || '',
            createdById: '', // Set from auth context in real implementation
            createdByName: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            linkedEntities: input.linkedEntities || [],
            primaryEntityType: primaryEntity?.type,
            primaryEntityId: primaryEntity?.id,
            primaryEntityName: primaryEntity?.name,
            notes: input.notes,
          };
          set(state => ({ tasks: [...state.tasks, newTask] }));
          return newTask;
        },

        updateTask: async (id: string, input: Partial<TaskInput>) => {
          const task = get().tasks.find(t => t.id === id);
          if (!task) throw new Error('Task not found');
          
          const primaryEntity = input.linkedEntities?.[0] || task.linkedEntities?.[0];
          const updated: Task = {
            ...task,
            ...input,
            linkedEntities: input.linkedEntities ?? task.linkedEntities,
            primaryEntityType: primaryEntity?.type,
            primaryEntityId: primaryEntity?.id,
            primaryEntityName: primaryEntity?.name,
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({ tasks: state.tasks.map(t => t.id === id ? updated : t) }));
          return updated;
        },

        deleteTask: async (id: string) => {
          set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
        },

        completeTask: async (id: string) => {
          set(state => ({
            tasks: state.tasks.map(t => t.id === id 
              ? { ...t, status: 'completed' as TaskStatus, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } 
              : t
            )
          }));
        },

        reopenTask: async (id: string) => {
          set(state => ({
            tasks: state.tasks.map(t => t.id === id 
              ? { ...t, status: 'todo' as TaskStatus, completedAt: undefined, updatedAt: new Date().toISOString() } 
              : t
            )
          }));
        },

        // Reassign all tasks linked to an entity when that entity changes owner
        // Example: Contact reassigned to new sales rep -> their tasks follow
        reassignTasksByEntity: async (entityType, entityId, newUserId, newUserName) => {
          set(state => ({
            tasks: state.tasks.map(t => 
              t.linkedEntities.some(e => e.type === entityType && e.id === entityId)
                ? { ...t, assignedUserId: newUserId, assignedUserName: newUserName, updatedAt: new Date().toISOString() }
                : t
            )
          }));
        },
      }),
      { name: 'task-store' }
    ),
    { name: 'TaskStore' }
  )
);

export default useTaskStore;