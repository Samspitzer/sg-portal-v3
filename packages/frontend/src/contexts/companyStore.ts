import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Office location for your company (similar to CompanyAddress in clientsStore)
export interface CompanyOffice {
  id: string;
  label: string;  // "Main Office", "Warehouse", etc.
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  isMain?: boolean;  // Primary office location
}

// Letterhead template
export interface LetterheadTemplate {
  id: string;
  name: string;
  data: string; // Base64 image/PDF
  createdAt: string;
}

export interface CompanySettings {
  name: string;
  website: string;
  email: string;
  phone: string;
  // Legacy single address (kept for backwards compatibility)
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  // Multiple office locations
  offices: CompanyOffice[];
  logo: string | null;
  // Legacy single letterhead (kept for backwards compatibility)
  letterhead: string | null;
  // Multiple letterhead templates
  letterheads: LetterheadTemplate[];
}

interface CompanyStore {
  company: CompanySettings;
  setCompany: (company: Partial<CompanySettings>) => void;
  setLogo: (logo: string | null) => void;
  // Legacy letterhead methods (kept for backwards compatibility)
  setLetterhead: (letterhead: string | null) => void;
  // Office management
  addOffice: (office: Omit<CompanyOffice, 'id'>) => void;
  updateOffice: (id: string, data: Partial<CompanyOffice>) => void;
  deleteOffice: (id: string) => void;
  setMainOffice: (id: string) => void;
  getOffices: () => CompanyOffice[];
  getMainOffice: () => CompanyOffice | undefined;
  // Letterhead management
  addLetterhead: (name: string, data: string) => void;
  updateLetterhead: (id: string, data: Partial<LetterheadTemplate>) => void;
  deleteLetterhead: (id: string) => void;
  getLetterheads: () => LetterheadTemplate[];
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
  offices: [],
  logo: null,
  letterhead: null,
  letterheads: [],
};

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      company: defaultCompany,
      
      setCompany: (updates) =>
        set((state) => ({
          company: { ...state.company, ...updates },
        })),
      
      setLogo: (logo) =>
        set((state) => ({
          company: { ...state.company, logo },
        })),
      
      setLetterhead: (letterhead) =>
        set((state) => ({
          company: { ...state.company, letterhead },
        })),

      addOffice: (officeData) => {
        const newOffice: CompanyOffice = {
          ...officeData,
          id: `office-${Date.now()}`,
        };
        
        set((state) => {
          const currentOffices = state.company.offices || [];
          const offices = [...currentOffices, newOffice];
          
          // If this is the first office or marked as main, set it as main
          if (offices.length === 1 || officeData.isMain) {
            return {
              company: {
                ...state.company,
                offices: offices.map(o => ({
                  ...o,
                  isMain: o.id === newOffice.id,
                })),
              },
            };
          }
          
          return {
            company: {
              ...state.company,
              offices,
            },
          };
        });
      },

      updateOffice: (id, data) => {
        set((state) => ({
          company: {
            ...state.company,
            offices: (state.company.offices || []).map((office) =>
              office.id === id ? { ...office, ...data } : office
            ),
          },
        }));
      },

      deleteOffice: (id) => {
        set((state) => {
          const currentOffices = state.company.offices || [];
          const remainingOffices = currentOffices.filter((o) => o.id !== id);
          
          // If we deleted the main office, make the first remaining office the main
          const deletedOffice = currentOffices.find((o) => o.id === id);
          const firstOffice = remainingOffices[0];
          if (deletedOffice?.isMain && firstOffice) {
            return {
              company: {
                ...state.company,
                offices: remainingOffices.map((o, i) => 
                  i === 0 ? { ...o, isMain: true } : o
                ),
              },
            };
          }
          
          return {
            company: {
              ...state.company,
              offices: remainingOffices,
            },
          };
        });
      },

      setMainOffice: (id) => {
        set((state) => ({
          company: {
            ...state.company,
            offices: (state.company.offices || []).map((office) => ({
              ...office,
              isMain: office.id === id,
            })),
          },
        }));
      },

      getOffices: () => {
        return get().company.offices || [];
      },

      getMainOffice: () => {
        return (get().company.offices || []).find((o) => o.isMain);
      },

      // Letterhead management
      addLetterhead: (name, data) => {
        const newLetterhead: LetterheadTemplate = {
          id: `letterhead-${Date.now()}`,
          name,
          data,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          company: {
            ...state.company,
            letterheads: [...(state.company.letterheads || []), newLetterhead],
          },
        }));
      },

      updateLetterhead: (id, data) => {
        set((state) => ({
          company: {
            ...state.company,
            letterheads: (state.company.letterheads || []).map((lh) =>
              lh.id === id ? { ...lh, ...data } : lh
            ),
          },
        }));
      },

      deleteLetterhead: (id) => {
        set((state) => ({
          company: {
            ...state.company,
            letterheads: (state.company.letterheads || []).filter((lh) => lh.id !== id),
          },
        }));
      },

      getLetterheads: () => {
        return get().company.letterheads || [];
      },

      resetCompany: () => set({ company: defaultCompany }),
    }),
    {
      name: 'sg-portal-company',
    }
  )
);