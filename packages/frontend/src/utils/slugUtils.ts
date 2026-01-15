// PATH: src/utils/slugUtils.ts

/**
 * Slug Utilities for URL-friendly identifiers
 * 
 * Generates clean, readable URLs like:
 * - /clients/companies/acme-construction
 * - /clients/contacts/john-doe
 * - /admin/users/john-smith
 * 
 * Handles duplicates by appending numbers:
 * - acme-construction, acme-construction-2, acme-construction-3
 */

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphenated slug
 * 
 * @example
 * generateSlug("Acme Construction LLC") // "acme-construction-llc"
 * generateSlug("John O'Brien") // "john-obrien"
 * generateSlug("ABC & Sons, Inc.") // "abc-and-sons-inc"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace & with "and"
    .replace(/&/g, 'and')
    // Remove apostrophes (don't replace with hyphen)
    .replace(/'/g, '')
    // Replace any non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-');
}

/**
 * Generate a unique slug by checking against existing slugs
 * Appends -2, -3, etc. if the base slug already exists
 * 
 * @param text - The text to convert to a slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 * 
 * @example
 * generateUniqueSlug("Acme", ["acme", "acme-2"]) // "acme-3"
 * generateUniqueSlug("New Company", []) // "new-company"
 */
export function generateUniqueSlug(
  text: string,
  existingSlugs: string[]
): string {
  const baseSlug = generateSlug(text);
  
  if (!baseSlug) {
    // Fallback for empty/invalid text
    return `item-${Date.now()}`;
  }
  
  // Check if base slug is available
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  // Find the next available number
  let counter = 2;
  let candidateSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(candidateSlug)) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
  
  return candidateSlug;
}

/**
 * Generate a company slug from company name
 */
export function generateCompanySlug(
  name: string,
  existingCompanies: Array<{ id: string; slug?: string }>,
  excludeId?: string
): string {
  const existingSlugs = existingCompanies
    .filter(c => c.id !== excludeId && c.slug)
    .map(c => c.slug!);
  
  return generateUniqueSlug(name, existingSlugs);
}

/**
 * Generate a contact slug from first and last name
 * Format: first-last (e.g., "john-doe")
 */
export function generateContactSlug(
  firstName: string,
  lastName: string,
  existingContacts: Array<{ id: string; slug?: string }>,
  excludeId?: string
): string {
  const fullName = `${firstName} ${lastName}`.trim();
  const existingSlugs = existingContacts
    .filter(c => c.id !== excludeId && c.slug)
    .map(c => c.slug!);
  
  return generateUniqueSlug(fullName, existingSlugs);
}

/**
 * Generate a user slug from user name
 * Format: first-last (e.g., "john-smith")
 */
export function generateUserSlug(
  name: string,
  existingUsers: Array<{ id: string; slug?: string }>,
  excludeId?: string
): string {
  const existingSlugs = existingUsers
    .filter(u => u.id !== excludeId && u.slug)
    .map(u => u.slug!);
  
  return generateUniqueSlug(name, existingSlugs);
}

/**
 * Check if a string looks like an old-style ID (for redirect purposes)
 * Old IDs look like: "company-1767885526746", "contact-1767885526746", or "user-1767885526746"
 */
export function isLegacyId(param: string): boolean {
  return /^(company|contact|user)-\d{10,}$/.test(param);
}

/**
 * Validate that a slug is properly formatted
 */
export function isValidSlug(slug: string): boolean {
  // Must be lowercase, alphanumeric with hyphens, no leading/trailing hyphens
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}