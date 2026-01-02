import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

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

export interface Company {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
  salesRepId?: string; // Optional - links to user
  createdAt: string;
  updatedAt: string;
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

  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactsByCompany: (companyId: string) => Contact[];
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
            // Also delete all contacts for this company
            contacts: state.contacts.filter((contact) => contact.companyId !== id),
          }));
        },

        getCompanyById: (id) => {
          return get().companies.find((company) => company.id === id);
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
      }),
      { name: 'sg-portal-clients' }
    ),
    { name: 'ClientsStore' }
  )
);