import { useEffect } from 'react';
import { useCompanyStore } from '@/contexts';

/**
 * Hook to set the document title dynamically
 * @param title - The page title (will be appended with company name)
 * @example useDocumentTitle('Notification Settings') // Results in "Notification Settings | S&G Portal"
 */
export function useDocumentTitle(title?: string) {
  const { company } = useCompanyStore();
  const companyName = company.name || 'S&G Portal';

  useEffect(() => {
    const previousTitle = document.title;
    
    if (title) {
      document.title = `${title} | ${companyName}`;
    } else {
      document.title = companyName;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, companyName]);
}