import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Smartphone,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Printer,
  Trash2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { CardContent, Button, Input, Modal, SearchInput, Select, Textarea, AddressInput } from '@/components/common';
import { AlphabetFilter } from '@/components/common/AlphabetFilter';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SelectFilter } from '@/components/common/SelectFilter';
import { DuplicateContactModal } from '@/components/common/DuplicateContactModal';
import { DuplicateCompanyModal } from '@/components/common/DuplicateCompanyModal';
import { useClientsStore, useUsersStore, useFieldsStore, useToast, type ContactRole, type Contact, type Company, getCompanySalesRepIds } from '@/contexts';
import { useDropdownKeyboard, useDocumentTitle, getContactUrl, getCompanyUrl } from '@/hooks';
import { validateEmail, validatePhone, formatPhoneNumber } from '@/utils/validation';

// Additional contact method type
interface AdditionalContactMethod {
  id: string;
  type: 'phone' | 'fax' | 'email';
  label: string;
  value: string;
}

interface ContactFormData {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneOffice: string;
  phoneMobile: string;
  role: ContactRole | '';
  notes: string;
  additionalContacts: AdditionalContactMethod[];
}

// Secondary address interface
interface SecondaryAddress {
  id: string;
  label: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

interface CompanyFormData {
  name: string;
  phone: string;
  website: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  salesRepId: string;
  secondaryAddresses: SecondaryAddress[];
}

const initialContactFormData: ContactFormData = {
  companyId: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneOffice: '',
  phoneMobile: '',
  role: '',
  notes: '',
  additionalContacts: [],
};

const initialCompanyFormData: CompanyFormData = {
  name: '',
  phone: '',
  website: '',
  street: '',
  suite: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
  salesRepId: '',
  secondaryAddresses: [],
};

type SortField = 'name' | 'role' | 'company' | 'email';
type SortDirection = 'asc' | 'desc';

export function ContactsPage() {
  const navigate = useNavigate();
  const { companies, contacts, addContact, updateContact, addCompany } = useClientsStore();
  const { users } = useUsersStore();
  const { contactRoles } = useFieldsStore();
  const toast = useToast();
  useDocumentTitle('Contacts');

  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'needs-attention'>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialContactFormData);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>(initialCompanyFormData);

  // Duplicate company detection for Add Company modal
  const [showDuplicateCompanyModal, setShowDuplicateCompanyModal] = useState(false);
  const [duplicateCompanyType, setDuplicateCompanyType] = useState<'exact' | 'different-address' | 'different-website'>('exact');
  const [duplicateCompany, setDuplicateCompany] = useState<{
    id: string;
    slug?: string;
    name: string;
    phone?: string;
    website?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null>(null);

  // Secondary address modal state for Add Company
  const [showSecondaryAddressModal, setShowSecondaryAddressModal] = useState(false);
  const [secondaryAddressLabel, setSecondaryAddressLabel] = useState('');
  const [secondaryAddressData, setSecondaryAddressData] = useState({
    street: '',
    suite: '',
    city: '',
    state: '',
    zip: '',
  });

  // Additional contact method modal state
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'phone' | 'fax' | 'email'>('phone');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newMethodValue, setNewMethodValue] = useState('');
  const [methodValidationError, setMethodValidationError] = useState<string | null>(null);

