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
 * 
 * // In UserDetailPage:
 * const { user, notFound } = useUserBySlug();
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientsStore, useUsersStore, type Company, type Contact, type User } from '@/contexts';
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

interface UseUserBySlugResult {
  /** The user found by slug, or undefined if not found */
  user: User | undefined;
  /** The slug/id parameter from the URL */
  param: string | undefined;
  /** True if the user was not found */
  notFound: boolean;
  /** True if we're redirecting from a legacy ID URL */
  isRedirecting: boolean;
}

/**
 * Hook to get a company by its URL slug parameter
 */
export function useCompanyBySlug(): UseCompanyBySlugResult {
  const { id: param } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies } = useClientsStore();
  
  const company = param
    ? companies.find(c => c.slug === param) || companies.find(c => c.id === param)
    : undefined;
  
  const shouldRedirect = param && company?.slug && isLegacyId(param) && company.id === param;
  
  useEffect(() => {
    if (shouldRedirect && company?.slug) {
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
 */
export function useContactBySlug(): UseContactBySlugResult {
  const { id: param } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, companies } = useClientsStore();
  
  const contact = param
    ? contacts.find(c => c.slug === param) || contacts.find(c => c.id === param)
    : undefined;
  
  const company = contact
    ? companies.find(c => c.id === contact.companyId)
    : undefined;
  
  const shouldRedirect = param && contact?.slug && isLegacyId(param) && contact.id === param;
  
  useEffect(() => {
    if (shouldRedirect && contact?.slug) {
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
 * Hook to get a user by its URL slug parameter
 */
export function useUserBySlug(): UseUserBySlugResult {
  const { userId: param } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users } = useUsersStore();
  
  const user = param
    ? users.find(u => u.slug === param) || users.find(u => u.id === param)
    : undefined;
  
  const shouldRedirect = param && user?.slug && isLegacyId(param) && user.id === param;
  
  useEffect(() => {
    if (shouldRedirect && user?.slug) {
      navigate(`/admin/users/${user.slug}`, { replace: true });
    }
  }, [shouldRedirect, user?.slug, navigate]);
  
  return {
    user,
    param,
    notFound: !!param && !user,
    isRedirecting: !!shouldRedirect,
  };
}

/**
 * Get the URL path for a company (uses slug if available, falls back to id)
 */
export function getCompanyUrl(company: Company): string {
  return `/clients/companies/${company.slug || company.id}`;
}

/**
 * Get the URL path for a contact (uses slug if available, falls back to id)
 */
export function getContactUrl(contact: Contact): string {
  return `/clients/contacts/${contact.slug || contact.id}`;
}

/**
 * Get the URL path for a user (uses slug if available, falls back to id)
 */
export function getUserUrl(user: User): string {
  return `/admin/users/${user.slug || user.id}`;
}