// ============================================================================
// Sales Store - Leads and Deals Management
// Location: src/contexts/salesStore.ts
//
// Manages the sales pipeline with:
// - Leads: Initial sales opportunities (Job Site Lead, Company Lead)
// - Deals: Qualified opportunities with value tracking
// - Soft delete with 30-day retention
// - Lead → Deal conversion
// - Won/Lost deal tracking
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { registerUserDependency } from './userDependencyRegistry';

// ============================================================================
// Types
// ============================================================================

export type LeadStage = string; // Dynamic from fieldsStore
export type DealStage = string; // Dynamic from fieldsStore
export type LeadLabel = string; // Cold, Warm, Hot - from fieldsStore
export type LeadSource = string; // Referral, Website, etc. - from fieldsStore

export type DealStatus = 'active' | 'won' | 'lost';

// Jobsite address (separate from company address)
export interface JobsiteAddress {
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

// Base fields shared between Lead and Deal
interface SalesEntityBase {
  id: string;
  slug?: string;
  name: string;
  companyId?: string; // Optional - linked to clientsStore
  companyName?: string; // Denormalized for display
  contactId?: string; // Optional - linked to clientsStore
  contactName?: string; // Denormalized for display
  label?: LeadLabel; // Cold, Warm, Hot
  source?: LeadSource;
  notes?: string;
  ownerId: string; // Sales rep user ID
  ownerName: string; // Denormalized for display
  jobsiteAddress?: JobsiteAddress;
  value?: number; // Deal value in dollars
  createdAt: string;
  updatedAt: string;
}

// Lead - Initial sales opportunity
export interface Lead extends SalesEntityBase {
  stage: LeadStage;
  convertedToDealId?: string; // Set when converted to deal
  convertedAt?: string;
}

// Deal - Qualified opportunity (can be converted from Lead)
export interface Deal extends SalesEntityBase {
  stage: DealStage;
  status: DealStatus;
  commission?: number; // Commission amount (flexible - not always % of sale)
  units?: number; // Number of units (apartments in multi-family)
  convertedFromLeadId?: string; // Reference to original lead (if converted)
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  // Soft delete
  deletedAt?: string; // Set when deleted, cleared after 30 days
}

// Input types for creating/updating
export interface LeadInput {
  name: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  stage: LeadStage;
  label?: LeadLabel;
  source?: LeadSource;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  jobsiteAddress?: JobsiteAddress;
  value?: number;
}

export interface DealInput {
  name: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  stage: DealStage;
  label?: LeadLabel;
  source?: LeadSource;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  jobsiteAddress?: JobsiteAddress;
  value?: number;
  commission?: number;
  units?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const generateSlug = (name: string, existingItems: { slug?: string }[]): string => {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const existingSlugs = new Set(existingItems.map(item => item.slug).filter(Boolean));
  
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
};

// Check if a deleted item should be permanently removed (30 days)
const shouldPermanentlyDelete = (deletedAt: string): boolean => {
  const deletedDate = new Date(deletedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 30;
};

// ============================================================================
// Store State & Actions
// ============================================================================

interface SalesState {
  leads: Lead[];
  deals: Deal[];
}

interface SalesActions {
  // Lead actions
  createLead: (input: LeadInput) => Lead;
  updateLead: (id: string, input: Partial<LeadInput>) => void;
  deleteLead: (id: string) => void;
  getLeadById: (id: string) => Lead | undefined;
  getLeadBySlug: (slug: string) => Lead | undefined;
  getLeadsByCompany: (companyId: string) => Lead[];
  getLeadsByContact: (contactId: string) => Lead[];
  getLeadsByOwner: (ownerId: string) => Lead[];
  
  // Deal actions
  createDeal: (input: DealInput) => Deal;
  updateDeal: (id: string, input: Partial<DealInput>) => void;
  deleteDeal: (id: string) => void; // Soft delete
  permanentlyDeleteDeal: (id: string) => void;
  restoreDeal: (id: string) => void;
  getDealById: (id: string) => Deal | undefined;
  getDealBySlug: (slug: string) => Deal | undefined;
  getDealsByCompany: (companyId: string) => Deal[];
  getDealsByContact: (contactId: string) => Deal[];
  getDealsByOwner: (ownerId: string) => Deal[];
  getActiveDeals: () => Deal[];
  getWonDeals: () => Deal[];
  getLostDeals: () => Deal[];
  getDeletedDeals: () => Deal[];
  
  // Deal status actions
  markDealWon: (id: string) => void;
  markDealLost: (id: string, reason: string) => void;
  reopenDeal: (id: string) => void;
  
  // Conversion
  convertLeadToDeal: (leadId: string, dealInput: Partial<DealInput>) => Deal;
  
  // Cleanup
  cleanupDeletedDeals: () => void; // Remove deals deleted > 30 days ago
  
  // Bulk operations
  reassignLeadsByOwner: (oldOwnerId: string, newOwnerId: string, newOwnerName: string) => void;
  reassignDealsByOwner: (oldOwnerId: string, newOwnerId: string, newOwnerName: string) => void;
}

export type SalesStore = SalesState & SalesActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useSalesStore = create<SalesStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state - empty
        leads: [],
        deals: [],

        // ==================== LEAD ACTIONS ====================

        createLead: (input) => {
          const state = get();
          const now = new Date().toISOString();
          
          const newLead: Lead = {
            id: `lead-${generateId()}`,
            slug: generateSlug(input.name, state.leads),
            name: input.name,
            companyId: input.companyId,
            companyName: input.companyName,
            contactId: input.contactId,
            contactName: input.contactName,
            stage: input.stage,
            label: input.label,
            source: input.source,
            notes: input.notes,
            ownerId: input.ownerId,
            ownerName: input.ownerName || '',
            jobsiteAddress: input.jobsiteAddress,
            value: input.value,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => ({
            leads: [...state.leads, newLead],
          }));

          return newLead;
        },

        updateLead: (id, input) => {
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.id === id
                ? {
                    ...lead,
                    ...input,
                    // Regenerate slug if name changed
                    slug: input.name && input.name !== lead.name
                      ? generateSlug(input.name, state.leads.filter(l => l.id !== id))
                      : lead.slug,
                    updatedAt: new Date().toISOString(),
                  }
                : lead
            ),
          }));
        },

        deleteLead: (id) => {
          set((state) => ({
            leads: state.leads.filter((lead) => lead.id !== id),
          }));
        },

        getLeadById: (id) => {
          return get().leads.find((lead) => lead.id === id);
        },

        getLeadBySlug: (slug) => {
          return get().leads.find((lead) => lead.slug === slug);
        },

        getLeadsByCompany: (companyId) => {
          return get().leads.filter((lead) => lead.companyId === companyId);
        },

        getLeadsByContact: (contactId) => {
          return get().leads.filter((lead) => lead.contactId === contactId);
        },

        getLeadsByOwner: (ownerId) => {
          return get().leads.filter((lead) => lead.ownerId === ownerId);
        },

        // ==================== DEAL ACTIONS ====================

        createDeal: (input) => {
          const state = get();
          const now = new Date().toISOString();

          const newDeal: Deal = {
            id: `deal-${generateId()}`,
            slug: generateSlug(input.name, state.deals),
            name: input.name,
            companyId: input.companyId,
            companyName: input.companyName,
            contactId: input.contactId,
            contactName: input.contactName,
            stage: input.stage,
            status: 'active',
            label: input.label,
            source: input.source,
            notes: input.notes,
            ownerId: input.ownerId,
            ownerName: input.ownerName || '',
            jobsiteAddress: input.jobsiteAddress,
            value: input.value,
            commission: input.commission,
            units: input.units,
            createdAt: now,
            updatedAt: now,
          };

          set((state) => ({
            deals: [...state.deals, newDeal],
          }));

          return newDeal;
        },

        updateDeal: (id, input) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    ...input,
                    // Regenerate slug if name changed
                    slug: input.name && input.name !== deal.name
                      ? generateSlug(input.name, state.deals.filter(d => d.id !== id))
                      : deal.slug,
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        deleteDeal: (id) => {
          // Soft delete - set deletedAt timestamp
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    deletedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        permanentlyDeleteDeal: (id) => {
          set((state) => ({
            deals: state.deals.filter((deal) => deal.id !== id),
          }));
        },

        restoreDeal: (id) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    deletedAt: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        getDealById: (id) => {
          return get().deals.find((deal) => deal.id === id);
        },

        getDealBySlug: (slug) => {
          return get().deals.find((deal) => deal.slug === slug);
        },

        getDealsByCompany: (companyId) => {
          return get().deals.filter((deal) => deal.companyId === companyId && !deal.deletedAt);
        },

        getDealsByContact: (contactId) => {
          return get().deals.filter((deal) => deal.contactId === contactId && !deal.deletedAt);
        },

        getDealsByOwner: (ownerId) => {
          return get().deals.filter((deal) => deal.ownerId === ownerId && !deal.deletedAt);
        },

        getActiveDeals: () => {
          return get().deals.filter((deal) => deal.status === 'active' && !deal.deletedAt);
        },

        getWonDeals: () => {
          return get().deals.filter((deal) => deal.status === 'won' && !deal.deletedAt);
        },

        getLostDeals: () => {
          return get().deals.filter((deal) => deal.status === 'lost' && !deal.deletedAt);
        },

        getDeletedDeals: () => {
          return get().deals.filter((deal) => deal.deletedAt);
        },

        // ==================== DEAL STATUS ACTIONS ====================

        markDealWon: (id) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    status: 'won' as DealStatus,
                    wonAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        markDealLost: (id, reason) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    status: 'lost' as DealStatus,
                    lostAt: new Date().toISOString(),
                    lostReason: reason,
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        reopenDeal: (id) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.id === id
                ? {
                    ...deal,
                    status: 'active' as DealStatus,
                    wonAt: undefined,
                    lostAt: undefined,
                    lostReason: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },

        // ==================== CONVERSION ====================

        convertLeadToDeal: (leadId, dealInput) => {
          const state = get();
          const lead = state.leads.find((l) => l.id === leadId);
          
          if (!lead) {
            throw new Error('Lead not found');
          }

          const now = new Date().toISOString();

          // Create deal from lead data
          const newDeal: Deal = {
            id: `deal-${generateId()}`,
            slug: generateSlug(lead.name, state.deals),
            name: dealInput.name || lead.name,
            companyId: dealInput.companyId ?? lead.companyId,
            companyName: dealInput.companyName ?? lead.companyName,
            contactId: dealInput.contactId ?? lead.contactId,
            contactName: dealInput.contactName ?? lead.contactName,
            stage: dealInput.stage || 'By Estimation', // Default first deal stage
            status: 'active',
            label: dealInput.label ?? lead.label,
            source: dealInput.source ?? lead.source,
            notes: dealInput.notes ?? lead.notes,
            ownerId: dealInput.ownerId ?? lead.ownerId,
            ownerName: dealInput.ownerName ?? lead.ownerName,
            jobsiteAddress: dealInput.jobsiteAddress ?? lead.jobsiteAddress,
            value: dealInput.value ?? lead.value,
            commission: dealInput.commission,
            units: dealInput.units,
            convertedFromLeadId: leadId,
            createdAt: now,
            updatedAt: now,
          };

          // Update lead as converted and delete it
          set((state) => ({
            leads: state.leads.filter((l) => l.id !== leadId), // Delete lead
            deals: [...state.deals, newDeal],
          }));

          return newDeal;
        },

        // ==================== CLEANUP ====================

        cleanupDeletedDeals: () => {
          set((state) => ({
            deals: state.deals.filter((deal) => {
              if (!deal.deletedAt) return true;
              return !shouldPermanentlyDelete(deal.deletedAt);
            }),
          }));
        },

        // ==================== BULK OPERATIONS ====================

        reassignLeadsByOwner: (oldOwnerId, newOwnerId, newOwnerName) => {
          set((state) => ({
            leads: state.leads.map((lead) =>
              lead.ownerId === oldOwnerId
                ? {
                    ...lead,
                    ownerId: newOwnerId,
                    ownerName: newOwnerName,
                    updatedAt: new Date().toISOString(),
                  }
                : lead
            ),
          }));
        },

        reassignDealsByOwner: (oldOwnerId, newOwnerId, newOwnerName) => {
          set((state) => ({
            deals: state.deals.map((deal) =>
              deal.ownerId === oldOwnerId
                ? {
                    ...deal,
                    ownerId: newOwnerId,
                    ownerName: newOwnerName,
                    updatedAt: new Date().toISOString(),
                  }
                : deal
            ),
          }));
        },
      }),
      {
        name: 'sg-portal-sales',
        version: 1,
      }
    ),
    { name: 'SalesStore' }
  )
);

