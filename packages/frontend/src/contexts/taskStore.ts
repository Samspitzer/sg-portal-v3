import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Task Types - now managed by taskTypesStore, but we keep string type for flexibility
export type TaskType = string;

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Updated: Added 'lead' for sales CRM integration
export type LinkedEntityType = 'contact' | 'company' | 'project' | 'estimate' | 'invoice' | 'lead' | 'deal';

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
  // Separate linked contact and item
  linkedContact: LinkedEntity | null;
  linkedItem: LinkedEntity | null;
  // Primary entity for display (derived from linkedContact or linkedItem)
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
  linkedContact?: LinkedEntity | null;
  linkedItem?: LinkedEntity | null;
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
  // Helper to get tasks linked to leads or deals (for Activities page)
  getTasksByEntityType: (entityTypes: LinkedEntityType[]) => Task[];
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
          // Determine primary entity (prefer contact over item for display)
          const primaryEntity = input.linkedContact || input.linkedItem;
          
          const newTask: Task = {
            id: `task-${Date.now()}`,
            title: input.title,
            description: input.description,
            type: input.type,
            status: 'todo',
            priority: input.priority,
            dueDate: input.dueDate,
            dueTime: input.dueTime,
            assignedUserId: input.assignedUserId,
            assignedUserName: input.assignedUserName || '',
            createdById: input.assignedUserId, // TODO: Use actual current user
            createdByName: input.assignedUserName || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            linkedContact: input.linkedContact || null,
            linkedItem: input.linkedItem || null,
            primaryEntityType: primaryEntity?.type,
            primaryEntityId: primaryEntity?.id,
            primaryEntityName: primaryEntity?.name,
            notes: input.notes,
          };

          set(state => ({ tasks: [...state.tasks, newTask] }));
          return newTask;
        },

        updateTask: async (id: string, input: Partial<TaskInput>) => {
          const { tasks } = get();
          const existingTask = tasks.find(t => t.id === id);
          if (!existingTask) throw new Error('Task not found');

          // Recalculate primary entity if links changed
          const linkedContact = input.linkedContact !== undefined ? input.linkedContact : existingTask.linkedContact;
          const linkedItem = input.linkedItem !== undefined ? input.linkedItem : existingTask.linkedItem;
          const primaryEntity = linkedContact || linkedItem;

          const updatedTask: Task = {
            ...existingTask,
            ...input,
            linkedContact,
            linkedItem,
            primaryEntityType: primaryEntity?.type,
            primaryEntityId: primaryEntity?.id,
            primaryEntityName: primaryEntity?.name,
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
          }));

          return updatedTask;
        },

        deleteTask: async (id: string) => {
          set(state => ({
            tasks: state.tasks.filter(t => t.id !== id),
          }));
        },

        completeTask: async (id: string) => {
          set(state => ({
            tasks: state.tasks.map(t =>
              t.id === id
                ? { ...t, status: 'completed' as TaskStatus, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                : t
            ),
          }));
        },

        reopenTask: async (id: string) => {
          set(state => ({
            tasks: state.tasks.map(t =>
              t.id === id
                ? { ...t, status: 'todo' as TaskStatus, completedAt: undefined, updatedAt: new Date().toISOString() }
                : t
            ),
          }));
        },

        // When a contact/company is reassigned to a new user, reassign all their tasks too
        reassignTasksByEntity: async (entityType: LinkedEntityType, entityId: string, newUserId: string, newUserName: string) => {
          set(state => ({
            tasks: state.tasks.map(task => {
              // Check if this task is linked to the entity being reassigned
              const isLinkedContact = task.linkedContact?.type === entityType && task.linkedContact?.id === entityId;
              const isLinkedItem = task.linkedItem?.type === entityType && task.linkedItem?.id === entityId;
              
              if (isLinkedContact || isLinkedItem) {
                return {
                  ...task,
                  assignedUserId: newUserId,
                  assignedUserName: newUserName,
                  updatedAt: new Date().toISOString(),
                };
              }
              return task;
            }),
          }));
        },

        // Get tasks linked to specific entity types (e.g., ['lead', 'deal'] for Activities page)
        getTasksByEntityType: (entityTypes: LinkedEntityType[]) => {
          const { tasks } = get();
          return tasks.filter(task => {
            const linkedContactType = task.linkedContact?.type;
            const linkedItemType = task.linkedItem?.type;
            return (
              (linkedContactType && entityTypes.includes(linkedContactType)) ||
              (linkedItemType && entityTypes.includes(linkedItemType))
            );
          });
        },
      }),
      {
        name: 'task-storage',
      }
    )
  )
);

export default useTaskStore;
