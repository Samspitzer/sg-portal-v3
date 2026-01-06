// ============================================================================
// Common Validation & Formatting Utilities
// Location: src/utils/validation.ts
// 
// Use these functions site-wide for consistent validation and formatting
// of phone numbers, emails, and addresses.
// ============================================================================

// ----------------------------------------------------------------------------
// PHONE NUMBER UTILITIES
// ----------------------------------------------------------------------------

/**
 * Format phone number as (XXX) XXX-XXXX with optional extension
 * Automatically formats as user types
 * 
 * @param input - Raw phone input (e.g., "5551234567" or "5551234567#123")
 * @returns Formatted phone (e.g., "(555) 123-4567" or "(555) 123-4567 #123")
 * 
 * @example
 * formatPhoneNumber("5551234567")       // "(555) 123-4567"
 * formatPhoneNumber("5551234567#123")   // "(555) 123-4567 #123"
 * formatPhoneNumber("555")              // "(555"
 */
export const formatPhoneNumber = (input: string): string => {
  if (!input) return '';
  
  // Check for extension
  const hasExtension = input.includes('#');
  let extension = '';
  let phoneDigits = input;
  
  if (hasExtension) {
    const parts = input.split('#');
    phoneDigits = parts[0] ?? '';
    extension = parts.slice(1).join('');
  }
  
  // Remove all non-digit characters
  const digits = phoneDigits.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  let formatted = '';
  if (digits.length > 0) {
    formatted = '(' + digits.substring(0, 3);
  }
  if (digits.length >= 3) {
    formatted += ') ' + digits.substring(3, 6);
  }
  if (digits.length >= 6) {
    formatted += '-' + digits.substring(6, 10);
  }
  
  // Add extension if present
  if (hasExtension && extension) {
    formatted += ' #' + extension.replace(/\D/g, '');
  } else if (hasExtension) {
    formatted += ' #';
  }
  
  return formatted;
};

/**
 * Validate phone number (must be 10 digits, extension optional)
 * 
 * @param phone - Phone number to validate (can be formatted or raw)
 * @returns true if valid, false if invalid
 * 
 * @example
 * validatePhone("(555) 123-4567")       // true
 * validatePhone("5551234567")           // true
 * validatePhone("(555) 123-4567 #123")  // true
 * validatePhone("555-1234")             // false (not 10 digits)
 * validatePhone("")                     // true (empty is allowed)
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Empty is OK
  
  // Remove extension for validation
  const phoneWithoutExt = phone.split('#')[0] ?? '';
  const digits = phoneWithoutExt.replace(/\D/g, '');
  
  return digits.length === 10;
};

/**
 * Get phone validation error message
 * 
 * @param phone - Phone number to validate
 * @returns Error message or null if valid
 */
export const getPhoneError = (phone: string): string | null => {
  if (!phone) return null;
  if (!validatePhone(phone)) {
    return 'Invalid phone number';
  }
  return null;
};

/**
 * Extract raw digits from formatted phone (useful for storing/comparing)
 * 
 * @param phone - Formatted phone number
 * @returns Raw digits with extension (e.g., "5551234567#123")
 */
export const getPhoneDigits = (phone: string): string => {
  if (!phone) return '';
  
  const hasExtension = phone.includes('#');
  if (hasExtension) {
    const parts = phone.split('#');
    const digits = (parts[0] ?? '').replace(/\D/g, '');
    const ext = (parts[1] ?? '').replace(/\D/g, '');
    return ext ? `${digits}#${ext}` : digits;
  }
  
  return phone.replace(/\D/g, '');
};


// ----------------------------------------------------------------------------
// EMAIL UTILITIES
// ----------------------------------------------------------------------------

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns true if valid, false if invalid
 * 
 * @example
 * validateEmail("user@example.com")     // true
 * validateEmail("user@sub.example.com") // true
 * validateEmail("invalid-email")        // false
 * validateEmail("")                     // true (empty is allowed)
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Empty is OK
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Get email validation error message
 * 
 * @param email - Email to validate
 * @returns Error message or null if valid
 */
export const getEmailError = (email: string): string | null => {
  if (!email) return null;
  if (!validateEmail(email)) {
    return 'Invalid email address';
  }
  return null;
};

/**
 * Normalize email (lowercase, trim whitespace)
 * 
 * @param email - Email to normalize
 * @returns Normalized email
 */
export const normalizeEmail = (email: string): string => {
  return email?.trim().toLowerCase() || '';
};


// ----------------------------------------------------------------------------
// ADDRESS UTILITIES
// ----------------------------------------------------------------------------

/**
 * Format full address as a single line
 * 
 * @param address - Address object with street, city, state, zip
 * @returns Formatted address string
 * 
 * @example
 * formatAddress({ street: "123 Main St", city: "New York", state: "NY", zip: "10001" })
 * // "123 Main St, New York, NY 10001"
 */
