import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Position levels (1 = highest/department head, 5 = lowest) - kept for visual grouping
export type PositionLevel = 1 | 2 | 3 | 4 | 5;

export interface Position {
  id: string;
  name: string;
  departmentId: string;
  level: PositionLevel; // For visual grouping/sorting
  reportsToPositionId: string | null; // Direct reporting - null means dept head (escalates to parent dept)
  order: number; // For sorting within same level
}

export interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null; // null = top-level department
  positions: Position[];
  order: number; // For display sorting
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sales Field Types
// ============================================================================

export interface SalesStage {
  id: string;
  name: string;
  color: string; // Hex color for Kanban column header
  order: number;
}

export interface SalesLabel {
  id: string;
  name: string;
  color: string; // Hex color for label badge
  order: number;
}

export interface SalesSource {
  id: string;
  name: string;
  order: number;
}

// ============================================================================
// State Interface
// ============================================================================

interface FieldsState {
  departments: Department[];
  contactRoles: string[];
  // Sales fields
  leadStages: SalesStage[];
  dealStages: SalesStage[];
  leadLabels: SalesLabel[];
  leadSources: SalesSource[];
}

// ============================================================================
// Store Interface
// ============================================================================

interface FieldsStore extends FieldsState {
  // Department actions
  addDepartment: (name: string, parentDepartmentId?: string | null) => void;
  updateDepartment: (id: string, data: Partial<Pick<Department, 'name' | 'parentDepartmentId'>>) => void;
  deleteDepartment: (id: string) => void;
  reorderDepartments: (departmentIds: string[]) => void;
  
  // Position actions
  addPosition: (departmentId: string, name: string, reportsToPositionId: string | null) => void;
  updatePosition: (positionId: string, data: { name?: string; reportsToPositionId?: string | null }) => void;
  deletePosition: (positionId: string) => void;
  
  // Contact role actions
  addContactRole: (role: string) => void;
  updateContactRole: (oldRole: string, newRole: string) => void;
  deleteContactRole: (role: string) => void;
  reorderContactRoles: (roles: string[]) => void;
  
  // Lead stage actions
  addLeadStage: (name: string, color?: string) => void;
  updateLeadStage: (id: string, data: Partial<Pick<SalesStage, 'name' | 'color'>>) => void;
  deleteLeadStage: (id: string) => void;
  reorderLeadStages: (stageIds: string[]) => void;
  
  // Deal stage actions
  addDealStage: (name: string, color?: string) => void;
  updateDealStage: (id: string, data: Partial<Pick<SalesStage, 'name' | 'color'>>) => void;
  deleteDealStage: (id: string) => void;
  reorderDealStages: (stageIds: string[]) => void;
  
  // Lead label actions
  addLeadLabel: (name: string, color?: string) => void;
  updateLeadLabel: (id: string, data: Partial<Pick<SalesLabel, 'name' | 'color'>>) => void;
  deleteLeadLabel: (id: string) => void;
  reorderLeadLabels: (labelIds: string[]) => void;
  
  // Lead source actions
  addLeadSource: (name: string) => void;
  updateLeadSource: (id: string, name: string) => void;
  deleteLeadSource: (id: string) => void;
  reorderLeadSources: (sourceIds: string[]) => void;
  
  // Helper functions
  getPositionsByDepartment: (departmentId: string) => Position[];
  getPositionById: (positionId: string) => Position | null;
  getDepartmentsByParent: (parentId: string | null) => Department[];
  getParentDepartment: (departmentId: string) => Department | null;
  getDepartmentById: (departmentId: string) => Department | null;
  getReportingChain: (positionId: string) => Position[];
  getDirectReports: (positionId: string) => Position[];
  getDepartmentHeads: (departmentId: string) => Position[];
  
  // Reset
  resetToDefaults: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 11);

