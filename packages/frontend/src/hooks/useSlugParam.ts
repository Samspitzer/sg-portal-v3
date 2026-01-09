/**
 * Slug Parameter Hooks
 * 
 * Centralized hooks for slug-based URL routing.
 * Use these hooks in detail pages to:
 * - Look up entities by slug
 * - Handle legacy ID-based URLs (redirect to slug)
 * - Provide consistent "not found" handling
 * 
 * @example
 * // In CompanyDetailPage:
 * const { company, notFound } = useCompanyBySlug();
 * 
 * // In ContactDetailPage:
 * const { contact, company, notFound } = useContactBySlug();
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientsStore, type Company, type Contact } from '@/contexts';
import { isLegacyId } from '@/utils/slugUtils';

interface UseCompanyBySlugResult {
  /** The company found by slug, or undefined if not found */
  company: Company | undefined;
  /** The slug/id parameter from the URL */
  param: string | undefined;
  /** True if the company was not found */
  notFound: boolean;
  /** True if we're redirecting from a legacy ID URL */
  isRedirecting: boolean;
}

interface UseContactBySlugResult {
  /** The contact found by slug, or undefined if not found */
  contact: Contact | undefined;
  /** The contact's company, or undefined if orphaned */
  company: Company | undefined;
  /** The slug/id parameter from the URL */
  param: string | undefined;
  /** True if the contact was not found */
  notFound: boolean;
  /** True if we're redirecting from a legacy ID URL */
  isRedirecting: boolean;
}

/**
 * Hook to get a company by its URL slug parameter
 * 
 * Features:
 * - Looks up company by slug field
 * - Falls back to ID lookup for legacy URLs
 * - Automatically redirects legacy ID URLs to slug URLs
 * 
 * @returns Company data and status flags
 * 
 * @example
 * function CompanyDetailPage() {
 *   const { company, notFound } = useCompanyBySlug();
 *   
 *   if (notFound) {
 *     return <NotFoundMessage />;
 *   }
 *   
 *   return <CompanyDetails company={company} />;
 * }
 */
export function useCompanyBySlug(): UseCompanyBySlugResult {
  const { id: param } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies } = useClientsStore();
  
  // Try to find by slug first, then by ID
  const company = param
    ? companies.find(c => c.slug === param) || companies.find(c => c.id === param)
    : undefined;
  
  // Check if we need to redirect from legacy ID to slug
  const shouldRedirect = param && company?.slug && isLegacyId(param) && company.id === param;
  
  useEffect(() => {
    if (shouldRedirect && company?.slug) {
      // Replace the URL with the slug version (no history entry)
      navigate(`/clients/companies/${company.slug}`, { replace: true });
    }
  }, [shouldRedirect, company?.slug, navigate]);
  
  return {
    company,
    param,
    notFound: !!param && !company,
    isRedirecting: !!shouldRedirect,
  };
}

/**
 * Hook to get a contact by its URL slug parameter
 * 
 * Features:
 * - Looks up contact by slug field
 * - Falls back to ID lookup for legacy URLs
 * - Automatically redirects legacy ID URLs to slug URLs
 * - Also returns the contact's company
 * 
 * @returns Contact data, company data, and status flags
 * 
 * @example
 * function ContactDetailPage() {
 *   const { contact, company, notFound } = useContactBySlug();
 *   
 *   if (notFound) {
 *     return <NotFoundMessage />;
 *   }
 *   
 *   return <ContactDetails contact={contact} company={company} />;
 * }
 */
export function useContactBySlug(): UseContactBySlugResult {
  const { id: param } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, companies } = useClientsStore();
  
  // Try to find by slug first, then by ID
  const contact = param
    ? contacts.find(c => c.slug === param) || contacts.find(c => c.id === param)
    : undefined;
  
  // Get the contact's company
  const company = contact
    ? companies.find(c => c.id === contact.companyId)
    : undefined;
  
  // Check if we need to redirect from legacy ID to slug
  const shouldRedirect = param && contact?.slug && isLegacyId(param) && contact.id === param;
  
  useEffect(() => {
    if (shouldRedirect && contact?.slug) {
      // Replace the URL with the slug version (no history entry)
      navigate(`/clients/contacts/${contact.slug}`, { replace: true });
    }
  }, [shouldRedirect, contact?.slug, navigate]);
  
  return {
    contact,
    company,
    param,
    notFound: !!param && !contact,
    isRedirecting: !!shouldRedirect,
  };
}

/**
 * Get the URL path for a company (uses slug if available, falls back to id)
 * Use this everywhere you need to link to a company
 * 
 * @example
 * navigate(getCompanyUrl(company));
 * <Link to={getCompanyUrl(company)}>View Company</Link>
 */
export function getCompanyUrl(company: Company): string {
  return `/clients/companies/${company.slug || company.id}`;
}

/**
 * Get the URL path for a contact (uses slug if available, falls back to id)
 * Use this everywhere you need to link to a contact
 * 
 * @example
 * navigate(getContactUrl(contact));
 * <Link to={getContactUrl(contact)}>View Contact</Link>
 */
export function getContactUrl(contact: Contact): string {
  return `/clients/contacts/${contact.slug || contact.id}`;
}