export const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
} | undefined): string => {
  if (!address) return '';
  
  const parts: string[] = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state && address.zip) {
    parts.push(`${address.state} ${address.zip}`);
  } else if (address.state) {
    parts.push(address.state);
  } else if (address.zip) {
    parts.push(address.zip);
  }
  
  return parts.join(', ');
};

/**
 * Validate ZIP code (5 digits or 5+4 format)
 * 
 * @param zip - ZIP code to validate
 * @returns true if valid, false if invalid
 * 
 * @example
 * validateZip("10001")      // true
 * validateZip("10001-1234") // true
 * validateZip("1000")       // false
 * validateZip("")           // true (empty is allowed)
 */
export const validateZip = (zip: string): boolean => {
  if (!zip) return true; // Empty is OK
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip.trim());
};

/**
 * Get ZIP validation error message
 * 
 * @param zip - ZIP code to validate
 * @returns Error message or null if valid
 */
export const getZipError = (zip: string): string | null => {
  if (!zip) return null;
  if (!validateZip(zip)) {
    return 'ZIP code must be 5 digits (or 5+4 format)';
  }
  return null;
};

/**
 * Format ZIP code (add dash for 9-digit ZIP)
 * 
 * @param zip - ZIP code to format
 * @returns Formatted ZIP code
 */
export const formatZip = (zip: string): string => {
  if (!zip) return '';
  
  const digits = zip.replace(/\D/g, '');
  
  if (digits.length <= 5) {
    return digits;
  }
  
  return `${digits.substring(0, 5)}-${digits.substring(5, 9)}`;
};

/**
 * Validate US state abbreviation
 * 
 * @param state - State abbreviation to validate
 * @returns true if valid, false if invalid
 */
export const validateState = (state: string): boolean => {
  if (!state) return true; // Empty is OK
  
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP' // Include territories
  ];
  
  return validStates.includes(state.toUpperCase().trim());
};

/**
 * Get state validation error message
 * 
 * @param state - State to validate
 * @returns Error message or null if valid
 */
export const getStateError = (state: string): string | null => {
  if (!state) return null;
  if (!validateState(state)) {
    return 'Please enter a valid state abbreviation';
  }
  return null;
};

/**
 * List of US states for dropdowns
 */
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'VI', label: 'Virgin Islands' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] as const;


// ----------------------------------------------------------------------------
// WEBSITE/URL UTILITIES
// ----------------------------------------------------------------------------

/**
 * Validate website URL
 * 
 * @param url - URL to validate
 * @returns true if valid, false if invalid
 * 
 * @example
 * validateWebsite("https://example.com")  // true
 * validateWebsite("www.example.com")      // true
 * validateWebsite("example.com")          // true
 * validateWebsite("not a url")            // false
 * validateWebsite("test")                 // false (no TLD)
 * validateWebsite("")                     // true (empty is allowed)
 */
export const validateWebsite = (url: string): boolean => {
  if (!url) return true; // Empty is OK
  
  const trimmedUrl = url.trim();
  
  // Must have at least one dot (for TLD) - e.g., example.com
  if (!trimmedUrl.includes('.')) {
    return false;
  }
  
  // Add protocol if missing for URL validation
  let testUrl = trimmedUrl;
  if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
    testUrl = 'https://' + testUrl;
  }
  
  try {
    const parsed = new URL(testUrl);
    // Must have a valid hostname with at least one dot
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
};

/**
 * Get website validation error message
 * 
 * @param url - URL to validate
 * @returns Error message or null if valid
 */
export const getWebsiteError = (url: string): string | null => {
  if (!url) return null;
  if (!validateWebsite(url)) {
    return 'Please enter a valid website URL';
  }
  return null;
};

/**
 * Format website URL (ensure protocol, clean up)
 * 
 * @param url - URL to format
 * @returns Formatted URL
 * 
 * @example
 * formatWebsite("example.com")        // "https://example.com"
 * formatWebsite("www.example.com")    // "https://www.example.com"
 * formatWebsite("http://example.com") // "http://example.com"
 */
export const formatWebsite = (url: string): string => {
  if (!url) return '';
  
  let formatted = url.trim();
  
  // Don't modify if already has protocol
  if (formatted.startsWith('http://') || formatted.startsWith('https://')) {
    return formatted;
  }
  
  // Add https:// by default
  return 'https://' + formatted;
};

/**
 * Get display-friendly website (without protocol)
 * 
 * @param url - URL to format for display
 * @returns URL without protocol
 * 
 * @example
 * getDisplayWebsite("https://www.example.com") // "www.example.com"
 */
export const getDisplayWebsite = (url: string): string => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
};