import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { registerUserDependency } from './userDependencyRegistry';
import { generateCompanySlug, generateContactSlug } from '@/utils/slugUtils';

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
  salesRepId?: string;  // Legacy single sales rep for this location
  salesRepIds?: string[];  // Multiple sales reps for this location
}

export interface Company {
  id: string;
  slug?: string;  // URL-friendly identifier (e.g., "acme-construction")
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
    salesRepId?: string;  // Legacy single sales rep for main office
    salesRepIds?: string[];  // Multiple sales reps for main office
  };
  // New: Multiple addresses support
  addresses?: CompanyAddress[];
  notes?: string;
  // Multiple sales reps at company level (shared account)
  salesRepIds?: string[];
  // Legacy single sales rep (for backward compatibility - will migrate to salesRepIds)
  salesRepId?: string;
  // Explicit flag: when true, sales reps are assigned per-location instead of company-level
  salesRepsByLocation?: boolean;
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
  
  // Main office - check both salesRepIds and legacy salesRepId
  if (company.address?.salesRepIds && company.address.salesRepIds.length > 0) {
    locationReps.push(...company.address.salesRepIds);
  } else if (company.address?.salesRepId) {
    locationReps.push(company.address.salesRepId);
  }
  
  // Additional addresses - check both salesRepIds and legacy salesRepId
  if (company.addresses) {
    for (const addr of company.addresses) {
      if (addr.salesRepIds && addr.salesRepIds.length > 0) {
        for (const repId of addr.salesRepIds) {
          if (!locationReps.includes(repId)) {
            locationReps.push(repId);
          }
        }
      } else if (addr.salesRepId && !locationReps.includes(addr.salesRepId)) {
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
  slug?: string;  // URL-friendly identifier (e.g., "john-doe")
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
  addCompany: (company: Omit<Company, 'id' | 'slug' | 'createdAt' | 'updatedAt'>) => Company;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  getCompanyById: (id: string) => Company | undefined;
  getCompanyBySlug: (slug: string) => Company | undefined;

  // Company address actions
  addCompanyAddress: (companyId: string, address: Omit<CompanyAddress, 'id'>) => void;
  updateCompanyAddress: (companyId: string, addressId: string, data: Partial<CompanyAddress>) => void;
  deleteCompanyAddress: (companyId: string, addressId: string) => void;

  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'slug' | 'createdAt' | 'updatedAt'>) => Contact;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactsByCompany: (companyId: string) => Contact[];
  getContactBySlug: (slug: string) => Contact | undefined;
  
  // Additional contact method actions
  addContactMethod: (contactId: string, method: Omit<AdditionalContact, 'id'>) => void;
  updateContactMethod: (contactId: string, methodId: string, data: Partial<AdditionalContact>) => void;
  deleteContactMethod: (contactId: string, methodId: string) => void;
  
  // Migration helper - generate slugs for existing records without slugs
  migrateExistingSlugs: () => void;
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
          const state = get();
          
          // Generate unique slug from company name
          const slug = generateCompanySlug(companyData.name, state.companies);
          
          const newCompany: Company = {
            ...companyData,
            id: `company-${Date.now()}`,
            slug,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({ companies: [...state.companies, newCompany] }));
          return newCompany;
        },

        updateCompany: (id, data) => {
          set((state) => {
            // If name is being updated, regenerate the slug
            let updatedData = { ...data };
            if (data.name) {
              const otherCompanies = state.companies.filter(c => c.id !== id);
              updatedData.slug = generateCompanySlug(data.name, otherCompanies, id);
            }
            
            return {
              companies: state.companies.map((company) =>
                company.id === id
                  ? { ...company, ...updatedData, updatedAt: new Date().toISOString() }
                  : company
              ),
            };
          });
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
        
        getCompanyBySlug: (slug) => {
          return get().companies.find((company) => company.slug === slug);
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
          const state = get();
          
          // Generate unique slug from contact name
          const slug = generateContactSlug(
            contactData.firstName,
            contactData.lastName,
            state.contacts
          );
          
          const newContact: Contact = {
            ...contactData,
            id: `contact-${Date.now()}`,
            slug,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({ contacts: [...state.contacts, newContact] }));
          return newContact;
        },

        updateContact: (id, data) => {
          set((state) => {
            let updatedData = { ...data };
            
            // If name is being updated, regenerate the slug
            if (data.firstName !== undefined || data.lastName !== undefined) {
              const currentContact = state.contacts.find(c => c.id === id);
              if (currentContact) {
                const firstName = data.firstName ?? currentContact.firstName;
                const lastName = data.lastName ?? currentContact.lastName;
                const otherContacts = state.contacts.filter(c => c.id !== id);
                updatedData.slug = generateContactSlug(firstName, lastName, otherContacts, id);
              }
            }
            
            return {
              contacts: state.contacts.map((contact) =>
                contact.id === id
                  ? { ...contact, ...updatedData, updatedAt: new Date().toISOString() }
                  : contact
              ),
            };
          });
        },

        deleteContact: (id) => {
          set((state) => ({
            contacts: state.contacts.filter((contact) => contact.id !== id),
          }));
        },

        getContactsByCompany: (companyId) => {
          return get().contacts.filter((contact) => contact.companyId === companyId);
        },
        
        getContactBySlug: (slug) => {
          return get().contacts.find((contact) => contact.slug === slug);
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
        
        // Migration helper - generate slugs for existing records without slugs
        migrateExistingSlugs: () => {
          set((state) => {
            // Migrate companies
            const migratedCompanies = state.companies.map((company, index) => {
              if (company.slug) return company;
              
              // Get slugs of companies processed so far
              const existingSlugs = state.companies
                .slice(0, index)
                .filter(c => c.slug)
                .map(c => c.slug!);
              
              const slug = generateCompanySlug(company.name, 
                existingSlugs.map(s => ({ id: '', slug: s }))
              );
              
              return { ...company, slug };
            });
            
            // Migrate contacts
            const migratedContacts = state.contacts.map((contact, index) => {
              if (contact.slug) return contact;
              
              // Get slugs of contacts processed so far
              const existingSlugs = state.contacts
                .slice(0, index)
                .filter(c => c.slug)
                .map(c => c.slug!);
              
              const slug = generateContactSlug(
                contact.firstName,
                contact.lastName,
                existingSlugs.map(s => ({ id: '', slug: s }))
              );
              
              return { ...contact, slug };
            });
            
            return {
              companies: migratedCompanies,
              contacts: migratedContacts,
            };
          });
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
  // Use slug for URL if available
  getItemUrl: (company) => `/clients/companies/${company.slug || company.id}`,
  reassign: (companyId, newUserId) => {
    // When reassigning, set as the only sales rep (replaces all)
    useClientsStore.getState().updateCompany(companyId, { 
      salesRepIds: newUserId ? [newUserId] : [],
      salesRepId: undefined // Clear legacy field
    });
  },
});