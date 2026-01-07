import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { registerUserDependency } from './userDependencyRegistry';

// Contact Role options
export const CONTACT_ROLES = [
  'Owner',
  'Project Executive',
  'Project Manager',
  'Site Super',
  'Estimating',
  'VP of Construction',
  'Accounts Payable',
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

// Additional contact method types
export const CONTACT_METHOD_TYPES = ['phone', 'fax', 'email'] as const;
export type ContactMethodType = (typeof CONTACT_METHOD_TYPES)[number];

export interface AdditionalContact {
  id: string;
  type: ContactMethodType;
  label?: string;  // Optional label like "Work", "Home", "Assistant"
  value: string;
}

// Company address with label support for multiple offices
export interface CompanyAddress {
  id: string;
  label: string;  // "Main Office", "Branch Office", etc.
  street: string;
  suite?: string;  // Suite, Unit, Apt, etc.
  city: string;
  state: string;
  zip: string;
  salesRepId?: string;  // Optional sales rep for this specific location
}

export interface Company {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  // Legacy single address (for backward compatibility) - now includes salesRepId
  address?: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
    salesRepId?: string;  // Sales rep for main office location
  };
  // New: Multiple addresses support
  addresses?: CompanyAddress[];
  notes?: string;
  // Multiple sales reps at company level (shared account)
  // If empty, sales reps are set per-location instead
  salesRepIds?: string[];
  // Legacy single sales rep (for backward compatibility - will migrate to salesRepIds)
  salesRepId?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to get all sales rep IDs for a company (both company-level and location-level)
export function getCompanySalesRepIds(company: Company): string[] {
  // If company has company-level sales reps, return those
  if (company.salesRepIds && company.salesRepIds.length > 0) {
    return company.salesRepIds;
  }
  
  // Legacy single sales rep support
  if (company.salesRepId) {
    return [company.salesRepId];
  }
  
  // Otherwise, collect from locations
  const locationReps: string[] = [];
  
  // Main office
  if (company.address?.salesRepId) {
    locationReps.push(company.address.salesRepId);
  }
  
  // Additional addresses
  if (company.addresses) {
    for (const addr of company.addresses) {
      if (addr.salesRepId && !locationReps.includes(addr.salesRepId)) {
        locationReps.push(addr.salesRepId);
      }
    }
  }
  
  return locationReps;
}

// Helper to check if a company is assigned to a specific sales rep
export function isCompanyAssignedToRep(company: Company, salesRepId: string): boolean {
  return getCompanySalesRepIds(company).includes(salesRepId);
}

// Helper to check for duplicate address (ignores suite)
export function isDuplicateAddress(
  company: Company,
  street: string,
  city: string,
  state: string,
  zip: string,
  excludeAddressId?: string // Optional: exclude this address from check (for updates)
): { isDuplicate: boolean; existingLabel?: string } {
  const normalizeStr = (s: string) => s.toLowerCase().trim();
  
  // Check main office
  if (company.address?.street) {
    if (
      normalizeStr(company.address.street) === normalizeStr(street) &&
      normalizeStr(company.address.city) === normalizeStr(city) &&
      normalizeStr(company.address.state) === normalizeStr(state) &&
      normalizeStr(company.address.zip) === normalizeStr(zip) &&
      excludeAddressId !== 'main-office'
    ) {
      return { isDuplicate: true, existingLabel: 'Main Office' };
    }
  }
  
  // Check additional addresses
  if (company.addresses) {
    for (const addr of company.addresses) {
      if (addr.id === excludeAddressId) continue;
      
      if (
        normalizeStr(addr.street) === normalizeStr(street) &&
        normalizeStr(addr.city) === normalizeStr(city) &&
        normalizeStr(addr.state) === normalizeStr(state) &&
        normalizeStr(addr.zip) === normalizeStr(zip)
      ) {
        return { isDuplicate: true, existingLabel: addr.label };
      }
    }
  }
  
  return { isDuplicate: false };
}

export interface Contact {
  id: string;
  companyId: string; // Required - links to company
  firstName: string;
  lastName: string;
  email?: string;
  phoneOffice?: string;
  phoneMobile?: string;
  role?: ContactRole;
  notes?: string;
  additionalContacts?: AdditionalContact[]; // Dynamic contact methods
  officeAddressId?: string; // Optional - links to specific company address (main office or additional)
  createdAt: string;
  updatedAt: string;
}

interface ClientsState {
  companies: Company[];
  contacts: Contact[];
}

interface ClientsStore extends ClientsState {
  // Company actions
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  getCompanyById: (id: string) => Company | undefined;

  // Company address actions
  addCompanyAddress: (companyId: string, address: Omit<CompanyAddress, 'id'>) => void;
  updateCompanyAddress: (companyId: string, addressId: string, data: Partial<CompanyAddress>) => void;
  deleteCompanyAddress: (companyId: string, addressId: string) => void;

  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactsByCompany: (companyId: string) => Contact[];
  
  // Additional contact method actions
  addContactMethod: (contactId: string, method: Omit<AdditionalContact, 'id'>) => void;
  updateContactMethod: (contactId: string, methodId: string, data: Partial<AdditionalContact>) => void;
  deleteContactMethod: (contactId: string, methodId: string) => void;
}

export const useClientsStore = create<ClientsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Empty by default - no phantom data
        companies: [],
        contacts: [],

        // Company actions
        addCompany: (companyData) => {
          const now = new Date().toISOString();
          const newCompany: Company = {
            ...companyData,
            id: `company-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({ companies: [...state.companies, newCompany] }));
        },

        updateCompany: (id, data) => {
          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === id
                ? { ...company, ...data, updatedAt: new Date().toISOString() }
                : company
            ),
          }));
        },

        deleteCompany: (id) => {
          set((state) => ({
            companies: state.companies.filter((company) => company.id !== id),
            // Contacts are NOT deleted - they become orphaned and show as red in the UI
          }));
        },

        getCompanyById: (id) => {
          return get().companies.find((company) => company.id === id);
        },

        // Company address actions
        addCompanyAddress: (companyId, addressData) => {
          const newAddress: CompanyAddress = {
            ...addressData,
            id: `addr-${Date.now()}`,
          };
          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === companyId
                ? {
                    ...company,
                    addresses: [...(company.addresses || []), newAddress],
                    updatedAt: new Date().toISOString(),
                  }
                : company
            ),
          }));
        },

        updateCompanyAddress: (companyId, addressId, data) => {
          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === companyId
                ? {
                    ...company,
                    addresses: (company.addresses || []).map((addr) =>
                      addr.id === addressId ? { ...addr, ...data } : addr
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : company
            ),
          }));
        },

        deleteCompanyAddress: (companyId, addressId) => {
          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === companyId
                ? {
                    ...company,
                    addresses: (company.addresses || []).filter(
                      (addr) => addr.id !== addressId
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : company
            ),
          }));
        },

        // Contact actions
        addContact: (contactData) => {
          const now = new Date().toISOString();
          const newContact: Contact = {
            ...contactData,
            id: `contact-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({ contacts: [...state.contacts, newContact] }));
        },

        updateContact: (id, data) => {
          set((state) => ({
            contacts: state.contacts.map((contact) =>
              contact.id === id
                ? { ...contact, ...data, updatedAt: new Date().toISOString() }
                : contact
            ),
          }));
        },

        deleteContact: (id) => {
          set((state) => ({
            contacts: state.contacts.filter((contact) => contact.id !== id),
          }));
        },

        getContactsByCompany: (companyId) => {
          return get().contacts.filter((contact) => contact.companyId === companyId);
        },

        // Additional contact method actions
        addContactMethod: (contactId, methodData) => {
          const newMethod: AdditionalContact = {
            ...methodData,
            id: `method-${Date.now()}`,
          };
          set((state) => ({
            contacts: state.contacts.map((contact) =>
              contact.id === contactId
                ? {
                    ...contact,
                    additionalContacts: [...(contact.additionalContacts || []), newMethod],
                    updatedAt: new Date().toISOString(),
                  }
                : contact
            ),
          }));
        },

        updateContactMethod: (contactId, methodId, data) => {
          set((state) => ({
            contacts: state.contacts.map((contact) =>
              contact.id === contactId
                ? {
                    ...contact,
                    additionalContacts: (contact.additionalContacts || []).map((method) =>
                      method.id === methodId ? { ...method, ...data } : method
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : contact
            ),
          }));
        },

        deleteContactMethod: (contactId, methodId) => {
          set((state) => ({
            contacts: state.contacts.map((contact) =>
              contact.id === contactId
                ? {
                    ...contact,
                    additionalContacts: (contact.additionalContacts || []).filter(
                      (method) => method.id !== methodId
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : contact
            ),
          }));
        },
      }),
      { name: 'sg-portal-clients' }
    ),
    { name: 'ClientsStore' }
  )
);

// Register user dependencies for this store
// This allows the system to automatically track user assignments across modules
// Note: For companies with multiple sales reps, each rep assignment is tracked separately
registerUserDependency({
  module: 'companies',
  label: 'Companies (Sales Rep)',
  icon: 'Building2',
  field: 'salesRepIds',
  getItems: () => useClientsStore.getState().companies,
  // Return first sales rep for legacy compatibility, but the system should check salesRepIds
  getUserId: (company) => {
    // Check new salesRepIds array first
    if (company.salesRepIds && company.salesRepIds.length > 0) {
      return company.salesRepIds[0];
    }
    // Fall back to legacy salesRepId
    return company.salesRepId;
  },
  getItemId: (company) => company.id,
  getItemName: (company) => company.name,
  getItemUrl: (company) => `/clients/companies/${company.id}`,
  reassign: (companyId, newUserId) => {
    // When reassigning, set as the only sales rep (replaces all)
    useClientsStore.getState().updateCompany(companyId, { 
      salesRepIds: newUserId ? [newUserId] : [],
      salesRepId: undefined // Clear legacy field
    });
  },
});