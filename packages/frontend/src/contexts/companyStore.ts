import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanySettings {
  name: string;
  website: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  logo: string | null;
}

interface CompanyStore {
  company: CompanySettings;
  setCompany: (company: Partial<CompanySettings>) => void;
  setLogo: (logo: string | null) => void;
  resetCompany: () => void;
}

const defaultCompany: CompanySettings = {
  name: 'S&G Portal',
  website: '',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  },
  logo: null,
};

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      company: defaultCompany,
      setCompany: (updates) =>
        set((state) => ({
          company: { ...state.company, ...updates },
        })),
      setLogo: (logo) =>
        set((state) => ({
          company: { ...state.company, logo },
        })),
      resetCompany: () => set({ company: defaultCompany }),
    }),
    {
      name: 'sg-portal-company',
    }
  )
);