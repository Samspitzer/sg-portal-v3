// ============================================================================
// Estimating Store
// Location: src/contexts/estimatingStore.ts
//
// Manages Delivery Projects and Contract Projects.
// Both types can be linked to a Lead or Deal from the sales pipeline.
// Each project has a set of PricingSteps used to build up the estimate.
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'draft' | 'sent' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export type ContractStatus =
  | 'draft' | 'pending_signature' | 'signed' | 'active' | 'completed' | 'cancelled';

export type ContractType =
  | 'fixed_price' | 'time_materials' | 'cost_plus' | 'retainer';

export interface JobsiteAddress {
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

/** A single pricing step / line item in a project estimate */
export interface PricingStep {
  id: string;
  title: string;
  description?: string;
  laborHours?: number;
  laborRate?: number;
  materialsCost?: number;
  otherCost?: number;
  /** Total = (laborHours * laborRate) + materialsCost + otherCost */
  total: number;
  sortOrder: number;
  createdAt: string;
}

// ── Delivery Project ──────────────────────────────────────────────────────────

export interface DeliveryProject {
  id: string;
  projectNumber: string;
  name: string;
  // Client / Contact
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  // Status & value
  status: DeliveryStatus;
  value?: number;
  deliveryDate?: string;
  // Ownership
  ownerId?: string;
  ownerName?: string;
  // Sales links
  linkedLeadId?: string;
  linkedLeadName?: string;
  linkedDealId?: string;
  linkedDealName?: string;
  // Address
  jobsiteAddress?: JobsiteAddress;
  // Content
  notes?: string;
  pricingSteps: PricingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryProjectInput {
  name: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  status?: DeliveryStatus;
  value?: number;
  deliveryDate?: string;
  ownerId?: string;
  ownerName?: string;
  linkedLeadId?: string;
  linkedLeadName?: string;
  linkedDealId?: string;
  linkedDealName?: string;
  jobsiteAddress?: JobsiteAddress;
  notes?: string;
}

// ── Contract Project ──────────────────────────────────────────────────────────

export interface ContractProject {
  id: string;
  projectNumber: string;
  name: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  contractType: ContractType;
  status: ContractStatus;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  ownerName?: string;
  linkedLeadId?: string;
  linkedLeadName?: string;
  linkedDealId?: string;
  linkedDealName?: string;
  jobsiteAddress?: JobsiteAddress;
  notes?: string;
  pricingSteps: PricingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractProjectInput {
  name: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  contractType?: ContractType;
  status?: ContractStatus;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  ownerName?: string;
  linkedLeadId?: string;
  linkedLeadName?: string;
  linkedDealId?: string;
  linkedDealName?: string;
  jobsiteAddress?: JobsiteAddress;
  notes?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface EstimatingState {
  deliveryProjects: DeliveryProject[];
  contractProjects: ContractProject[];

  // Delivery CRUD
  createDeliveryProject: (input: DeliveryProjectInput) => DeliveryProject;
  updateDeliveryProject: (id: string, updates: Partial<DeliveryProjectInput>) => void;
  deleteDeliveryProject: (id: string) => void;

  // Contract CRUD
  createContractProject: (input: ContractProjectInput) => ContractProject;
  updateContractProject: (id: string, updates: Partial<ContractProjectInput>) => void;
  deleteContractProject: (id: string) => void;

  // Pricing steps
  addPricingStep: (projectType: 'delivery' | 'contract', projectId: string, step: Omit<PricingStep, 'id' | 'createdAt' | 'total'>) => PricingStep;
  updatePricingStep: (projectType: 'delivery' | 'contract', projectId: string, stepId: string, updates: Partial<Omit<PricingStep, 'id' | 'createdAt'>>) => void;
  deletePricingStep: (projectType: 'delivery' | 'contract', projectId: string, stepId: string) => void;
  reorderPricingSteps: (projectType: 'delivery' | 'contract', projectId: string, stepIds: string[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

let _deliverySeq = 1;
let _contractSeq = 1;

function calcStepTotal(step: Omit<PricingStep, 'id' | 'createdAt' | 'total'>): number {
  const labor = (step.laborHours ?? 0) * (step.laborRate ?? 0);
  const materials = step.materialsCost ?? 0;
  const other = step.otherCost ?? 0;
  return labor + materials + other;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useEstimatingStore = create<EstimatingState>()(
  devtools(
    persist(
      (set) => ({
        deliveryProjects: [],
        contractProjects: [],

        // ── Delivery ──────────────────────────────────────────────────────────

        createDeliveryProject: (input) => {
          const now = new Date().toISOString();
          const project: DeliveryProject = {
            id: genId(),
            projectNumber: `EST-D-${String(_deliverySeq++).padStart(4, '0')}`,
            name: input.name,
            companyId: input.companyId,
            companyName: input.companyName,
            contactId: input.contactId,
            contactName: input.contactName,
            status: input.status ?? 'draft',
            value: input.value,
            deliveryDate: input.deliveryDate,
            ownerId: input.ownerId,
            ownerName: input.ownerName,
            linkedLeadId: input.linkedLeadId,
            linkedLeadName: input.linkedLeadName,
            linkedDealId: input.linkedDealId,
            linkedDealName: input.linkedDealName,
            jobsiteAddress: input.jobsiteAddress,
            notes: input.notes,
            pricingSteps: [],
            createdAt: now,
            updatedAt: now,
          };
          set(s => ({ deliveryProjects: [project, ...s.deliveryProjects] }));
          return project;
        },

        updateDeliveryProject: (id, updates) => {
          set(s => ({
            deliveryProjects: s.deliveryProjects.map(p =>
              p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
            ),
          }));
        },

        deleteDeliveryProject: (id) => {
          set(s => ({ deliveryProjects: s.deliveryProjects.filter(p => p.id !== id) }));
        },

        // ── Contract ──────────────────────────────────────────────────────────

        createContractProject: (input) => {
          const now = new Date().toISOString();
          const project: ContractProject = {
            id: genId(),
            projectNumber: `EST-C-${String(_contractSeq++).padStart(4, '0')}`,
            name: input.name,
            companyId: input.companyId,
            companyName: input.companyName,
            contactId: input.contactId,
            contactName: input.contactName,
            contractType: input.contractType ?? 'fixed_price',
            status: input.status ?? 'draft',
            contractValue: input.contractValue,
            startDate: input.startDate,
            endDate: input.endDate,
            ownerId: input.ownerId,
            ownerName: input.ownerName,
            linkedLeadId: input.linkedLeadId,
            linkedLeadName: input.linkedLeadName,
            linkedDealId: input.linkedDealId,
            linkedDealName: input.linkedDealName,
            jobsiteAddress: input.jobsiteAddress,
            notes: input.notes,
            pricingSteps: [],
            createdAt: now,
            updatedAt: now,
          };
          set(s => ({ contractProjects: [project, ...s.contractProjects] }));
          return project;
        },

        updateContractProject: (id, updates) => {
          set(s => ({
            contractProjects: s.contractProjects.map(p =>
              p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
            ),
          }));
        },

        deleteContractProject: (id) => {
          set(s => ({ contractProjects: s.contractProjects.filter(p => p.id !== id) }));
        },

        // ── Pricing steps ─────────────────────────────────────────────────────

        addPricingStep: (projectType, projectId, stepInput) => {
          const step: PricingStep = {
            id: genId(),
            ...stepInput,
            total: calcStepTotal(stepInput),
            createdAt: new Date().toISOString(),
          };
          if (projectType === 'delivery') {
            set(s => ({
              deliveryProjects: s.deliveryProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: [...p.pricingSteps, step], updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          } else {
            set(s => ({
              contractProjects: s.contractProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: [...p.pricingSteps, step], updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          }
          return step;
        },

        updatePricingStep: (projectType, projectId, stepId, updates) => {
          const updateSteps = (steps: PricingStep[]) =>
            steps.map(s => {
              if (s.id !== stepId) return s;
              const merged = { ...s, ...updates };
              return { ...merged, total: calcStepTotal(merged) };
            });

          if (projectType === 'delivery') {
            set(s => ({
              deliveryProjects: s.deliveryProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: updateSteps(p.pricingSteps), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          } else {
            set(s => ({
              contractProjects: s.contractProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: updateSteps(p.pricingSteps), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          }
        },

        deletePricingStep: (projectType, projectId, stepId) => {
          if (projectType === 'delivery') {
            set(s => ({
              deliveryProjects: s.deliveryProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: p.pricingSteps.filter(s => s.id !== stepId), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          } else {
            set(s => ({
              contractProjects: s.contractProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: p.pricingSteps.filter(s => s.id !== stepId), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          }
        },

        reorderPricingSteps: (projectType, projectId, stepIds) => {
          const reorder = (steps: PricingStep[]) => {
            const sorted = stepIds
              .map((id, i) => {
                const s = steps.find(s => s.id === id);
                return s ? { ...s, sortOrder: i } : null;
              })
              .filter(Boolean) as PricingStep[];
            return sorted;
          };

          if (projectType === 'delivery') {
            set(s => ({
              deliveryProjects: s.deliveryProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: reorder(p.pricingSteps), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          } else {
            set(s => ({
              contractProjects: s.contractProjects.map(p =>
                p.id === projectId
                  ? { ...p, pricingSteps: reorder(p.pricingSteps), updatedAt: new Date().toISOString() }
                  : p
              ),
            }));
          }
        },
      }),
      { name: 'sg-estimating-store' }
    ),
    { name: 'EstimatingStore' }
  )
);

export default useEstimatingStore;