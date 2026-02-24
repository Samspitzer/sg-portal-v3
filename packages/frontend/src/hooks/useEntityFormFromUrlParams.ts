// ============================================================================
// useEntityFormFromUrlParams
// Location: src/hooks/useEntityFormFromUrlParams.ts
//
// Reads URL params (?newDeal=true / ?newLead=true) and opens the appropriate
// add-form with pre-filled company/contact context.
//
// Replaces the identical ~40-line useEffect blocks in DealsPage and LeadsPage.
//
// Usage:
//   useEntityFormFromUrlParams('newDeal', openAddDeal);
//   useEntityFormFromUrlParams('newLead', openAddLead);
// ============================================================================

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClientsStore } from '@/contexts';

interface EntityFormOptions {
  defaultName?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
}

export function useEntityFormFromUrlParams(
  paramKey: string,
  openForm: (options: EntityFormOptions) => void
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { companies, contacts } = useClientsStore();

  useEffect(() => {
    if (searchParams.get(paramKey) !== 'true') return;

    const companyId = searchParams.get('companyId');
    const contactId = searchParams.get('contactId');
    const name = searchParams.get('name');

    let defaultCompanyId: string | undefined;
    let defaultCompanyName: string | undefined;
    let defaultContactId: string | undefined;
    let defaultContactName: string | undefined;

    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        defaultCompanyId = company.id;
        defaultCompanyName = company.name;
      }
    }

    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        defaultContactId = contact.id;
        defaultContactName = `${contact.firstName} ${contact.lastName}`.trim();
        // Resolve company from contact if not already set
        if (!defaultCompanyId && contact.companyId) {
          const company = companies.find(c => c.id === contact.companyId);
          if (company) {
            defaultCompanyId = company.id;
            defaultCompanyName = company.name;
          }
        }
      }
    }

    openForm({
      defaultName: name || undefined,
      defaultCompanyId,
      defaultCompanyName,
      defaultContactId,
      defaultContactName,
    });

    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramKey, companies, contacts]);
}