// ============================================================================
// User Dependency Registration
// ============================================================================

// Register leads for user dependency tracking
registerUserDependency<Lead>({
  module: 'leads',
  label: 'Leads (Owner)',
  icon: 'Target',
  field: 'ownerId',
  getItems: () => useSalesStore.getState().leads,
  getUserId: (lead) => lead.ownerId,
  getItemId: (lead) => lead.id,
  getItemName: (lead) => lead.name,
  getItemUrl: (lead) => `/sales/leads/${lead.slug || lead.id}`,
  reassign: (leadId: string, newUserId: string | undefined) => {
    if (newUserId) {
      useSalesStore.getState().updateLead(leadId, { 
        ownerId: newUserId,
        // Note: ownerName will need to be updated separately or looked up
      });
    }
  },
});

// Register deals for user dependency tracking
registerUserDependency<Deal>({
  module: 'deals',
  label: 'Deals (Owner)',
  icon: 'Handshake',
  field: 'ownerId',
  getItems: () => useSalesStore.getState().deals.filter(d => !d.deletedAt),
  getUserId: (deal) => deal.ownerId,
  getItemId: (deal) => deal.id,
  getItemName: (deal) => deal.name,
  getItemUrl: (deal) => `/sales/deals/${deal.slug || deal.id}`,
  reassign: (dealId: string, newUserId: string | undefined) => {
    if (newUserId) {
      useSalesStore.getState().updateDeal(dealId, { 
        ownerId: newUserId,
        // Note: ownerName will need to be updated separately or looked up
      });
    }
  },
});

export default useSalesStore;