// Helper to calculate level based on reporting chain
function calculateLevel(positionId: string | null, positions: Position[], visited = new Set<string>()): PositionLevel {
  if (!positionId) return 1;
  if (visited.has(positionId)) return 1; // Prevent infinite loops
  
  const position = positions.find(p => p.id === positionId);
  if (!position || !position.reportsToPositionId) return 1;
  
  visited.add(positionId);
  const parentLevel = calculateLevel(position.reportsToPositionId, positions, visited);
  return Math.min(5, parentLevel + 1) as PositionLevel;
}

// ============================================================================
// Default Values
// ============================================================================

// Default contact roles
const defaultContactRoles: string[] = [
  'Owner',
  'Project Executive',
  'Project Manager',
  'Site Super',
  'Estimating',
  'VP of Construction',
  'Accounts Payable',
];

// Default lead stages
const defaultLeadStages: SalesStage[] = [
  { id: 'lead-stage-1', name: 'Job Site Lead', color: '#64748b', order: 0 },
  { id: 'lead-stage-2', name: 'Company Lead', color: '#3b82f6', order: 1 },
];

// Default deal stages
const defaultDealStages: SalesStage[] = [
  { id: 'deal-stage-1', name: 'By Estimation', color: '#8b5cf6', order: 0 },
  { id: 'deal-stage-2', name: 'Proposal Sent', color: '#f59e0b', order: 1 },
  { id: 'deal-stage-3', name: 'Negotiations', color: '#f97316', order: 2 },
];

// Default lead labels (temperature)
const defaultLeadLabels: SalesLabel[] = [
  { id: 'label-cold', name: 'Cold', color: '#3b82f6', order: 0 },
  { id: 'label-warm', name: 'Warm', color: '#f59e0b', order: 1 },
  { id: 'label-hot', name: 'Hot', color: '#ef4444', order: 2 },
];

// Default lead sources
const defaultLeadSources: SalesSource[] = [
  { id: 'source-1', name: 'Referral', order: 0 },
  { id: 'source-2', name: 'Website', order: 1 },
  { id: 'source-3', name: 'Cold Call', order: 2 },
  { id: 'source-4', name: 'Trade Show', order: 3 },
  { id: 'source-5', name: 'Social Media', order: 4 },
  { id: 'source-6', name: 'Email Campaign', order: 5 },
  { id: 'source-7', name: 'Other', order: 6 },
];

