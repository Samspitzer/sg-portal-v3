import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Position {
  id: string;
  name: string;
  departmentId: string;
}

export interface Department {
  id: string;
  name: string;
  positions: Position[];
}

interface DepartmentsStore {
  departments: Department[];
  addDepartment: (name: string) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => void;
  addPosition: (departmentId: string, name: string) => void;
  updatePosition: (positionId: string, name: string) => void;
  deletePosition: (positionId: string) => void;
  getPositionsByDepartment: (departmentId: string) => Position[];
  resetToDefaults: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultDepartments: Department[] = [
  {
    id: 'dept-executive',
    name: 'Executive',
    positions: [
      { id: 'pos-clevel', name: 'C-level Executive', departmentId: 'dept-executive' },
      { id: 'pos-office-mgr', name: 'Office Manager', departmentId: 'dept-executive' },
    ],
  },
  {
    id: 'dept-sales',
    name: 'Sales',
    positions: [
      { id: 'pos-sales-mgr', name: 'Sales Manager', departmentId: 'dept-sales' },
      { id: 'pos-sales-exec', name: 'Sales Executive', departmentId: 'dept-sales' },
    ],
  },
  {
    id: 'dept-finance',
    name: 'Finance',
    positions: [
      { id: 'pos-finance-mgr', name: 'Finance Manager', departmentId: 'dept-finance' },
      { id: 'pos-bookkeeper', name: 'Bookkeeper', departmentId: 'dept-finance' },
    ],
  },
  {
    id: 'dept-pm',
    name: 'Project Management',
    positions: [
      { id: 'pos-pm', name: 'Project Manager', departmentId: 'dept-pm' },
      { id: 'pos-apm', name: 'Assistant Project Manager', departmentId: 'dept-pm' },
      { id: 'pos-site-super', name: 'Site Supervisor', departmentId: 'dept-pm' },
    ],
  },
  {
    id: 'dept-estimating',
    name: 'Estimating',
    positions: [
      { id: 'pos-est-mgr', name: 'Estimating Manager', departmentId: 'dept-estimating' },
      { id: 'pos-estimator', name: 'Estimator', departmentId: 'dept-estimating' },
    ],
  },
];

export const useDepartmentsStore = create<DepartmentsStore>()(
  persist(
    (set, get) => ({
      departments: defaultDepartments,

      addDepartment: (name) => {
        const newDept: Department = {
          id: `dept-${generateId()}`,
          name,
          positions: [],
        };
        set((state) => ({
          departments: [...state.departments, newDept],
        }));
      },

      updateDepartment: (id, name) => {
        set((state) => ({
          departments: state.departments.map((dept) =>
            dept.id === id ? { ...dept, name } : dept
          ),
        }));
      },

      deleteDepartment: (id) => {
        set((state) => ({
          departments: state.departments.filter((dept) => dept.id !== id),
        }));
      },

      addPosition: (departmentId, name) => {
        const newPosition: Position = {
          id: `pos-${generateId()}`,
          name,
          departmentId,
        };
        set((state) => ({
          departments: state.departments.map((dept) =>
            dept.id === departmentId
              ? { ...dept, positions: [...dept.positions, newPosition] }
              : dept
          ),
        }));
      },

      updatePosition: (positionId, name) => {
        set((state) => ({
          departments: state.departments.map((dept) => ({
            ...dept,
            positions: dept.positions.map((pos) =>
              pos.id === positionId ? { ...pos, name } : pos
            ),
          })),
        }));
      },

      deletePosition: (positionId) => {
        set((state) => ({
          departments: state.departments.map((dept) => ({
            ...dept,
            positions: dept.positions.filter((pos) => pos.id !== positionId),
          })),
        }));
      },

      getPositionsByDepartment: (departmentId) => {
        const dept = get().departments.find((d) => d.id === departmentId);
        return dept?.positions || [];
      },

      resetToDefaults: () => {
        set({ departments: defaultDepartments });
      },
    }),
    {
      name: 'sg-portal-departments',
    }
  )
);