  // Ref for company dropdown in modal
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Duplicate contact detection
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateType, setDuplicateType] = useState<'exact' | 'name-only'>('exact');
  const [duplicateContact, setDuplicateContact] = useState<{
    id: string;
    slug?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneMobile?: string;
    phoneOffice?: string;
    companyId: string;
    companyName?: string;
  } | null>(null);
  const [newContactInfo, setNewContactInfo] = useState<{
    firstName: string;
    lastName: string;
    email?: string;
    phoneMobile?: string;
    phoneOffice?: string;
    companyId: string;
    companyName?: string;
  } | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  // Role options for Select component
  const roleOptions = useMemo(() => 
    contactRoles.map((role) => ({ value: role, label: role })),
    [contactRoles]
  );

  // Sales rep options for Select component
  const salesRepOptions = useMemo(() => 
    activeUsers.map((user) => ({ value: user.id, label: user.name })),
    [activeUsers]
  );

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || null;
  };

  const getCompany = (companyId: string) => {
    return companies.find((c) => c.id === companyId);
  };

  const isOrphanedContact = (companyId: string) => {
    return !companies.some((c) => c.id === companyId);
  };

  // Check if contact has fields needing review (from localStorage)
  const contactNeedsReview = (contactId: string) => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(`contact-fields-review-${contactId}`);
    if (stored) {
      try {
        const fields = JSON.parse(stored);
        return Array.isArray(fields) && fields.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  };

  // Check if contact needs attention (orphaned or needs review)
  const contactNeedsAttention = (contact: Contact) => {
    return isOrphanedContact(contact.companyId) || contactNeedsReview(contact.id);
  };

  // Count contacts needing attention
  const contactsNeedingAttentionCount = useMemo(() => {
    return contacts.filter(contactNeedsAttention).length;
  }, [contacts, companies]);

  const contactNames = useMemo(() => contacts.map((c) => c.firstName), [contacts]);

  // Get all locations for a company (main office + additional addresses)
  const getAllCompanyLocations = (company: Company | undefined): string[] => {
    if (!company) return [];
    const locations: string[] = [];
    
    // Main office address
    if (company.address?.city || company.address?.state) {
      const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
      if (mainLoc) locations.push(mainLoc);
    }
    
    // Additional addresses
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        if (addr.city || addr.state) {
          const loc = [addr.city, addr.state].filter(Boolean).join(', ');
          if (loc && !locations.includes(loc)) locations.push(loc);
        }
      });
    }
    
    return locations;
  };

  // Get the location for a contact's assigned office
  const getContactAssignedLocation = (contact: Contact, company: Company | undefined): string | null => {
    if (!company || !contact.officeAddressId) return null;
    
    // Check if assigned to main office
    if (contact.officeAddressId === 'main-office') {
      if (company.address?.city || company.address?.state) {
        return [company.address.city, company.address.state].filter(Boolean).join(', ');
      }
      return null;
    }
    
    // Check additional addresses
    const addr = company.addresses?.find((a) => a.id === contact.officeAddressId);
    if (addr && (addr.city || addr.state)) {
      return [addr.city, addr.state].filter(Boolean).join(', ');
    }
    
    return null;
  };

  // Get sales rep IDs for a contact based on their assigned office
  const getContactSalesRepIds = (contact: Contact, company: Company | undefined): string[] => {
    if (!company) return [];
    
    // If contact has assigned office, get that office's sales reps (if set by location)
    if (contact.officeAddressId && company.salesRepsByLocation) {
      if (contact.officeAddressId === 'main-office') {
        // Main office sales reps
        if (company.address?.salesRepIds) return company.address.salesRepIds;
        if (company.address?.salesRepId) return [company.address.salesRepId];
      } else {
        // Additional address sales reps
        const addr = company.addresses?.find((a) => a.id === contact.officeAddressId);
        if (addr?.salesRepIds) return addr.salesRepIds;
        if (addr?.salesRepId) return [addr.salesRepId];
      }
      return [];
    }
    
    // No assigned office OR company not using location-based sales reps
    // Return all company sales reps (company-level + location-level)
    return getCompanySalesRepIds(company);
  };

  // Helper: Get locations where a specific sales rep is assigned for a contact
  // If contact has no assigned office → return all locations where rep is assigned
  // If contact has assigned office → return that location only if rep is assigned there
  const getContactLocationsForSalesRep = (contact: Contact, company: Company | undefined, salesRepId: string): string[] => {
    if (!company) return [];
    const locations: string[] = [];
    
    // If contact has assigned office
    if (contact.officeAddressId) {
      const contactRepIds = getContactSalesRepIds(contact, company);
      if (contactRepIds.includes(salesRepId)) {
        const assignedLoc = getContactAssignedLocation(contact, company);
        if (assignedLoc) locations.push(assignedLoc);
      }
      return locations;
    }
    
    // Contact not assigned to specific office - check all company locations
    // If company uses company-level reps, check if this rep is at company level
    if (!company.salesRepsByLocation) {
      const companyRepIds = company.salesRepIds || (company.salesRepId ? [company.salesRepId] : []);
      if (companyRepIds.includes(salesRepId)) {
        return getAllCompanyLocations(company);
      }
      return [];
    }
    
    // Company uses location-based reps - find locations where this rep is assigned
    if (company.address) {
      const mainRepIds = company.address.salesRepIds || (company.address.salesRepId ? [company.address.salesRepId] : []);
      if (mainRepIds.includes(salesRepId)) {
        const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
        if (mainLoc) locations.push(mainLoc);
      }
    }
    
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        const addrRepIds = addr.salesRepIds || (addr.salesRepId ? [addr.salesRepId] : []);
        if (addrRepIds.includes(salesRepId)) {
          const addrLoc = [addr.city, addr.state].filter(Boolean).join(', ');
          if (addrLoc && !locations.includes(addrLoc)) locations.push(addrLoc);
        }
      });
    }
    
    return locations;
  };

  // Helper: Get sales rep IDs for a specific location for a contact
  // If contact has assigned office → only return reps if that office is in the location
  // If contact has no assigned office → return reps assigned to that location
  const getContactSalesRepIdsForLocation = (contact: Contact, company: Company | undefined, location: string): string[] => {
    if (!company) return [];
    
    // First check if company has any address in this location
    const companyLocations = getAllCompanyLocations(company);
    if (!companyLocations.includes(location)) return [];
    
    // If contact has assigned office, check if it's in this location
    if (contact.officeAddressId) {
      const assignedLoc = getContactAssignedLocation(contact, company);
      if (assignedLoc !== location) return [];
      // Return the contact's sales reps (from their assigned office)
      return getContactSalesRepIds(contact, company);
    }
    
    // Contact not assigned to specific office
    // If company uses company-level reps, return those
    if (!company.salesRepsByLocation) {
      return company.salesRepIds || (company.salesRepId ? [company.salesRepId] : []);
    }
    
    // Company uses location-based reps - find reps for this specific location
    const repIds: string[] = [];
    
    if (company.address) {
      const mainLoc = [company.address.city, company.address.state].filter(Boolean).join(', ');
      if (mainLoc === location) {
        if (company.address.salesRepIds) repIds.push(...company.address.salesRepIds);
        else if (company.address.salesRepId) repIds.push(company.address.salesRepId);
      }
    }
    
    if (company.addresses) {
      company.addresses.forEach((addr) => {
        const addrLoc = [addr.city, addr.state].filter(Boolean).join(', ');
        if (addrLoc === location) {
          if (addr.salesRepIds) repIds.push(...addr.salesRepIds);
          else if (addr.salesRepId) repIds.push(addr.salesRepId);
        }
      });
    }
    
    return repIds;
  };

  // Location filter options - cascading with companyFilter and salesRepFilter
  const locationFilterOptions = useMemo(() => {
    const locationCounts = new Map<string, number>();
    const allLocationCounts = new Map<string, number>();
    
    contacts.forEach((contact) => {
      const company = getCompany(contact.companyId);
      
      // Get all locations this contact could be in (for "all" counts)
      let contactLocations: string[] = [];
      if (contact.officeAddressId) {
        const assignedLocation = getContactAssignedLocation(contact, company);
        if (assignedLocation) contactLocations = [assignedLocation];
      } else {
        contactLocations = getAllCompanyLocations(company);
      }
      
      // Track all locations
      contactLocations.forEach((loc) => {
        allLocationCounts.set(loc, (allLocationCounts.get(loc) || 0) + 1);
      });
      
      // Check if contact matches other active filters
      let matchesFilters = true;
      
      // Check company filter
      if (companyFilter && matchesFilters) {
        matchesFilters = contact.companyId === companyFilter;
      }
      
      // Check sales rep filter
      if (salesRepFilter && matchesFilters) {
        const repLocations = getContactLocationsForSalesRep(contact, company, salesRepFilter);
        // Only count locations where this rep is assigned
        if (matchesFilters) {
          repLocations.forEach((loc) => {
            locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
          });
        }
        return; // Skip the default counting below
      }
      
      // If only company filter (no sales rep filter), count all contact locations
      if (matchesFilters) {
        contactLocations.forEach((loc) => {
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        });
      }
    });
    
    const hasActiveFilter = companyFilter || salesRepFilter;
    
    return Array.from(allLocationCounts.entries())
      .map(([loc, totalCount]) => {
        const matchCount = hasActiveFilter ? (locationCounts.get(loc) || 0) : totalCount;
        return {
          value: loc,
          label: loc,
          count: matchCount,
          disabled: hasActiveFilter ? matchCount === 0 : undefined,
        };
      })
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [contacts, companies, companyFilter, salesRepFilter]);

  // Sales rep filter options - cascading with companyFilter and locationFilter
  const salesRepFilterOptions = useMemo(() => {
    const repCounts = new Map<string, number>();
    const allRepCounts = new Map<string, number>();
    
    contacts.forEach((contact) => {
      const company = getCompany(contact.companyId);
      
      // Get all sales reps for this contact (for "all" counts)
      const allSalesRepIds = getContactSalesRepIds(contact, company);
      allSalesRepIds.forEach((repId) => {
        allRepCounts.set(repId, (allRepCounts.get(repId) || 0) + 1);
      });
      
      // Check if contact matches other active filters
      let matchesFilters = true;
      
      // Check company filter
      if (companyFilter && matchesFilters) {
        matchesFilters = contact.companyId === companyFilter;
      }
      
      // Check location filter
      if (locationFilter && matchesFilters) {
        if (contact.officeAddressId) {
          const assignedLocation = getContactAssignedLocation(contact, company);
          matchesFilters = assignedLocation === locationFilter;
        } else {
          matchesFilters = getAllCompanyLocations(company).includes(locationFilter);
        }
      }
      
      // If contact matches filters, count their sales reps
      if (matchesFilters) {
        // If location filter is active, only count reps assigned to that location
        if (locationFilter) {
          const locationRepIds = getContactSalesRepIdsForLocation(contact, company, locationFilter);
          locationRepIds.forEach((repId) => {
            repCounts.set(repId, (repCounts.get(repId) || 0) + 1);
          });
        } else {
          // No location filter, count all contact's sales reps
          allSalesRepIds.forEach((repId) => {
            repCounts.set(repId, (repCounts.get(repId) || 0) + 1);
          });
        }
      }
    });
    
    const hasActiveFilter = companyFilter || locationFilter;
    
    return Array.from(allRepCounts.entries())
      .map(([repId, totalCount]) => {
        const user = users.find((u) => u.id === repId);
        const matchCount = hasActiveFilter ? (repCounts.get(repId) || 0) : totalCount;
        return {
          value: repId,
          label: user?.name || 'Unknown',
          count: matchCount,
          disabled: hasActiveFilter ? matchCount === 0 : undefined,
        };
      })
      .filter((opt) => opt.label !== 'Unknown')
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [contacts, companies, users, companyFilter, locationFilter]);

  // Company options for filter - cascading with location and salesRep filters
  const companyFilterOptions = useMemo(() => {
    const allCompanyCounts = new Map<string, number>();
    const filteredCompanyCounts = new Map<string, number>();
    
    contacts.forEach((contact) => {
      if (contact.companyId && !isOrphanedContact(contact.companyId)) {
        const company = getCompany(contact.companyId);
        
        // Track all companies with contacts
        allCompanyCounts.set(contact.companyId, (allCompanyCounts.get(contact.companyId) || 0) + 1);
        
        // Check if contact matches the active filters
        let matchesFilters = true;
        
        // Check location filter
        if (locationFilter && matchesFilters) {
          if (contact.officeAddressId) {
            const assignedLocation = getContactAssignedLocation(contact, company);
            matchesFilters = assignedLocation === locationFilter;
          } else {
            matchesFilters = getAllCompanyLocations(company).includes(locationFilter);
          }
        }
        
        // Check sales rep filter
        if (salesRepFilter && matchesFilters) {
          const contactSalesRepIds = getContactSalesRepIds(contact, company);
          matchesFilters = contactSalesRepIds.includes(salesRepFilter);
        }
        
        if (matchesFilters) {
          filteredCompanyCounts.set(contact.companyId, (filteredCompanyCounts.get(contact.companyId) || 0) + 1);
        }
      }
    });
    
    const hasActiveFilter = locationFilter || salesRepFilter;
    
    return companies
      .filter((c) => allCompanyCounts.has(c.id))
      .map((company) => {
        const matchCount = hasActiveFilter 
          ? (filteredCompanyCounts.get(company.id) || 0)
          : (allCompanyCounts.get(company.id) || 0);
        return {
          value: company.id,
          label: company.name,
          count: matchCount,
          disabled: hasActiveFilter ? matchCount === 0 : undefined,
        };
      })
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [companies, contacts, locationFilter, salesRepFilter]);

  const filteredAndSortedContacts = useMemo(() => {
    let result = contacts.filter((contact) => {
      const matchesSearch =
        contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCompany = !companyFilter || contact.companyId === companyFilter;
      const matchesLetter = !letterFilter || 
        (contact.firstName?.charAt(0)?.toUpperCase() === letterFilter);
      
      // Attention filter - only show contacts needing attention
      const matchesAttention = attentionFilter === 'all' || contactNeedsAttention(contact);
      
      // Location filter - check contact's assigned office or all company locations
      const company = getCompany(contact.companyId);
      let matchesLocation = true;
      if (locationFilter) {
        if (contact.officeAddressId) {
          // Contact has assigned office - get that specific location
          const assignedLocation = getContactAssignedLocation(contact, company);
          matchesLocation = assignedLocation === locationFilter;
        } else {
          // No assigned office - match any company location
          matchesLocation = getAllCompanyLocations(company).includes(locationFilter);
        }
      }
      
      // Sales rep filter - based on contact's assigned office or all company sales reps
      let matchesSalesRep = true;
      if (salesRepFilter) {
        const contactSalesRepIds = getContactSalesRepIds(contact, company);
        matchesSalesRep = contactSalesRepIds.includes(salesRepFilter);
      }
      
      return matchesSearch && matchesCompany && matchesLetter && matchesLocation && matchesSalesRep && matchesAttention;
    });

    result = [...result].sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortField) {
        case 'name':
          aVal = (a.firstName + ' ' + a.lastName).toLowerCase();
          bVal = (b.firstName + ' ' + b.lastName).toLowerCase();
          break;
        case 'role':
          aVal = (a.role || '').toLowerCase();
          bVal = (b.role || '').toLowerCase();
          break;
        case 'company':
          aVal = (getCompanyName(a.companyId) || '').toLowerCase();
          bVal = (getCompanyName(b.companyId) || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [contacts, search, companyFilter, letterFilter, locationFilter, salesRepFilter, attentionFilter, sortField, sortDirection, companies]);

  // Companies for modal dropdown
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    return companies.filter((company) =>
      company.name.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  const showAddCompanyOption = useMemo(() => {
    if (!companySearch.trim()) return false;
    const exactMatch = companies.some(
      (company) => company.name.toLowerCase() === companySearch.toLowerCase()
    );
    return !exactMatch;
  }, [companies, companySearch]);

  // Keyboard navigation for company selector in modal
  const companyDropdownKeyboard = useDropdownKeyboard({
    items: filteredCompanies,
    isOpen: showCompanyDropdown,
    onSelect: (company, index) => {
      if (index === -1 && showAddCompanyOption) {
        openAddCompanyModal();
      } else if (company) {
        selectCompany(company);
      }
    },
    onClose: () => setShowCompanyDropdown(false),
    hasAddOption: showAddCompanyOption,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  // Table columns
  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (contact) => {
        const orphaned = isOrphanedContact(contact.companyId);
        const needsReview = contactNeedsReview(contact.id);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
              orphaned 
                ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400' 
                : needsReview
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
            }`}>
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div className="flex flex-col">
              <span className={`font-medium ${
                orphaned 
                  ? 'text-danger-700 dark:text-danger-400' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                {contact.firstName} {contact.lastName}
              </span>
              {orphaned && (
                <span className="text-xs text-danger-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No company assigned
                </span>
              )}
              {!orphaned && needsReview && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Needs review
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">{contact.role || '—'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      render: (contact) => {
        const orphaned = isOrphanedContact(contact.companyId);
        const companyName = getCompanyName(contact.companyId);
        
        if (orphaned) {
          return (
            <span className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="italic">Company deleted</span>
            </span>
          );
        }
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              const company = companies.find(c => c.id === contact.companyId);
              if (company) navigate(getCompanyUrl(company));
            }}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
          >
            <Building2 className="w-3 h-3 flex-shrink-0" />
            {companyName}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (contact) => {
        if (!contact.email) {
          return <span className="text-slate-400">—</span>;
        }
        return (
          <a
            href={'mailto:' + contact.email}
            className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3 h-3" />
            {contact.email}
          </a>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'phoneOffice',
      header: 'Work Phone',
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">
          {contact.phoneOffice ? (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contact.phoneOffice}
            </span>
          ) : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'phoneMobile',
      header: 'Mobile',
      render: (contact) => (
        <span className="text-slate-600 dark:text-slate-400">
          {contact.phoneMobile ? (
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              {contact.phoneMobile}
            </span>
          ) : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const openAddModal = () => {
    setFormData(initialContactFormData);
    setCompanySearch('');
    setShowCompanyDropdown(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialContactFormData);
    setCompanySearch('');
    setShowCompanyDropdown(false);
  };

  const findDuplicateContact = (firstName: string, lastName: string, email: string) => {
    const normalizedFirst = firstName.trim().toLowerCase();
    const normalizedLast = lastName.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    for (const contact of contacts) {
      const matchesName =
        contact.firstName.toLowerCase() === normalizedFirst &&
        contact.lastName.toLowerCase() === normalizedLast;
      if (!matchesName) continue;
      if (normalizedEmail && contact.email?.toLowerCase() === normalizedEmail) {
        return { contact, type: 'exact' as const };
      }
      return { contact, type: 'name-only' as const };
    }
    return null;
  };

  const handleSave = () => {
    if (!formData.companyId) {
      toast.error('Error', 'Company is required');
      return;
    }
    if (!formData.firstName.trim()) {
      toast.error('Error', 'First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error('Error', 'Last name is required');
      return;
    }

    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Error', 'Please enter a valid email address');
      return;
    }

    // Validate office phone
    if (formData.phoneOffice && !validatePhone(formData.phoneOffice)) {
      toast.error('Error', 'Please enter a valid office phone number');
      return;
    }

    // Validate mobile phone
    if (formData.phoneMobile && !validatePhone(formData.phoneMobile)) {
      toast.error('Error', 'Please enter a valid mobile phone number');
      return;
    }

    const duplicate = findDuplicateContact(formData.firstName, formData.lastName, formData.email);
    if (duplicate) {
      const existingCompany = companies.find((c) => c.id === duplicate.contact.companyId);
      const newCompany = companies.find((c) => c.id === formData.companyId);
      setDuplicateContact({
        id: duplicate.contact.id,
        slug: duplicate.contact.slug,
        firstName: duplicate.contact.firstName,
        lastName: duplicate.contact.lastName,
        email: duplicate.contact.email,
        phoneMobile: duplicate.contact.phoneMobile,
        phoneOffice: duplicate.contact.phoneOffice,
        companyId: duplicate.contact.companyId,
        companyName: existingCompany?.name,
      });
      setNewContactInfo({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email || undefined,
        phoneMobile: formData.phoneMobile || undefined,
        phoneOffice: formData.phoneOffice || undefined,
        companyId: formData.companyId,
        companyName: newCompany?.name,
      });
      setDuplicateType(duplicate.type);
      setShowDuplicateModal(true);
      return;
    }
    createContact();
  };

  const createContact = () => {
    const contactData = {
      companyId: formData.companyId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email || undefined,
      phoneOffice: formData.phoneOffice || undefined,
      phoneMobile: formData.phoneMobile || undefined,
      role: formData.role || undefined,
      notes: formData.notes || undefined,
      additionalContacts: formData.additionalContacts.length > 0 ? formData.additionalContacts : undefined,
    };
    addContact(contactData);
    toast.success('Created', formData.firstName + ' ' + formData.lastName + ' has been added');
    closeModal();
  };

  const handleTransferAndUpdate = () => {
    if (duplicateContact && newContactInfo) {
      updateContact(duplicateContact.id, {
        companyId: newContactInfo.companyId,
        email: newContactInfo.email || duplicateContact.email,
        phoneMobile: newContactInfo.phoneMobile || duplicateContact.phoneMobile,
        phoneOffice: newContactInfo.phoneOffice || duplicateContact.phoneOffice,
      });
      toast.success('Updated', duplicateContact.firstName + ' ' + duplicateContact.lastName + ' has been moved to ' + newContactInfo.companyName);
      // Use slug if available, otherwise fall back to id
      navigate(`/clients/contacts/${duplicateContact.slug || duplicateContact.id}`);
    }
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
    closeModal();
  };

  const handleCreateNew = () => {
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
    createContact();
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateContact(null);
    setNewContactInfo(null);
  };

  const selectCompany = (company: { id: string; name: string }) => {
    setFormData({ ...formData, companyId: company.id });
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
  };

  const openAddCompanyModal = () => {
    setCompanyFormData({ ...initialCompanyFormData, name: companySearch.trim() });
    setShowAddCompanyModal(true);
    setShowCompanyDropdown(false);
  };

  const closeAddCompanyModal = () => {
    setShowAddCompanyModal(false);
    setCompanyFormData(initialCompanyFormData);
  };

  // Check for duplicate company by name and determine type
  const checkForDuplicateCompany = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    const existing = companies.find((company) => company.name.toLowerCase() === normalizedName);
    
    if (!existing) return null;

    // Check if addresses match
    const newAddress = {
      street: companyFormData.street.trim().toLowerCase(),
      city: companyFormData.city.trim().toLowerCase(),
      state: companyFormData.state.trim().toLowerCase(),
      zip: companyFormData.zip.trim(),
    };
    const existingAddress = {
      street: (existing.address?.street || '').trim().toLowerCase(),
      city: (existing.address?.city || '').trim().toLowerCase(),
      state: (existing.address?.state || '').trim().toLowerCase(),
      zip: (existing.address?.zip || '').trim(),
    };

    const addressMatches = 
      newAddress.street === existingAddress.street &&
      newAddress.city === existingAddress.city &&
      newAddress.state === existingAddress.state &&
      newAddress.zip === existingAddress.zip;

    // Check if websites match (both empty counts as match)
    const newWebsite = (companyFormData.website || '').trim().toLowerCase();
    const existingWebsite = (existing.website || '').trim().toLowerCase();
    const websiteMatches = newWebsite === existingWebsite;

    // Determine duplicate type
    let type: 'exact' | 'different-address' | 'different-website' = 'exact';
    if (!addressMatches) {
      type = 'different-address';
    } else if (!websiteMatches) {
      type = 'different-website';
    }

    return { existing, type };
  };

  const handleSaveCompany = () => {
    if (!companyFormData.name.trim()) {
      toast.error('Error', 'Company name is required');
      return;
    }

    // Check for duplicate
    const duplicateCheck = checkForDuplicateCompany(companyFormData.name);
    if (duplicateCheck) {
      const { existing, type } = duplicateCheck;
      setDuplicateCompany({
        id: existing.id,
        slug: existing.slug,
        name: existing.name,
        phone: existing.phone,
        website: existing.website,
        street: existing.address?.street,
        city: existing.address?.city,
        state: existing.address?.state,
        zip: existing.address?.zip,
      });
      setDuplicateCompanyType(type);
      setShowDuplicateCompanyModal(true);
      return;
    }

    // No duplicate, create company
    createCompany();
  };

  const createCompany = () => {
    // Build secondary addresses array
    const addresses = companyFormData.secondaryAddresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      street: addr.street,
      suite: addr.suite || undefined,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
    }));

    const companyData = {
      name: companyFormData.name.trim(),
      phone: companyFormData.phone || undefined,
      website: companyFormData.website || undefined,
      address: companyFormData.street || companyFormData.city || companyFormData.state || companyFormData.zip
        ? { 
            street: companyFormData.street, 
            suite: companyFormData.suite || undefined,
            city: companyFormData.city, 
            state: companyFormData.state, 
            zip: companyFormData.zip 
          }
        : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      notes: companyFormData.notes || undefined,
      salesRepId: companyFormData.salesRepId || undefined,
    };
    addCompany(companyData);
    toast.success('Created', companyFormData.name + ' has been added');
    setTimeout(() => {
      const newCompany = useClientsStore.getState().companies.find((c) => c.name === companyFormData.name.trim());
      if (newCompany) {
        setFormData({ ...formData, companyId: newCompany.id });
        setCompanySearch(newCompany.name);
      }
    }, 100);
    closeAddCompanyModal();
  };

  const handleViewExistingCompany = () => {
    if (duplicateCompany) {
      navigate(`/clients/companies/${duplicateCompany.slug || duplicateCompany.id}`);
    }
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    closeAddCompanyModal();
  };

  const handleAddAsNewLocation = () => {
    if (duplicateCompany) {
      const { updateCompany } = useClientsStore.getState();
      const existingCompany = companies.find(c => c.id === duplicateCompany.id);
      
      if (existingCompany) {
        const newAddress = {
          id: crypto.randomUUID(),
          label: companyFormData.city && companyFormData.state ? `${companyFormData.city}, ${companyFormData.state}` : 'Office',
          street: companyFormData.street,
          suite: companyFormData.suite || undefined,
          city: companyFormData.city,
          state: companyFormData.state,
          zip: companyFormData.zip,
        };

        const existingAddresses = existingCompany.addresses || [];
        updateCompany(duplicateCompany.id, {
          addresses: [...existingAddresses, newAddress],
        });

        toast.success('Location Added', `New office added to ${existingCompany.name}`);
        
        // Select this company for the contact
        setFormData({ ...formData, companyId: existingCompany.id });
        setCompanySearch(existingCompany.name);
      }
    }
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    closeAddCompanyModal();
  };

  const handleCreateSeparateCompany = () => {
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
    createCompany();
  };

  const handleCloseDuplicateCompanyModal = () => {
    setShowDuplicateCompanyModal(false);
    setDuplicateCompany(null);
  };

  // Secondary address handlers for Add Company modal
  const openSecondaryAddressModal = () => {
    setSecondaryAddressLabel('');
    setSecondaryAddressData({ street: '', suite: '', city: '', state: '', zip: '' });
    setShowSecondaryAddressModal(true);
  };

  const handleAddSecondaryAddress = () => {
    if (!secondaryAddressLabel.trim()) {
      toast.error('Error', 'Label is required');
      return;
    }
    if (!secondaryAddressData.street && !secondaryAddressData.city) {
      toast.error('Error', 'Please enter at least street or city');
      return;
    }

    const newAddress: SecondaryAddress = {
      id: crypto.randomUUID(),
      label: secondaryAddressLabel.trim(),
      street: secondaryAddressData.street,
      suite: secondaryAddressData.suite || undefined,
      city: secondaryAddressData.city,
      state: secondaryAddressData.state,
      zip: secondaryAddressData.zip,
    };

    setCompanyFormData({
      ...companyFormData,
      secondaryAddresses: [...companyFormData.secondaryAddresses, newAddress],
    });

    setShowSecondaryAddressModal(false);
  };

  const handleRemoveSecondaryAddress = (addressId: string) => {
    setCompanyFormData({
      ...companyFormData,
      secondaryAddresses: companyFormData.secondaryAddresses.filter(a => a.id !== addressId),
    });
  };

  // Additional contact method handlers
  const handleMethodTypeChange = (type: 'phone' | 'fax' | 'email') => {
    setNewMethodType(type);
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  const handleNewMethodValueChange = (value: string) => {
    let formattedValue = value;
    
    if (newMethodType !== 'email') {
      const currentDigits = newMethodValue.replace(/\D/g, '').length;
      const newDigits = value.replace(/\D/g, '').length;
      if (newDigits > currentDigits) {
        formattedValue = formatPhoneNumber(value);
      }
    }
    
    setNewMethodValue(formattedValue);
    
    // Validate
    if (formattedValue) {
      if (newMethodType === 'email') {
        setMethodValidationError(validateEmail(formattedValue) ? null : 'Invalid email address');
      } else {
        setMethodValidationError(validatePhone(formattedValue) ? null : 'Invalid phone number');
      }
    } else {
      setMethodValidationError(null);
    }
  };

  const handleAddMethod = () => {
    if (!newMethodLabel.trim()) {
      toast.error('Error', 'Label is required');
      return;
    }
    if (!newMethodValue.trim()) {
      toast.error('Error', 'Value is required');
      return;
    }
    if (methodValidationError) {
      return;
    }

    const newMethod: AdditionalContactMethod = {
      id: crypto.randomUUID(),
      type: newMethodType,
      label: newMethodLabel.trim(),
      value: newMethodValue.trim(),
    };

    setFormData({
      ...formData,
      additionalContacts: [...formData.additionalContacts, newMethod],
    });

    // Reset and close modal
    setShowAddMethodModal(false);
    setNewMethodType('phone');
    setNewMethodLabel('');
    setNewMethodValue('');
    setMethodValidationError(null);
  };

  const handleRemoveMethod = (methodId: string) => {
    setFormData({
      ...formData,
      additionalContacts: formData.additionalContacts.filter((m) => m.id !== methodId),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setLetterFilter(null);
    setCompanyFilter('');
    setLocationFilter('');
    setSalesRepFilter('');
    setAttentionFilter('all');
  };

  const hasActiveFilters = search || letterFilter || companyFilter || locationFilter || salesRepFilter || attentionFilter !== 'all';

  const hasContactChanges = formData.companyId !== '' || formData.firstName.trim() !== '' || formData.lastName.trim() !== '' || formData.email !== '' || formData.phoneOffice !== '' || formData.phoneMobile !== '' || formData.role !== '' || formData.notes !== '' || formData.additionalContacts.length > 0;
  const hasCompanyChanges = companyFormData.name.trim() !== '' || companyFormData.phone !== '' || companyFormData.website !== '' || companyFormData.street !== '' || companyFormData.suite !== '' || companyFormData.city !== '' || companyFormData.state !== '' || companyFormData.zip !== '' || companyFormData.notes !== '' || companyFormData.salesRepId !== '' || companyFormData.secondaryAddresses.length > 0;

  return (
    <Page
      title="Contacts"
      description="Manage your client contacts."
      fillHeight
      actions={
        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredAndSortedContacts}
        rowKey={(contact) => contact.id}
        onRowClick={(contact) => navigate(getContactUrl(contact))}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        filters={
          <div className="space-y-4">
            {/* Needs Attention Filter - only show if there are contacts needing attention */}
            {contactsNeedingAttentionCount > 0 && (
              <div className="flex items-center">
                <button
                  onClick={() => setAttentionFilter(attentionFilter === 'all' ? 'needs-attention' : 'all')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    attentionFilter === 'needs-attention'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {attentionFilter === 'needs-attention' 
                      ? `Showing ${contactsNeedingAttentionCount} contact${contactsNeedingAttentionCount !== 1 ? 's' : ''} needing attention`
                      : `${contactsNeedingAttentionCount} contact${contactsNeedingAttentionCount !== 1 ? 's' : ''} need${contactsNeedingAttentionCount === 1 ? 's' : ''} attention`
                    }
                  </span>
                </button>
              </div>
            )}

            {/* Search and Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search contacts..."
                className="w-full sm:w-64"
              />
              <SelectFilter
                label="Company"
                value={companyFilter}
                options={companyFilterOptions}
                onChange={setCompanyFilter}
                icon={<Building2 className="w-4 h-4" />}
              />
              <SelectFilter
                label="Location"
                value={locationFilter}
                options={locationFilterOptions}
                onChange={setLocationFilter}
                icon={<MapPin className="w-4 h-4" />}
              />
              <SelectFilter
                label="Sales Rep"
                value={salesRepFilter}
                options={salesRepFilterOptions}
                onChange={setSalesRepFilter}
                icon={<User className="w-4 h-4" />}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {/* Alphabet Filter */}
            <AlphabetFilter
              selected={letterFilter}
              onSelect={setLetterFilter}
              items={contactNames}
            />
          </div>
        }
        emptyState={
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {hasActiveFilters ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term'
                : 'Get started by adding your first contact'}
            </p>
            {!hasActiveFilters && (
              <Button variant="primary" className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        }
      />

      {/* Add Contact Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          if (showAddCompanyModal || showAddMethodModal) return;
          closeModal();
        }}
        title="Add Contact"
        size="lg"
        hasUnsavedChanges={hasContactChanges}
        onSaveChanges={handleSave}
        onDiscardChanges={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Add Contact
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company *
            </label>
            <div className="relative" ref={companyDropdownRef}>
              <SearchInput
                value={companySearch}
                onChange={(val) => {
                  setCompanySearch(val);
                  setShowCompanyDropdown(true);
                  companyDropdownKeyboard.resetHighlight();
                  if (!val) setFormData({ ...formData, companyId: '' });
                }}
                onClear={() => {
                  setFormData({ ...formData, companyId: '' });
                  setShowCompanyDropdown(false);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                onKeyDown={companyDropdownKeyboard.handleKeyDown}
                placeholder="Search for a company or type to add new..."
                icon={<Building2 className="w-4 h-4" />}
              />
              {showCompanyDropdown && (companySearch || companies.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {showAddCompanyOption && (
                    <button
                      type="button"
                      onClick={openAddCompanyModal}
                      className={`w-full px-4 py-3 text-left text-sm text-brand-600 dark:text-brand-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 ${
                        companyDropdownKeyboard.highlightedIndex === 0
                          ? 'bg-brand-50 dark:bg-brand-900/20'
                          : 'hover:bg-brand-50 dark:hover:bg-brand-900/20'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add &quot;{companySearch.trim()}&quot; as new company</span>
                    </button>
                  )}
                  {filteredCompanies.map((company, index) => {
                    const highlightIndex = showAddCompanyOption ? index + 1 : index;
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => selectCompany(company)}
                        className={`w-full px-4 py-2 text-left text-sm text-slate-900 dark:text-white ${
                          highlightIndex === companyDropdownKeyboard.highlightedIndex
                            ? 'bg-brand-50 dark:bg-brand-900/20'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {company.name}
                      </button>
                    );
                  })}
                  {filteredCompanies.length === 0 && !showAddCompanyOption && (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      No companies found. Type a name to add one.
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.companyId && (
              <p className="mt-1 text-xs text-success-600 dark:text-success-400">
                ✓ Selected: {getCompanyName(formData.companyId)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="John"
            />
            <Input
              label="Last Name *"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as ContactRole | '' })}
            options={roleOptions}
            placeholder="Select a role..."
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone (Office)"
              type="tel"
              value={formData.phoneOffice}
              onChange={(e) => {
                const currentDigits = formData.phoneOffice.replace(/\D/g, '').length;
                const newDigits = e.target.value.replace(/\D/g, '').length;
                if (newDigits > currentDigits) {
                  setFormData({ ...formData, phoneOffice: formatPhoneNumber(e.target.value) });
                } else {
                  setFormData({ ...formData, phoneOffice: e.target.value });
                }
              }}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Phone (Mobile)"
              type="tel"
              value={formData.phoneMobile}
              onChange={(e) => {
                const currentDigits = formData.phoneMobile.replace(/\D/g, '').length;
                const newDigits = e.target.value.replace(/\D/g, '').length;
                if (newDigits > currentDigits) {
                  setFormData({ ...formData, phoneMobile: formatPhoneNumber(e.target.value) });
                } else {
                  setFormData({ ...formData, phoneMobile: e.target.value });
                }
              }}
              placeholder="(555) 987-6543"
            />
          </div>

          {/* Additional Contact Methods */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Additional Contact Methods
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddMethodModal(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            
            {formData.additionalContacts.length > 0 ? (
              <div className="space-y-2">
                {formData.additionalContacts.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {method.type === 'phone' && <Phone className="w-4 h-4 text-slate-400" />}
                      {method.type === 'fax' && <Printer className="w-4 h-4 text-slate-400" />}
                      {method.type === 'email' && <Mail className="w-4 h-4 text-slate-400" />}
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{method.label}</span>
                        <p className="text-sm text-slate-900 dark:text-white">{method.value}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMethod(method.id)}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No additional contact methods</p>
            )}
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Add Contact Method Modal */}
      <Modal
        isOpen={showAddMethodModal}
        onClose={() => {
          setShowAddMethodModal(false);
          setNewMethodType('phone');
          setNewMethodLabel('');
          setNewMethodValue('');
          setMethodValidationError(null);
        }}
        title="Add Contact Method"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddMethodModal(false);
                setNewMethodType('phone');
                setNewMethodLabel('');
                setNewMethodValue('');
                setMethodValidationError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMethod}>
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMethodTypeChange('phone')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'phone'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
              <button
                type="button"
                onClick={() => handleMethodTypeChange('fax')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'fax'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Printer className="w-4 h-4" />
                Fax
              </button>
              <button
                type="button"
                onClick={() => handleMethodTypeChange('email')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                  newMethodType === 'email'
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Label */}
          <Input
            label="Label *"
            value={newMethodLabel}
            onChange={(e) => setNewMethodLabel(e.target.value)}
            placeholder="e.g., Work, Home, Assistant"
          />

          {/* Value */}
          <div>
            <Input
              label={newMethodType === 'email' ? 'Email Address *' : newMethodType === 'fax' ? 'Fax Number *' : 'Phone Number *'}
              value={newMethodValue}
              onChange={(e) => handleNewMethodValueChange(e.target.value)}
              placeholder={newMethodType === 'email' ? 'email@example.com' : '(555) 123-4567'}
              error={methodValidationError || undefined}
            />
            {newMethodType !== 'email' && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use # for extension (e.g., (555) 123-4567 #123)
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Company Modal */}
      <Modal
        isOpen={showAddCompanyModal}
        onClose={() => {
          if (showSecondaryAddressModal || showDuplicateCompanyModal) return;
          closeAddCompanyModal();
        }}
        title="Add New Company"
        size="lg"
        hasUnsavedChanges={hasCompanyChanges}
        onSaveChanges={handleSaveCompany}
        onDiscardChanges={closeAddCompanyModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeAddCompanyModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCompany}>
              Add Company
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={companyFormData.name}
            onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
            placeholder="Enter company name"
            autoFocus
          />

          {activeUsers.length > 0 && (
            <Select
              label="Sales Rep"
              value={companyFormData.salesRepId}
              onChange={(e) => setCompanyFormData({ ...companyFormData, salesRepId: e.target.value })}
              options={salesRepOptions}
              placeholder="Select a sales rep..."
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={companyFormData.phone}
              onChange={(e) => {
                const currentDigits = companyFormData.phone.replace(/\D/g, '').length;
                const newDigits = e.target.value.replace(/\D/g, '').length;
                if (newDigits > currentDigits) {
                  setCompanyFormData({ ...companyFormData, phone: formatPhoneNumber(e.target.value) });
                } else {
                  setCompanyFormData({ ...companyFormData, phone: e.target.value });
                }
              }}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Website"
              type="url"
              value={companyFormData.website}
              onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Main Office Address
            </label>
            <AddressInput
              street={companyFormData.street}
              suite={companyFormData.suite}
              city={companyFormData.city}
              state={companyFormData.state}
              zip={companyFormData.zip}
              autoSave
              onSave={(address) => {
                setCompanyFormData({
                  ...companyFormData,
                  street: address.street,
                  suite: address.suite || '',
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                });
              }}
            />
          </div>

          {/* Secondary Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Additional Offices
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={openSecondaryAddressModal}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Office
              </Button>
            </div>
            
            {companyFormData.secondaryAddresses.length > 0 ? (
              <div className="space-y-2">
                {companyFormData.secondaryAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{addr.label}</span>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSecondaryAddress(addr.id)}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No additional offices</p>
            )}
          </div>

          <Textarea
            label="Notes"
            value={companyFormData.notes}
            onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Add Secondary Address Modal */}
      <Modal
        isOpen={showSecondaryAddressModal}
        onClose={() => setShowSecondaryAddressModal(false)}
        title="Add Additional Office"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSecondaryAddressModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSecondaryAddress}>
              Add Office
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Office Label *"
            value={secondaryAddressLabel}
            onChange={(e) => setSecondaryAddressLabel(e.target.value)}
            placeholder="e.g., Warehouse, Branch Office, Distribution Center"
            autoFocus
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Address
            </label>
            <AddressInput
              street={secondaryAddressData.street}
              suite={secondaryAddressData.suite}
              city={secondaryAddressData.city}
              state={secondaryAddressData.state}
              zip={secondaryAddressData.zip}
              autoSave
              onSave={(address) => {
                setSecondaryAddressData({
                  street: address.street,
                  suite: address.suite || '',
                  city: address.city,
                  state: address.state,
                  zip: address.zip,
                });
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Duplicate Company Modal */}
      <DuplicateCompanyModal
        isOpen={showDuplicateCompanyModal}
        duplicateType={duplicateCompanyType}
        existingCompany={duplicateCompany}
        newCompanyInfo={{
          name: companyFormData.name,
          phone: companyFormData.phone,
          website: companyFormData.website,
          street: companyFormData.street,
          city: companyFormData.city,
          state: companyFormData.state,
          zip: companyFormData.zip,
        }}
        onClose={handleCloseDuplicateCompanyModal}
        onViewExisting={handleViewExistingCompany}
        onAddAsNewLocation={handleAddAsNewLocation}
        onCreateSeparate={handleCreateSeparateCompany}
      />

      {/* Duplicate Contact Modal */}
      <DuplicateContactModal
        isOpen={showDuplicateModal}
        duplicateType={duplicateType}
        existingContact={duplicateContact}
        newContactInfo={newContactInfo}
        onClose={handleCloseDuplicateModal}
        onTransferAndUpdate={handleTransferAndUpdate}
        onCreateNew={handleCreateNew}
      />
    </Page>
  );
}