// Default departments with direct reporting structure
const defaultDepartments: Department[] = [
  {
    id: 'dept-executive',
    name: 'Executive',
    parentDepartmentId: null,
    positions: [
      { id: 'pos-ceo', name: 'CEO', departmentId: 'dept-executive', level: 1, reportsToPositionId: null, order: 0 },
      { id: 'pos-coo', name: 'COO', departmentId: 'dept-executive', level: 1, reportsToPositionId: null, order: 1 },
      { id: 'pos-cfo', name: 'CFO', departmentId: 'dept-executive', level: 1, reportsToPositionId: null, order: 2 },
      { id: 'pos-office-mgr', name: 'Office Manager', departmentId: 'dept-executive', level: 2, reportsToPositionId: 'pos-ceo', order: 3 },
    ],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dept-sales',
    name: 'Sales',
    parentDepartmentId: 'dept-executive',
    positions: [
      { id: 'pos-sales-vp', name: 'VP of Sales', departmentId: 'dept-sales', level: 1, reportsToPositionId: null, order: 0 },
      { id: 'pos-sales-mgr', name: 'Sales Manager', departmentId: 'dept-sales', level: 2, reportsToPositionId: 'pos-sales-vp', order: 1 },
      { id: 'pos-sales-rep', name: 'Sales Rep', departmentId: 'dept-sales', level: 3, reportsToPositionId: 'pos-sales-mgr', order: 2 },
    ],
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dept-finance',
    name: 'Finance',
    parentDepartmentId: 'dept-executive',
    positions: [
      { id: 'pos-finance-mgr', name: 'Finance Manager', departmentId: 'dept-finance', level: 1, reportsToPositionId: null, order: 0 },
      { id: 'pos-bookkeeper', name: 'Bookkeeper', departmentId: 'dept-finance', level: 2, reportsToPositionId: 'pos-finance-mgr', order: 1 },
      { id: 'pos-ap', name: 'Accounts Payable', departmentId: 'dept-finance', level: 2, reportsToPositionId: 'pos-finance-mgr', order: 2 },
      { id: 'pos-ar', name: 'Accounts Receivable', departmentId: 'dept-finance', level: 2, reportsToPositionId: 'pos-finance-mgr', order: 3 },
    ],
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dept-pm',
    name: 'Project Management',
    parentDepartmentId: 'dept-executive',
    positions: [
      { id: 'pos-pm-director', name: 'Director of PM', departmentId: 'dept-pm', level: 1, reportsToPositionId: null, order: 0 },
      { id: 'pos-pm', name: 'Project Manager', departmentId: 'dept-pm', level: 2, reportsToPositionId: 'pos-pm-director', order: 1 },
      { id: 'pos-apm', name: 'Assistant PM', departmentId: 'dept-pm', level: 3, reportsToPositionId: 'pos-pm', order: 2 },
      { id: 'pos-site-super', name: 'Site Supervisor', departmentId: 'dept-pm', level: 3, reportsToPositionId: 'pos-pm', order: 3 },
    ],
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dept-estimating',
    name: 'Estimating',
    parentDepartmentId: 'dept-executive',
    positions: [
      { id: 'pos-est-mgr', name: 'Estimating Manager', departmentId: 'dept-estimating', level: 1, reportsToPositionId: null, order: 0 },
      { id: 'pos-sr-estimator', name: 'Senior Estimator', departmentId: 'dept-estimating', level: 2, reportsToPositionId: 'pos-est-mgr', order: 1 },
      { id: 'pos-estimator', name: 'Estimator', departmentId: 'dept-estimating', level: 3, reportsToPositionId: 'pos-sr-estimator', order: 2 },
    ],
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Type for legacy position data during migration
interface LegacyPosition {
  id: string;
  name: string;
  departmentId: string;
  level?: PositionLevel;
  reportsToPositionId?: string | null;
  order?: number;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useFieldsStore = create<FieldsStore>()(
  persist(
    (set, get) => ({
      departments: defaultDepartments,
      contactRoles: defaultContactRoles,
      leadStages: defaultLeadStages,
      dealStages: defaultDealStages,
      leadLabels: defaultLeadLabels,
      leadSources: defaultLeadSources,

      // ============ DEPARTMENT ACTIONS ============
      
      addDepartment: (name, parentDepartmentId = null) => {
        const departments = get().departments;
        const maxOrder = Math.max(...departments.map(d => d.order), -1);
        
        const newDept: Department = {
          id: `dept-${generateId()}`,
          name,
          parentDepartmentId,
          positions: [],
          order: maxOrder + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          departments: [...state.departments, newDept],
        }));
      },

      updateDepartment: (id, data) => {
        set((state) => ({
          departments: state.departments.map((dept) =>
            dept.id === id
              ? { ...dept, ...data, updatedAt: new Date().toISOString() }
              : dept
          ),
        }));
      },

      deleteDepartment: (id) => {
        // Also delete child departments recursively
        const deleteRecursive = (deptId: string, allDepts: Department[]): Department[] => {
          const children = allDepts.filter(d => d.parentDepartmentId === deptId);
          let result = allDepts.filter(d => d.id !== deptId);
          
          for (const child of children) {
            result = deleteRecursive(child.id, result);
          }
          
          return result;
        };
        
        set((state) => ({
          departments: deleteRecursive(id, state.departments),
        }));
      },

      reorderDepartments: (departmentIds) => {
        set((state) => ({
          departments: state.departments.map((dept) => ({
            ...dept,
            order: departmentIds.indexOf(dept.id),
          })),
        }));
      },

      // ============ POSITION ACTIONS ============

      addPosition: (departmentId, name, reportsToPositionId) => {
        const allPositions = get().departments.flatMap(d => d.positions);
        const level = reportsToPositionId
          ? Math.min(5, calculateLevel(reportsToPositionId, allPositions) + 1) as PositionLevel
          : 1;
        
        set((state) => ({
          departments: state.departments.map((dept) => {
            if (dept.id !== departmentId) return dept;
            
            const maxOrder = Math.max(...dept.positions.map(p => p.order), -1);
            const newPosition: Position = {
              id: `pos-${generateId()}`,
              name,
              departmentId,
              level,
              reportsToPositionId,
              order: maxOrder + 1,
            };
            
            return {
              ...dept,
              positions: [...dept.positions, newPosition],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updatePosition: (positionId, data) => {
        set((state) => {
          // If reportsToPositionId is changing, recalculate level
          let newLevel: PositionLevel | undefined;
          if (data.reportsToPositionId !== undefined) {
            const allPositions = state.departments.flatMap(d => d.positions);
            newLevel = data.reportsToPositionId
              ? Math.min(5, calculateLevel(data.reportsToPositionId, allPositions) + 1) as PositionLevel
              : 1;
          }
          
          return {
            departments: state.departments.map((dept) => ({
              ...dept,
              positions: dept.positions.map((pos) =>
                pos.id === positionId
                  ? {
                      ...pos,
                      ...(data.name !== undefined && { name: data.name }),
                      ...(data.reportsToPositionId !== undefined && { reportsToPositionId: data.reportsToPositionId }),
                      ...(newLevel !== undefined && { level: newLevel }),
                    }
                  : pos
              ),
              updatedAt: dept.positions.some(p => p.id === positionId)
                ? new Date().toISOString()
                : dept.updatedAt,
            })),
          };
        });
      },

      deletePosition: (positionId) => {
        set((state) => {
          // Find the position being deleted to get its reportsToPositionId
          const deletedPosition = state.departments
            .flatMap(d => d.positions)
            .find(p => p.id === positionId);
          
          const inheritedReportsTo = deletedPosition?.reportsToPositionId || null;
          
          // When deleting a position, update any positions that reported to it
          // They should now report to the deleted position's supervisor (next level up)
          return {
            departments: state.departments.map((dept) => ({
              ...dept,
              positions: dept.positions
                .filter((pos) => pos.id !== positionId)
                .map((pos) => {
                  if (pos.reportsToPositionId !== positionId) return pos;
                  
                  // Calculate new level based on inherited reporting
                  const allPositions = state.departments.flatMap(d => d.positions).filter(p => p.id !== positionId);
                  const newLevel = inheritedReportsTo
                    ? Math.min(5, calculateLevel(inheritedReportsTo, allPositions) + 1) as PositionLevel
                    : 1;
                  
                  return { 
                    ...pos, 
                    reportsToPositionId: inheritedReportsTo,
                    level: newLevel,
                  };
                }),
              updatedAt: dept.positions.some(p => p.id === positionId || p.reportsToPositionId === positionId)
                ? new Date().toISOString()
                : dept.updatedAt,
            })),
          };
        });
      },

      // ============ CONTACT ROLE ACTIONS ============
      
      addContactRole: (role) => {
        const trimmedRole = role.trim();
        if (!trimmedRole) return;
        
        set((state) => {
          if (state.contactRoles.some(r => r.toLowerCase() === trimmedRole.toLowerCase())) {
            return state;
          }
          return {
            contactRoles: [...state.contactRoles, trimmedRole],
          };
        });
      },

      updateContactRole: (oldRole, newRole) => {
        const trimmedNew = newRole.trim();
        if (!trimmedNew) return;
        
        set((state) => ({
          contactRoles: state.contactRoles.map((r) =>
            r === oldRole ? trimmedNew : r
          ),
        }));
      },

      deleteContactRole: (role) => {
        set((state) => ({
          contactRoles: state.contactRoles.filter((r) => r !== role),
        }));
      },

      reorderContactRoles: (roles) => {
        set({ contactRoles: roles });
      },

      // ============ LEAD STAGE ACTIONS ============

      addLeadStage: (name, color = '#64748b') => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => {
          const maxOrder = Math.max(...state.leadStages.map(s => s.order), -1);
          const newStage: SalesStage = {
            id: `lead-stage-${generateId()}`,
            name: trimmedName,
            color,
            order: maxOrder + 1,
          };
          return {
            leadStages: [...state.leadStages, newStage],
          };
        });
      },

      updateLeadStage: (id, data) => {
        set((state) => ({
          leadStages: state.leadStages.map((stage) =>
            stage.id === id ? { ...stage, ...data } : stage
          ),
        }));
      },

      deleteLeadStage: (id) => {
        set((state) => ({
          leadStages: state.leadStages.filter((stage) => stage.id !== id),
        }));
      },

      reorderLeadStages: (stageIds) => {
        set((state) => ({
          leadStages: state.leadStages
            .map((stage) => ({
              ...stage,
              order: stageIds.indexOf(stage.id),
            }))
            .sort((a, b) => a.order - b.order),
        }));
      },

      // ============ DEAL STAGE ACTIONS ============

      addDealStage: (name, color = '#8b5cf6') => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => {
          const maxOrder = Math.max(...state.dealStages.map(s => s.order), -1);
          const newStage: SalesStage = {
            id: `deal-stage-${generateId()}`,
            name: trimmedName,
            color,
            order: maxOrder + 1,
          };
          return {
            dealStages: [...state.dealStages, newStage],
          };
        });
      },

      updateDealStage: (id, data) => {
        set((state) => ({
          dealStages: state.dealStages.map((stage) =>
            stage.id === id ? { ...stage, ...data } : stage
          ),
        }));
      },

      deleteDealStage: (id) => {
        set((state) => ({
          dealStages: state.dealStages.filter((stage) => stage.id !== id),
        }));
      },

      reorderDealStages: (stageIds) => {
        set((state) => ({
          dealStages: state.dealStages
            .map((stage) => ({
              ...stage,
              order: stageIds.indexOf(stage.id),
            }))
            .sort((a, b) => a.order - b.order),
        }));
      },

      // ============ LEAD LABEL ACTIONS ============

      addLeadLabel: (name, color = '#64748b') => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => {
          const maxOrder = Math.max(...state.leadLabels.map(l => l.order), -1);
          const newLabel: SalesLabel = {
            id: `label-${generateId()}`,
            name: trimmedName,
            color,
            order: maxOrder + 1,
          };
          return {
            leadLabels: [...state.leadLabels, newLabel],
          };
        });
      },

      updateLeadLabel: (id, data) => {
        set((state) => ({
          leadLabels: state.leadLabels.map((label) =>
            label.id === id ? { ...label, ...data } : label
          ),
        }));
      },

      deleteLeadLabel: (id) => {
        set((state) => ({
          leadLabels: state.leadLabels.filter((label) => label.id !== id),
        }));
      },

      reorderLeadLabels: (labelIds) => {
        set((state) => ({
          leadLabels: state.leadLabels
            .map((label) => ({
              ...label,
              order: labelIds.indexOf(label.id),
            }))
            .sort((a, b) => a.order - b.order),
        }));
      },

      // ============ LEAD SOURCE ACTIONS ============

      addLeadSource: (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => {
          if (state.leadSources.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
            return state;
          }
          const maxOrder = Math.max(...state.leadSources.map(s => s.order), -1);
          const newSource: SalesSource = {
            id: `source-${generateId()}`,
            name: trimmedName,
            order: maxOrder + 1,
          };
          return {
            leadSources: [...state.leadSources, newSource],
          };
        });
      },

      updateLeadSource: (id, name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => ({
          leadSources: state.leadSources.map((source) =>
            source.id === id ? { ...source, name: trimmedName } : source
          ),
        }));
      },

      deleteLeadSource: (id) => {
        set((state) => ({
          leadSources: state.leadSources.filter((source) => source.id !== id),
        }));
      },

      reorderLeadSources: (sourceIds) => {
        set((state) => ({
          leadSources: state.leadSources
            .map((source) => ({
              ...source,
              order: sourceIds.indexOf(source.id),
            }))
            .sort((a, b) => a.order - b.order),
        }));
      },

      // ============ HELPER FUNCTIONS ============
      
      getPositionsByDepartment: (departmentId) => {
        const dept = get().departments.find((d) => d.id === departmentId);
        if (!dept) return [];
        
        // Sort by level first, then by order
        return [...dept.positions].sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.order - b.order;
        });
      },

      getPositionById: (positionId) => {
        for (const dept of get().departments) {
          const pos = dept.positions.find(p => p.id === positionId);
          if (pos) return pos;
        }
        return null;
      },

      getDepartmentsByParent: (parentId) => {
        return get().departments
          .filter((d) => d.parentDepartmentId === parentId)
          .sort((a, b) => a.order - b.order);
      },

      getParentDepartment: (departmentId) => {
        const dept = get().departments.find((d) => d.id === departmentId);
        if (!dept || !dept.parentDepartmentId) return null;
        return get().departments.find((d) => d.id === dept.parentDepartmentId) || null;
      },

      getDepartmentById: (departmentId) => {
        return get().departments.find((d) => d.id === departmentId) || null;
      },

      getReportingChain: (positionId) => {
        const chain: Position[] = [];
        const allPositions = get().departments.flatMap(d => d.positions);
        const visited = new Set<string>();
        
        let currentId: string | null = positionId;
        
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          const position = allPositions.find(p => p.id === currentId);
          if (position) {
            chain.push(position);
            currentId = position.reportsToPositionId;
          } else {
            break;
          }
        }
        
        return chain;
      },

      getDirectReports: (positionId) => {
        const allPositions = get().departments.flatMap(d => d.positions);
        return allPositions.filter(p => p.reportsToPositionId === positionId);
      },

      getDepartmentHeads: (departmentId) => {
        const dept = get().departments.find(d => d.id === departmentId);
        if (!dept) return [];
        return dept.positions.filter(p => p.reportsToPositionId === null);
      },

      resetToDefaults: () => {
        set({
          departments: defaultDepartments,
          contactRoles: defaultContactRoles,
          leadStages: defaultLeadStages,
          dealStages: defaultDealStages,
          leadLabels: defaultLeadLabels,
          leadSources: defaultLeadSources,
        });
      },
    }),
    {
      name: 'sg-portal-fields',
      version: 3, // Bumped version for sales fields migration
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as FieldsState & { departments?: Department[]; contactRoles?: string[] };
        
        // Migration from version 1 to 2: add reportsToPositionId
        if (version < 2 && state.departments) {
          state.departments = state.departments.map(dept => ({
            ...dept,
            positions: dept.positions.map((pos: LegacyPosition, _idx: number, arr: LegacyPosition[]) => {
              // If already has reportsToPositionId, keep it
              if ('reportsToPositionId' in pos && pos.reportsToPositionId !== undefined) {
                return pos as Position;
              }
              
              // Try to infer from level
              const currentLevel = pos.level ?? 2;
              const potentialSupervisor = arr.find((p: LegacyPosition) => 
                (p.level ?? 2) === currentLevel - 1 && p.id !== pos.id
              );
              
              return {
                id: pos.id,
                name: pos.name,
                departmentId: pos.departmentId,
                level: currentLevel as PositionLevel,
                reportsToPositionId: currentLevel === 1 ? null : (potentialSupervisor?.id ?? null),
                order: pos.order ?? 0,
              } as Position;
            }),
          }));
        }
        
        // Migration from version 2 to 3: add sales fields
        if (version < 3) {
          if (!state.leadStages) {
            state.leadStages = defaultLeadStages;
          }
          if (!state.dealStages) {
            state.dealStages = defaultDealStages;
          }
          if (!state.leadLabels) {
            state.leadLabels = defaultLeadLabels;
          }
          if (!state.leadSources) {
            state.leadSources = defaultLeadSources;
          }
        }
        
        if (!state.contactRoles) {
          state.contactRoles = defaultContactRoles;
        }
        
        return state as FieldsState;
      },
    }
  )
);

// Backward compatibility alias
export const useDepartmentsStore = useFieldsStore;
