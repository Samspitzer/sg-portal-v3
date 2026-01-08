# S&G Portal V3 - Development Guide

> **For Claude/AI Assistants:** Read this document at the start of each session to understand existing patterns and avoid recreating functionality.

---

## Table of Contents

1. [Locked Files - DO NOT MODIFY](#-locked-files---do-not-modify)
2. [Common Components](#common-components)
3. [Custom Hooks](#custom-hooks)
4. [Utils](#utils)
5. [Stores/Contexts](#storescontexts)
6. [Layout Components](#layout-components)
7. [Established Patterns](#established-patterns)
8. [Keyboard Navigation Standards](#keyboard-navigation-standards)
9. [Modal vs Toast Guidelines](#modal-vs-toast-guidelines)
10. [File Structure](#file-structure)
11. [Adding New Features Checklist](#adding-new-features-checklist)

---

## ⚠️ IMPORTANT RULES

**Before creating any new component or functionality:**

1. **ALWAYS check this document first** - The component or pattern you need likely already exists
2. **ALWAYS use `useDropdownKeyboard` hook** for ANY dropdown, select, or autocomplete component
3. **ALWAYS use existing common components** - Don't recreate buttons, inputs, modals, etc.
4. **ALWAYS follow keyboard navigation standards** - Arrow keys, Enter, Escape must work consistently
5. **ALWAYS register user dependencies** - When creating stores with user assignments, register with `userDependencyRegistry`

---

## 🔒 LOCKED FILES - DO NOT MODIFY

> **Locked as of:** January 7, 2026
> **Unlock phase:** Production Phase 2

The following files have been tested, audited, and approved. **DO NOT modify these files** until we move to the next production phase:

### Pages
| File | Location | Status |
|------|----------|--------|
| `ManageUsersPage.tsx` | `src/pages/admin/` | 🔒 LOCKED |
| `CompanySettingsPage.tsx` | `src/pages/admin/` | 🔒 LOCKED |
| `CompanyDetailPage.tsx` | `src/components/panels/customers/` | 🔒 LOCKED |

### Stores
| File | Location | Status |
|------|----------|--------|
| `companyStore.ts` | `src/contexts/` | 🔒 LOCKED |
| `usersStore.ts` | `src/contexts/` | 🔒 LOCKED |

**If changes are absolutely necessary:**
1. Discuss with project lead first
2. Document the reason for the change
3. Ensure all existing functionality remains intact
4. Update this document after approval

---

## Common Components

Location: `src/components/common/`

### Button
**File:** `Button.tsx`

**Purpose:** Standardized button component with variants and sizes.

**Props:**
- `variant`: `'primary'` | `'secondary'` | `'danger'` | `'ghost'` | `'accent'` | `'outline'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `disabled`: boolean
- `children`: ReactNode

**Usage:**
```tsx
import { Button } from '@/components/common';

<Button variant="primary" onClick={handleSave}>Save</Button>
<Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
```

---

### Input
**File:** `Input.tsx`

**Purpose:** Form input with label, error states, icons, addons, and **automatic validation** for common field types.

**Props:**
- `label`: string (optional)
- `error`: string (optional) - External error takes priority over auto-validation
- `hint`: string (optional)
- `leftIcon` / `rightIcon`: ReactNode
- `leftAddon` / `rightAddon`: string
- `required`: boolean
- `disableAutoValidation`: boolean (optional) - Disable built-in validation
- `type`: string - Supports auto-validation for `'email'`, `'tel'`, `'url'`
- All standard input HTML attributes

**Auto-Validation Features:**
- `type="email"` → Validates email format, shows "Invalid email address"
- `type="tel"` → Validates 10-digit phone, auto-formats as `(555) 123-4567`
- `type="url"` → Validates URL format (must have TLD), shows "Invalid website URL"

**Phone Formatting Behavior:**
- Formats automatically while typing digits
- Backspace works normally (no re-formatting on delete)
- Supports extensions: `(555) 123-4567 #ext`

**Usage:**
```tsx
import { Input } from '@/components/common';

// With auto-validation (default)
<Input 
  label="Email" 
  type="email" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)}
/>

// With auto-formatting phone
<Input 
  label="Phone" 
  type="tel" 
  value={phone} 
  onChange={(e) => setPhone(e.target.value)}
/>

// Disable auto-validation when needed
<Input 
  label="ZIP Code" 
  value={zip} 
  onChange={(e) => setZip(e.target.value)}
  disableAutoValidation
/>
```

---

### Select
**File:** `Select.tsx`

**Purpose:** Styled native select dropdown with label and error support.

**Props:**
- `label`: string (optional)
- `options`: SelectOption[] - `{ value: string, label: string }`
- `placeholder`: string (optional) - Shows as first disabled option
- `error`: string (optional)
- `hint`: string (optional)
- `disabled`: boolean (optional)
- All standard select HTML attributes

**Usage:**
```tsx
import { Select } from '@/components/common';

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'Standard User' },
];

<Select
  label="Role"
  value={formData.role}
  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
  options={roleOptions}
  placeholder="Select a role..."
/>
```

---

### Textarea
**File:** `Textarea.tsx`

**Purpose:** Multi-line text input with label and error support.

**Props:**
- `label`: string (optional)
- `error`: string (optional)
- `hint`: string (optional)
- `rows`: number (default: 3)
- All standard textarea HTML attributes

**Usage:**
```tsx
import { Textarea } from '@/components/common';

<Textarea
  label="Notes"
  value={formData.notes}
  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
  rows={4}
  placeholder="Add any additional notes..."
/>
```

---

### Toggle
**File:** `Toggle.tsx`

**Purpose:** Toggle/switch component for boolean values.

**Props:**
- `checked`: boolean - Whether the toggle is on
- `onChange`: (checked: boolean) => void
- `onClick`: (e: React.MouseEvent) => void (optional) - For intercepting clicks
- `label`: string (optional)
- `labelPosition`: `'left'` | `'right'` (default: 'right')
- `size`: `'sm'` | `'md'` | `'lg'` (default: 'md')
- `disabled`: boolean (optional)
- `activeColor`: `'brand'` | `'success'` | `'warning'` | `'danger'` (default: 'brand')
- `className`: string (optional)

**Usage:**
```tsx
import { Toggle } from '@/components/common';

// Basic usage
<Toggle
  checked={isActive}
  onChange={(checked) => setIsActive(checked)}
  label="Active"
/>

// In a table (with click handler for confirmation)
<Toggle
  checked={user.isActive}
  onChange={() => {}}
  onClick={(e) => handleToggleClick(user, e)}
  activeColor="success"
/>

// Different sizes
<Toggle checked={value} onChange={setValue} size="sm" />
<Toggle checked={value} onChange={setValue} size="lg" />
```

---

### AddressInput
**File:** `AddressInput.tsx`

**Purpose:** Address input with Radar.io autocomplete and Save/Discard pattern.

**Props:**
- `street`: string
- `suite`: string (optional)
- `city`: string
- `state`: string
- `zip`: string
- `onSave`: (address: AddressData) => void - Called when user clicks Save
- `autoSave`: boolean (optional) - Auto-save on selection (for modals)
- `disabled`: boolean (optional)
- `required`: boolean (optional)
- `className`: string (optional)

**Features:**
- Radar.io autocomplete on street field (type 3+ chars)
- Auto-populates City, State, ZIP when address selected
- Local state - changes don't save until "Save Address" clicked (unless autoSave)
- Unsaved changes modal when clicking outside with changes
- Keyboard navigation for suggestions (Arrow keys, Enter, Escape)
- Falls back to manual input if API not configured

**Setup:**
Add to `packages/frontend/.env`:
```
VITE_RADAR_PUBLISHABLE_KEY=prj_test_pk_xxxxxxxxxxxxx
```

**Usage:**
```tsx
import { AddressInput } from '@/components/common';

// Standard usage with Save button
<AddressInput
  street={company.address?.street || ''}
  suite={company.address?.suite || ''}
  city={company.address?.city || ''}
  state={company.address?.state || ''}
  zip={company.address?.zip || ''}
  onSave={(address) => {
    updateCompany(company.id, { address });
    toast.success('Updated', 'Address saved');
  }}
/>

// In modals - auto-save on selection
<AddressInput
  street={formData.street}
  suite={formData.suite}
  city={formData.city}
  state={formData.state}
  zip={formData.zip}
  autoSave
  onSave={(address) => {
    setFormData({ ...formData, ...address });
  }}
/>
```

---

### UnsavedChangesModal
**File:** `UnsavedChangesModal.tsx`

**Purpose:** Reusable modal dialog for confirming unsaved changes. Can be used standalone.

**Props:**
- `isOpen`: boolean
- `onSave`: () => void
- `onDiscard`: () => void
- `onCancel`: () => void - "Keep Editing" action
- `title`: string (optional, default: "Unsaved Changes")
- `message`: string (optional)

**Features:**
- Focus trapping
- Keyboard navigation (Tab cycles buttons, Escape = Keep Editing)
- Framer Motion animations
- Renders via portal (always on top)

**Usage:**
```tsx
import { UnsavedChangesModal } from '@/components/common';

<UnsavedChangesModal
  isOpen={showModal}
  onSave={handleSave}
  onDiscard={handleDiscard}
  onCancel={() => setShowModal(false)}
/>
```

---

### UserDeactivationModal
**File:** `UserDeactivationModal.tsx`

**Purpose:** Modal for deactivating/deleting users with dependency checking and reassignment.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `onConfirm`: (reassignToUserId: string | null) => void
- `user`: { id: string, name: string } | null
- `mode`: `'deactivate'` | `'delete'`

**Features:**
- Automatically scans all registered modules for user assignments
- Shows categorized list of affected items (expandable)
- Links to view each affected item
- Two reassignment options:
  - Reassign to another user (with user selector)
  - Leave unassigned (to be handled later)
- Works with the User Dependency Registry system

**Usage:**
```tsx
import { UserDeactivationModal } from '@/components/common';

<UserDeactivationModal
  isOpen={!!userToDeactivate}
  onClose={() => setUserToDeactivate(null)}
  onConfirm={(reassignToUserId) => {
    deactivateUser(userToDeactivate.id);
    toast.success('Deactivated', 'User has been deactivated');
  }}
  user={userToDeactivate}
  mode="deactivate"
/>
```

---

### SearchInput
**File:** `SearchInput.tsx`

**Purpose:** Search input with icon, clear button, and keyboard navigation support.

**Props:**
- `value`: string
- `onChange`: (value: string) => void
- `onClear`: () => void (optional)
- `onKeyDown`: (e: KeyboardEvent) => void (optional) - **for dropdown navigation**
- `onFocus`: () => void (optional)
- `showClearButton`: boolean (default: true)
- `icon`: ReactNode (optional, defaults to Search icon)
- `placeholder`: string

**Usage:**
```tsx
import { SearchInput } from '@/components/common';

<SearchInput
  value={search}
  onChange={setSearch}
  onKeyDown={dropdownKeyboard.handleKeyDown}  // For dropdown navigation
  onFocus={() => setShowDropdown(true)}
  placeholder="Search companies..."
  icon={<Building2 className="w-4 h-4" />}
/>
```

---

### SelectFilter
**File:** `SelectFilter.tsx`

**Purpose:** Dropdown filter button with keyboard navigation, search (for 5+ options), and ESC to clear.

**Props:**
- `label`: string - Label shown when nothing is selected
- `value`: string - Currently selected value (empty string = all)
- `options`: SelectFilterOption[] - `{ value: string, label: string, count?: number }`
- `onChange`: (value: string) => void
- `icon`: ReactNode (optional)
- `showAllOption`: boolean (default: true)
- `allLabel`: string (default: "All")
- `className`: string (optional)
- `searchThreshold`: number (default: 5) - Min options to show search

**Features:**
- Keyboard navigation: Arrow Up/Down, Enter, Escape
- Search input appears when > 5 options
- ESC clears filter when focused
- Max height with scroll for long lists

**Usage:**
```tsx
import { SelectFilter } from '@/components/common';

// Build options from data
const locationOptions = useMemo(() => {
  const locations = new Map<string, number>();
  companies.forEach((company) => {
    const loc = getLocation(company);
    if (loc) {
      locations.set(loc, (locations.get(loc) || 0) + 1);
    }
  });
  return Array.from(locations.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}, [companies]);

<SelectFilter
  label="Location"
  value={locationFilter}
  options={locationOptions}
  onChange={setLocationFilter}
  icon={<MapPin className="w-4 h-4" />}
/>
```

---

### DataTable
**File:** `DataTable.tsx`

**Purpose:** Reusable data table with sorting, scrolling, filters slot, and empty state.

**Props:**
- `columns`: DataTableColumn<T>[] - Column definitions
- `data`: T[] - Data array
- `rowKey`: (item: T) => string - Unique key for each row
- `onRowClick`: (item: T) => void (optional)
- `sortField`: string (optional)
- `sortDirection`: 'asc' | 'desc' (optional)
- `onSort`: (field: string) => void (optional)
- `filters`: ReactNode (optional) - Search/filter bar content
- `emptyState`: ReactNode (optional) - Content when data is empty
- `loading`: boolean (optional)
- `className`: string (optional)

**Column Definition:**
```tsx
interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}
```

**Usage:**
```tsx
import { DataTable, type DataTableColumn } from '@/components/common';

const columns: DataTableColumn<Company>[] = [
  {
    key: 'name',
    header: 'Company Name',
    sortable: true,
    render: (company) => (
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4" />
        <span>{company.name}</span>
      </div>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    sortable: true,
    render: (company) => company.address?.city || '—',
    hideOnMobile: true,
  },
];

<DataTable
  columns={columns}
  data={filteredCompanies}
  rowKey={(company) => company.id}
  onRowClick={(company) => navigate(`/companies/${company.id}`)}
  sortField={sortField}
  sortDirection={sortDirection}
  onSort={handleSort}
  filters={<SearchInput ... />}
  emptyState={<EmptyState />}
/>
```

---

### AlphabetFilter
**File:** `AlphabetFilter.tsx`

**Purpose:** A-Z filter bar with numbers. Only shows letters/numbers that have items.

**Props:**
- `selected`: string | null
- `onSelect`: (letter: string | null) => void
- `items`: string[] - array of names to determine available letters/numbers

**Features:**
- Shows "All" button
- Only shows numbers (0-9) if items start with numbers
- Disabled state for letters with no items
- Responsive sizing

**Usage:**
```tsx
import { AlphabetFilter } from '@/components/common';

const companyNames = companies.map(c => c.name);

<AlphabetFilter
  selected={letterFilter}
  onSelect={setLetterFilter}
  items={companyNames}
/>
```

---

### Card, CardHeader, CardContent, CardFooter
**File:** `Card.tsx`

**Purpose:** Container components for content sections.

**Usage:**
```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/common';

<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Actions here</CardFooter>
</Card>
```

---

### Modal
**File:** `Modal.tsx`

**Purpose:** Dialog/modal with unsaved changes detection built-in.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `size`: `'sm'` | `'md'` | `'lg'` | `'xl'`
- `footer`: ReactNode (optional)
- `hasUnsavedChanges`: boolean (optional) - enables unsaved changes modal
- `onSaveChanges`: () => void (optional)
- `onDiscardChanges`: () => void (optional)
- `children`: ReactNode

**Usage:**
```tsx
import { Modal, Button } from '@/components/common';

<Modal
  isOpen={showModal}
  onClose={closeModal}
  title="Add Contact"
  size="lg"
  hasUnsavedChanges={hasChanges}
  onSaveChanges={handleSave}
  onDiscardChanges={closeModal}
  footer={
    <>
      <Button variant="secondary" onClick={closeModal}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save</Button>
    </>
  }
>
  {/* Form content */}
</Modal>
```

---

### ConfirmModal
**File:** `Modal.tsx`

**Purpose:** Simple confirmation dialog for destructive actions.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `onConfirm`: () => void
- `title`: string
- `message`: string
- `confirmText`: string (default: "Confirm")
- `variant`: `'danger'` | `'warning'` (default: "danger")

**Usage:**
```tsx
import { ConfirmModal } from '@/components/common';

<ConfirmModal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={handleDelete}
  title="Delete Contact"
  message="Are you sure you want to delete this contact?"
  confirmText="Delete"
  variant="danger"
/>
```

---

### CollapsibleSection
**File:** `CollapsibleSection.tsx`

**Purpose:** Expandable/collapsible content section with header.

**Props:**
- `title`: string
- `icon`: ReactNode (optional)
- `defaultOpen`: boolean (default: false) - **Note: Sections default to COLLAPSED**
- `badge`: string | number (optional) - Shows a badge next to title
- `action`: ReactNode (optional) - Action button in header
- `children`: ReactNode
- `className`: string (optional)

**Important:** 
- Use `defaultOpen={false}` for secondary content sections to reduce visual clutter.
- Does NOT use `overflow-hidden` to allow dropdowns inside to display properly.

**Usage:**
```tsx
import { CollapsibleSection } from '@/components/common';

// Primary content - expanded by default
<CollapsibleSection
  title="Contact Information"
  icon={<Phone className="w-4 h-4 text-slate-500" />}
  defaultOpen={true}
>
  {/* Content */}
</CollapsibleSection>

// Secondary content - collapsed by default
<CollapsibleSection
  title="Notes"
  icon={<FileText className="w-4 h-4 text-slate-500" />}
  defaultOpen={false}
>
  {/* Content */}
</CollapsibleSection>
```

---

### Toast / ToastContainer
**File:** `Toast.tsx`

**Purpose:** Toast notifications system with auto-dismiss and progress bar.

**Toast Types:**
- `success` - Green, for successful operations
- `error` - Red, for errors (longer duration: 8s)
- `warning` - Amber, for warnings
- `info` - Blue, for informational messages

**Features:**
- Auto-dismiss with configurable duration (default: 5s, errors: 8s)
- Progress bar showing time remaining
- Dismissible with X button
- Stacks multiple toasts
- Framer Motion animations

**Usage:**
```tsx
// In App.tsx or layout:
import { ToastContainer } from '@/components/common';
<ToastContainer />

// In components:
import { useToast } from '@/contexts';

const toast = useToast();
toast.success('Created', 'Contact has been added');
toast.error('Error', 'Something went wrong');
toast.warning('Warning', 'Please check your input');
toast.info('Info', 'FYI message');

// Dismiss programmatically
const id = toast.success('Saved', 'Changes saved');
toast.dismiss(id);
```

---

### PageNavigationGuard
**File:** `PageNavigationGuard.tsx`

**Purpose:** Prevents navigation when there are unsaved changes (works with React Router).

**Usage:**
```tsx
import { PageNavigationGuard } from '@/components/common';

// In your layout or App:
<PageNavigationGuard />
```

---

### DuplicateContactModal
**File:** `DuplicateContactModal.tsx`

**Purpose:** Modal for handling duplicate contact detection with two scenarios:
1. **Exact match** (name + email) - Can only go back
2. **Name match only** - Options to transfer existing or create new

**Props:**
- `isOpen`: boolean
- `duplicateType`: `'exact'` | `'name-only'`
- `existingContact`: contact info object
- `newContactInfo`: new contact info object
- `onClose`: () => void
- `onTransferAndUpdate`: () => void - "Same Person" action
- `onCreateNew`: () => void - "Different Person" action

---

### DuplicateCompanyModal
**File:** `DuplicateCompanyModal.tsx`

**Purpose:** Modal for handling duplicate company detection.

**Props:**
- `isOpen`: boolean
- `existingCompany`: company info object
- `onClose`: () => void
- `onViewExisting`: () => void

---

### MultiSelectUsers
**File:** `MultiSelectUsers.tsx`

**Purpose:** Checklist-style multi-user selection dropdown with full keyboard navigation.

**Props:**
- `value`: string[] - Array of selected user IDs
- `onChange`: (userIds: string[]) => void - Callback when selection changes
- `label`: string (optional)
- `placeholder`: string (optional, default: "Select sales reps...")
- `activeOnly`: boolean (optional) - Filter to active users only
- `disabled`: boolean (optional)
- `className`: string (optional)
- `size`: `'sm'` | `'md'` (optional, default: 'md')

**Features:**
- Uses `useDropdownKeyboard` hook for consistent keyboard navigation
- `tabIndex={0}` - focusable via Tab key
- Auto-saves on selection change (no Save/Cancel buttons)
- Shows selected count or single name in trigger
- Pills display when multiple users selected
- Search input for filtering (appears when > 5 users)
- Scrolls highlighted item into view when navigating

**Keyboard Support:**
- Tab: Focus/unfocus (closes dropdown when leaving)
- Space: Open dropdown or select highlighted item
- Enter: Open dropdown or select highlighted item
- Arrow Up/Down: Navigate options
- Escape: Close dropdown
- Type to search: Jumps to search input and filters

**Usage:**
```tsx
import { MultiSelectUsers } from '@/components/common/MultiSelectUsers';

// Company-level sales rep selection
<MultiSelectUsers
  value={company.salesRepIds || []}
  onChange={(ids) => {
    updateCompany(company.id, { salesRepIds: ids });
    toast.success('Updated', 'Sales reps updated');
  }}
  placeholder="Select sales reps..."
/>

// In a form (smaller size)
<MultiSelectUsers
  value={formData.salesRepIds}
  onChange={(ids) => setFormData({ ...formData, salesRepIds: ids })}
  size="sm"
  activeOnly={false}
/>
```

---

## Utils

Location: `src/utils/`

### validation.ts
**File:** `validation.ts`

**Purpose:** Comprehensive validation and formatting utilities for common field types.

#### Phone Utilities
```tsx
import { 
  formatPhoneNumber,
  validatePhone,
  getPhoneError,
  getPhoneDigits
} from '@/utils/validation';

// Format phone as (XXX) XXX-XXXX with optional extension
formatPhoneNumber('5551234567');       // '(555) 123-4567'
formatPhoneNumber('5551234567#123');   // '(555) 123-4567 #123'

// Validate 10-digit phone
validatePhone('(555) 123-4567');       // true
validatePhone('555-1234');             // false (only 7 digits)
validatePhone('');                     // true (empty is allowed)

// Get error message
getPhoneError('555-1234');             // 'Invalid phone number'
getPhoneError('(555) 123-4567');       // null

// Extract raw digits
getPhoneDigits('(555) 123-4567 #123'); // '5551234567#123'
```

#### Email Utilities
```tsx
import { 
  validateEmail,
  getEmailError,
  normalizeEmail
} from '@/utils/validation';

validateEmail('test@example.com');     // true
validateEmail('invalid');              // false
validateEmail('');                     // true (empty is allowed)

getEmailError('invalid');              // 'Invalid email address'

normalizeEmail('  Test@Example.COM '); // 'test@example.com'
```

#### Website/URL Utilities
```tsx
import { 
  validateWebsite,
  getWebsiteError,
  formatWebsite,
  getDisplayWebsite
} from '@/utils/validation';

validateWebsite('example.com');        // true
validateWebsite('https://test.org');   // true
validateWebsite('test');               // false (no TLD)

formatWebsite('example.com');          // 'https://example.com'
formatWebsite('http://example.com');   // 'http://example.com'

getDisplayWebsite('https://example.com'); // 'example.com'
```

#### Address Utilities
```tsx
import { 
  formatAddress,
  validateZip,
  getZipError,
  validateState,
  US_STATES
} from '@/utils/validation';

// Format address as single line
formatAddress({ 
  street: '123 Main St', 
  city: 'New York', 
  state: 'NY', 
  zip: '10001' 
}); // '123 Main St, New York, NY 10001'

// Validate ZIP (5 or 5+4 format)
validateZip('10001');        // true
validateZip('10001-1234');   // true
validateZip('1000');         // false

// Validate state abbreviation
validateState('NY');         // true
validateState('XX');         // false

// US states dropdown options
// US_STATES = [{ value: 'AL', label: 'Alabama' }, ...]
```

---

### addressAutocomplete.ts
**File:** `addressAutocomplete.ts`

**Purpose:** Radar.io address autocomplete API integration.

**Setup:**
Add to `packages/frontend/.env`:
```
VITE_RADAR_PUBLISHABLE_KEY=prj_test_pk_xxxxxxxxxxxxx
```

**Functions:**

```tsx
import { 
  searchAddresses, 
  isRadarConfigured,
  type AddressComponents 
} from '@/utils/addressAutocomplete';

// Check if API is configured
if (isRadarConfigured()) {
  // Search for addresses (debounce recommended)
  const results = await searchAddresses('123 Main St');
  // Returns: AddressComponents[] with street, city, state, zip, country, fullAddress
}
```

---

## Custom Hooks

Location: `src/hooks/`

### useDropdownKeyboard ⚠️ ALWAYS USE THIS FOR DROPDOWNS
**File:** `useDropdownKeyboard.ts`

**Purpose:** Keyboard navigation for custom dropdowns (Arrow Up/Down, Enter, Escape).

> **⚠️ IMPORTANT:** Any component with a dropdown, select, autocomplete, or list selection MUST use this hook for consistent keyboard navigation.

**Options:**
- `items`: T[] - array of dropdown items
- `isOpen`: boolean - is dropdown visible
- `onSelect`: (item: T, index: number) => void - called on Enter
- `onClose`: () => void - called on Escape
- `loop`: boolean (default: true) - wrap around at ends
- `hasAddOption`: boolean (default: false) - if there's an "Add new" option at index 0

**Returns:**
- `highlightedIndex`: number - currently highlighted item index
- `setHighlightedIndex`: (index: number) => void
- `handleKeyDown`: (e: KeyboardEvent) => void - attach to input
- `resetHighlight`: () => void - reset to -1

**Usage:**
```tsx
import { useDropdownKeyboard } from '@/hooks';

const dropdownKeyboard = useDropdownKeyboard({
  items: filteredCompanies,
  isOpen: showDropdown,
  onSelect: (company, index) => {
    if (index === -1 && showAddOption) {
      openAddModal();
    } else if (company) {
      selectCompany(company);
    }
  },
  onClose: () => setShowDropdown(false),
  hasAddOption: showAddOption,
});

// In JSX - attach handleKeyDown to input:
<input onKeyDown={dropdownKeyboard.handleKeyDown} />

// Highlight the current item:
{items.map((item, index) => (
  <button
    className={index === dropdownKeyboard.highlightedIndex ? 'bg-brand-50' : ''}
  >
    {item.name}
  </button>
))}
```

---

### useUserDependencies
**File:** `useUserDependencies.ts`

**Purpose:** Get all items assigned to a user across all registered modules.

**Returns:**
- `UserDependencies` object with:
  - `userId`: string
  - `userName`: string
  - `totalCount`: number
  - `categories`: DependencyCategory[] - grouped by module
  - `hasItems`: boolean

**Usage:**
```tsx
import { useUserDependencies } from '@/hooks';

const dependencies = useUserDependencies(user.id, user.name);

if (dependencies.hasItems) {
  console.log(`User has ${dependencies.totalCount} assigned items`);
  dependencies.categories.forEach(cat => {
    console.log(`${cat.label}: ${cat.items.length} items`);
  });
}
```

---

### useReassignUserItems
**File:** `useUserDependencies.ts`

**Purpose:** Reassign items from one user to another (or unassign).

**Usage:**
```tsx
import { useReassignUserItems } from '@/hooks';

const { reassignItems } = useReassignUserItems();

// Reassign to another user
const results = reassignItems(fromUserId, toUserId, categories);

// Unassign (leave empty)
const results = reassignItems(fromUserId, null, categories);
```

---

### useFormChanges
**File:** `useFormChanges.ts`

**Purpose:** Track form data changes for unsaved changes detection.

**Returns:**
- `formData`: T - current form state
- `setFormData`: (data: T) => void
- `hasChanges`: boolean - whether form has changed
- `resetForm`: () => void - reset to original
- `updateOriginal`: (data: T) => void - update original (after save)
- `initializeForm`: (data: T) => void - initialize with new data

**Usage:**
```tsx
import { useFormChanges } from '@/hooks';

const {
  formData,
  setFormData,
  hasChanges,
  resetForm,
  updateOriginal,
} = useFormChanges(initialData);
```

---

### useNavigationGuard
**File:** `useNavigationGuard.ts`

**Purpose:** Hook for the navigation guard store.

**Usage:**
```tsx
import { useNavigationGuardStore } from '@/contexts';

const { setGuard, clearGuard } = useNavigationGuardStore();

useEffect(() => {
  setGuard(hasUnsavedChanges);
  return () => clearGuard();
}, [hasUnsavedChanges]);
```

---

### useSafeNavigate
**File:** `useSafeNavigate.ts`

**Purpose:** Navigation that respects the navigation guard.

**Usage:**
```tsx
import { useSafeNavigate } from '@/hooks';

const safeNavigate = useSafeNavigate();
safeNavigate('/some-path');
```

---

## User Dependency Registry

Location: `src/contexts/userDependencyRegistry.ts`

**Purpose:** Centralized system for tracking user assignments across all modules. When a user is deactivated/deleted, this system automatically shows all affected items and handles reassignment.

### Registering a Module

When creating a store with user assignments, register it:

```tsx
import { registerUserDependency } from '@/contexts/userDependencyRegistry';

// After creating your store...

registerUserDependency({
  module: 'projects',           // Unique identifier
  label: 'Projects (Manager)',  // Display label
  icon: 'FolderKanban',        // Lucide icon name
  field: 'managerId',          // Field that holds user ID
  getItems: () => useProjectsStore.getState().projects,
  getUserId: (project) => project.managerId,
  getItemId: (project) => project.id,
  getItemName: (project) => project.name,
  getItemUrl: (project) => `/projects/${project.id}`,
  reassign: (projectId, newUserId) => {
    useProjectsStore.getState().updateProject(projectId, { managerId: newUserId });
  },
});
```

### Currently Registered Modules

| Module | Field | Label |
|--------|-------|-------|
| `companies` | `salesRepId` | Companies (Sales Rep) |

### Adding New Modules

When you create a new store with user assignments:

1. Add the `registerUserDependency` call after store creation
2. The `UserDeactivationModal` will automatically pick up the new module
3. No other code changes needed!

---

## Stores/Contexts

Location: `src/contexts/`

### Store Overview

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useAuthStore` | Authentication state, login/logout, current user | localStorage |
| `useUsersStore` | Portal users (employees) CRUD | localStorage |
| `useClientsStore` | Companies & Contacts CRUD | localStorage |
| `useCompanyStore` | Company settings (name, logo, letterhead) | localStorage |
| `useDepartmentsStore` | Departments & Positions | localStorage |
| `useRolesStore` | Roles & Permissions | localStorage |
| `useUIStore` | Theme, sidebar state, modals, command palette | localStorage (partial) |
| `useToastStore` / `useToast` | Toast notifications | No |
| `useNavigationGuardStore` | Navigation blocking for unsaved changes | No |

### useAuthStore
**File:** `authStore.ts`

Current user authentication state.

```tsx
import { useAuthStore } from '@/contexts';

const { user, isAuthenticated, login, logout } = useAuthStore();
```

### useUsersStore
**File:** `usersStore.ts`

Portal users (employees) management.

```tsx
import { useUsersStore } from '@/contexts';

const { 
  users, 
  addUser, 
  updateUser, 
  deleteUser, 
  toggleUserActive,
  getActiveUsers 
} = useUsersStore();
```

### useClientsStore
**File:** `clientsStore.ts`

Companies and Contacts data. **Registered with userDependencyRegistry.**

```tsx
import { useClientsStore, getCompanySalesRepIds } from '@/contexts';

const { 
  companies, 
  contacts,
  addCompany, 
  updateCompany, 
  deleteCompany,
  addContact,
  updateContact,
  deleteContact,
  getContactsByCompany,
  // Address management
  addCompanyAddress,
  updateCompanyAddress,
  deleteCompanyAddress,
  // Contact method management
  addContactMethod,
  updateContactMethod,
  deleteContactMethod
} = useClientsStore();

// Helper to get ALL sales rep IDs (company-level + location-level)
const allSalesRepIds = getCompanySalesRepIds(company);
```

### useCompanyStore
**File:** `companyStore.ts`

Your company settings (not client companies).

```tsx
import { useCompanyStore } from '@/contexts';

const { company, setCompany, setLogo, setLetterhead } = useCompanyStore();
// company = { name, website, email, phone, address, logo, letterhead }
```

### useDepartmentsStore
**File:** `departmentsStore.ts`

Departments and Positions hierarchy.

```tsx
import { useDepartmentsStore } from '@/contexts';

const { 
  departments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  addPosition,
  updatePosition,
  deletePosition,
  getPositionsByDepartment
} = useDepartmentsStore();
```

### useRolesStore
**File:** `rolesStore.ts`

Roles and Permissions management.

```tsx
import { useRolesStore } from '@/contexts';

const { 
  roles,
  permissions,
  addRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  toggleRolePermission,
  hasPermission
} = useRolesStore();
```

### useToast
**File:** `toastStore.ts`

Toast notification convenience hook.

```tsx
import { useToast } from '@/contexts';

const toast = useToast();
toast.success('Saved', 'Changes have been saved');
toast.error('Error', 'Something went wrong');
toast.warning('Warning', 'Please check your input');
toast.info('Info', 'FYI message');
```

### useNavigationGuardStore
**File:** `navigationGuardStore.ts`

Manages navigation blocking for unsaved changes.

```tsx
import { useNavigationGuardStore } from '@/contexts';

const { 
  hasUnsavedChanges,
  isBlocked,
  setGuard,
  clearGuard,
  requestNavigation
} = useNavigationGuardStore();
```

### useUIStore
**File:** `uiStore.ts`

UI state management.

```tsx
import { useUIStore } from '@/contexts';

const { 
  theme, 
  setTheme,
  sidebarExpanded,
  toggleSidebar,
  activeModal,
  openModal,
  closeModal
} = useUIStore();
```

---

## Layout Components

Location: `src/components/layout/`

### Page
**File:** `Layout.tsx`

**Purpose:** Page wrapper with title, description, actions, and optional full-height content.

**Props:**
- `title`: string - Page title
- `description`: string (optional) - Subtitle text
- `actions`: ReactNode (optional) - Action buttons (top right)
- `children`: ReactNode
- `className`: string (optional)
- `centered`: boolean (optional) - Center the title/description
- `fillHeight`: boolean (optional) - **Use for pages with DataTable** - Makes children fill viewport height

**Usage:**
```tsx
import { Page } from '@/components/layout';

// Regular page (scrolls normally)
<Page title="Settings" description="Manage your preferences">
  {/* Content */}
</Page>

// Page with DataTable (table scrolls internally)
<Page
  title="Companies"
  description="Manage your client companies."
  fillHeight  // ← Add this for pages with DataTable
  actions={<Button>Add Company</Button>}
>
  <DataTable ... />
</Page>
```

---

### PanelLayout
**File:** `PanelLayout.tsx`

**Purpose:** Wrapper that adds SideRibbon navigation to panel pages.

**Pre-configured layouts:**
- `CustomersLayout`
- `AccountingLayout`
- `ProjectsLayout`
- `EstimatingLayout`
- `AdminLayout`

**Usage:**
```tsx
// In route configuration:
<Route element={<CustomersLayout><Outlet /></CustomersLayout>}>
  <Route path="companies" element={<CompaniesPage />} />
  <Route path="contacts" element={<ContactsPage />} />
</Route>
```

---

## Established Patterns

### 1. Inline Editing with Unsaved Changes Modal

Used in detail pages for editable fields. Pattern includes:
- Click to edit
- Tab/Enter/Escape keyboard handling
- Validation errors show inline (red border + message)
- Toast notifications for validation errors on Tab/Escape
- Unsaved changes modal on navigation away

**Validation Behavior:**
- Real-time validation while typing
- Tab with error → Shows toast, stays on field
- Escape with error → Shows toast "Not Saved", discards changes
- Enter/✓ with error → Won't save, error stays visible

**Components:** `InlineField`, `RoleField`, `CompanyField` in `ContactDetailPage.tsx`

---

### 2. Duplicate Detection Flow

When creating new records, check for duplicates:

```tsx
const findDuplicate = (name, email) => {
  // Check exact match first (name + email)
  // Then check name-only match
  return { item, type: 'exact' | 'name-only' } | null;
};

const handleSave = () => {
  const duplicate = findDuplicate(...);
  if (duplicate) {
    setDuplicateType(duplicate.type);
    setShowDuplicateModal(true);
    return;
  }
  createItem();
};
```

---

### 3. Orphaned Record Handling

When a parent record is deleted, child records become orphaned:
- Show red warning styling
- Display "Previous [parent] was deleted" message
- Provide selector to reassign

**Example:** Contact with deleted company shows red warning and company selector.

---

### 4. Back Button Navigation

Use browser history for back navigation:

```tsx
// ✅ Correct - goes to previous page in history
<Button onClick={() => navigate(-1)}>Back</Button>

// ❌ Avoid - always goes to specific page
<Button onClick={() => navigate('/clients/contacts')}>Back</Button>
```

**Exception:** After deleting a record, navigate to the list page (since the record no longer exists).

---

### 5. Dropdown with Search and "Add New" Option

Pattern for searchable dropdowns that allow creating new items:

```tsx
const filteredItems = useMemo(() => {
  if (!search) return items;
  return items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );
}, [items, search]);

const showAddOption = useMemo(() => {
  if (!search.trim()) return false;
  return !items.some(item => 
    item.name.toLowerCase() === search.toLowerCase()
  );
}, [items, search]);

// ALWAYS use useDropdownKeyboard for keyboard navigation!
const dropdownKeyboard = useDropdownKeyboard({
  items: filteredItems,
  isOpen: showDropdown,
  onSelect: handleSelect,
  onClose: () => setShowDropdown(false),
  hasAddOption: showAddOption,
});

// In dropdown:
{showAddOption && (
  <button onClick={openAddModal}>
    Add "{search}" as new item
  </button>
)}
{filteredItems.map((item, index) => (
  <button 
    onClick={() => selectItem(item)}
    className={index === dropdownKeyboard.highlightedIndex ? 'bg-brand-50' : ''}
  >
    {item.name}
  </button>
))}
```

---

### 6. List Pages with DataTable

Standard pattern for pages displaying lists of items:

```tsx
<Page
  title="Companies"
  description="Manage your client companies."
  fillHeight  // Makes DataTable scroll, not the page
  actions={<Button>Add Company</Button>}
>
  <DataTable
    columns={columns}
    data={filteredData}
    rowKey={(item) => item.id}
    onRowClick={(item) => navigate(`/path/${item.id}`)}
    sortField={sortField}
    sortDirection={sortDirection}
    onSort={handleSort}
    filters={
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput ... />
          <SelectFilter ... />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        <AlphabetFilter ... />
      </div>
    }
    emptyState={<EmptyState />}
  />
</Page>
```

---

### 7. Address Input with Autocomplete

Pattern for address fields with Radar.io autocomplete:

```tsx
<AddressInput
  street={record.address?.street || ''}
  suite={record.address?.suite || ''}
  city={record.address?.city || ''}
  state={record.address?.state || ''}
  zip={record.address?.zip || ''}
  onSave={(address) => {
    updateRecord(record.id, { address });
    toast.success('Updated', 'Address saved');
  }}
/>
```

**Behavior:**
- Type in street field → suggestions appear after 3 chars
- Select suggestion → City, State, ZIP auto-fill
- Edit any field manually
- Click "Save Address" to persist
- Click outside with changes → Unsaved changes modal

---

### 8. User Deactivation with Dependency Check

When deactivating or deleting a user, use the `UserDeactivationModal`:

```tsx
import { UserDeactivationModal } from '@/components/common';

// State
const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

// Handler
const handleDeactivateClick = (user: User) => {
  if (user.isActive) {
    setUserToDeactivate(user);  // Show modal for deactivation
  } else {
    // Directly activate (no dependencies to check)
    activateUser(user.id);
  }
};

// Modal
<UserDeactivationModal
  isOpen={!!userToDeactivate}
  onClose={() => setUserToDeactivate(null)}
  onConfirm={(reassignToUserId) => {
    deactivateUser(userToDeactivate.id);
    setUserToDeactivate(null);
  }}
  user={userToDeactivate}
  mode="deactivate"
/>
```

---

### 9. Multiple Office Addresses

Companies can have multiple addresses (Main Office + additional locations):

```tsx
// Data structure
interface Company {
  address?: { street, suite, city, state, zip, salesRepId?, salesRepIds? };  // Main office
  addresses?: CompanyAddress[];  // Additional locations
  salesRepsByLocation?: boolean;  // Flag for per-location sales rep mode
}

interface CompanyAddress {
  id: string;
  label: string;  // "Branch Office", "Warehouse", etc.
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  salesRepId?: string;   // Legacy single rep
  salesRepIds?: string[];  // Multiple reps
}

// Store actions
addCompanyAddress(companyId, { label, street, suite, city, state, zip });
updateCompanyAddress(companyId, addressId, data);
deleteCompanyAddress(companyId, addressId);
```

---

### 10. Contact Office Assignment

Contacts can be assigned to a specific company office:

```tsx
interface Contact {
  officeAddressId?: string;  // 'main-office' or address ID
}

// Filter behavior:
// - If contact has officeAddressId → Only show for that location filter
// - If contact has no officeAddressId → Show for ALL company locations
```

---

### 11. Sales Rep Assignment (Company Level vs Location Level)

Companies can assign sales reps at two levels:

**Company Level** (default):
- Single set of reps for entire company
- Stored in `company.salesRepIds` array

**Location Level** (when `salesRepsByLocation: true`):
- Different reps per address
- Stored in `company.address.salesRepIds` and `company.addresses[].salesRepIds`
- Toggle visible only when company has 2+ addresses

**Toggle Behavior (Clean Slate - Option A):**
- Switching TO location mode → Clears company-level reps, shows modal confirmation
- Switching FROM location mode → Clears ALL location-level reps, shows modal confirmation

**Auto-migration (when addresses drop to 1):**
- Collects all location-level sales rep IDs
- Migrates them to company level
- Clears `salesRepsByLocation` flag
- Shows modal confirmation with migrated rep names

**Helper Function:**
```tsx
import { getCompanySalesRepIds } from '@/contexts';

// Get ALL sales rep IDs for a company (company-level + all location-level)
const allRepIds = getCompanySalesRepIds(company);
```

**Filter Usage (ContactsPage):**
```tsx
// If contact has assigned office AND company uses location-based reps
// → Filter by that office's sales reps only
// Otherwise → Filter by ALL company sales reps
```

---

## Keyboard Navigation Standards

### Dropdowns (Custom) - Use `useDropdownKeyboard`
| Key | Action |
|-----|--------|
| Arrow Down | Highlight next item |
| Arrow Up | Highlight previous item |
| Enter | Select highlighted item |
| Space | Select highlighted item (in MultiSelectUsers) |
| Escape | Close dropdown |
| Tab | Close dropdown, move focus to next field |

### SelectFilter (with search)
| Key | Action |
|-----|--------|
| Arrow Down | Highlight next item |
| Arrow Up | Highlight previous item |
| Enter | Select highlighted item |
| Escape | Clear search OR clear filter OR close |

### Inline Edit Fields
| Key | Action |
|-----|--------|
| Enter | Save (if valid) or show error |
| Escape | Discard changes (with toast if invalid) |
| Tab | Save and move to next field, or show error toast and stay |

### Unsaved Changes Modal
| Key | Action |
|-----|--------|
| Tab | Cycle through buttons (Discard → Keep Editing → Save) |
| Enter | Activate focused button |
| Escape | Keep Editing (close modal) |

---

## Modal vs Toast Guidelines

### Use Modal (with OK button) for:
- **Significant mode changes** - e.g., toggling between company-level and location-level sales rep assignment
- **Data migration notifications** - e.g., when addresses drop to 1 and sales reps are auto-migrated
- **Actions that clear/delete multiple items** - user must acknowledge the scope of changes
- **Anything user MUST see and acknowledge** - critical information that shouldn't auto-dismiss

**Modal Pattern:**
```tsx
const [showModal, setShowModal] = useState(false);
const [modalMessage, setModalMessage] = useState('');

// Trigger
setModalMessage('Your important message here');
setShowModal(true);

// Modal JSX
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Action Completed"
  size="sm"
  footer={
    <Button variant="primary" onClick={() => setShowModal(false)}>
      OK
    </Button>
  }
>
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
      <Info className="w-5 h-5 text-brand-600 dark:text-brand-400" />
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
      {modalMessage}
    </p>
  </div>
</Modal>
```

### Use Toast for:
- **Quick confirmations** - save, update, delete single item
- **Validation errors** - invalid email, phone, required fields
- **Non-critical notifications** - FYI messages that don't need acknowledgment
- **Incremental changes** - adding/removing a single sales rep

**Toast Pattern:**
```tsx
import { useToast } from '@/contexts';

const toast = useToast();

// Success
toast.success('Updated', 'Sales reps updated');

// Error
toast.error('Error', 'Please enter a valid email address');

// Info
toast.info('Info', 'Changes will take effect immediately');
```

---

## File Structure

```
src/
├── components/
│   ├── common/
│   │   ├── index.ts           # Exports all common components
│   │   ├── AddressInput.tsx   # Address with Radar.io autocomplete
│   │   ├── AlphabetFilter.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── DataTable.tsx
│   │   ├── DuplicateCompanyModal.tsx
│   │   ├── DuplicateContactModal.tsx
│   │   ├── Input.tsx          # With auto-validation for email/phone/url
│   │   ├── Modal.tsx          # Includes ConfirmModal
│   │   ├── MultiSelectUsers.tsx # Multi-user select with keyboard nav
│   │   ├── PageNavigationGuard.tsx
│   │   ├── SearchInput.tsx
│   │   ├── Select.tsx         # Native select wrapper
│   │   ├── SelectFilter.tsx   # Filter dropdown with search
│   │   ├── Textarea.tsx       # Multi-line text input
│   │   ├── Toast.tsx          # Toast notifications with progress
│   │   ├── Toggle.tsx         # Toggle/switch component
│   │   ├── UnsavedChangesModal.tsx
│   │   └── UserDeactivationModal.tsx  # User deactivation with dependencies
│   ├── layout/
│   │   ├── index.ts
│   │   ├── Header.tsx         # App header
│   │   ├── Layout.tsx         # Contains Page component
│   │   ├── PanelLayout.tsx    # Panel wrappers with SideRibbon
│   │   ├── PanelDashboard.tsx # Reusable panel dashboard with tiles
│   │   ├── PanelHeader.tsx
│   │   ├── Sidebar.tsx
│   │   └── SideRibbon.tsx
│   └── panels/
│       ├── customers/
│       │   ├── ContactsPage.tsx
│       │   ├── ContactDetailPage.tsx
│       │   ├── CompaniesPage.tsx
│       │   └── CompanyDetailPage.tsx  # 🔒 LOCKED
│       └── admin/
│           ├── ManageUsersPage.tsx    # 🔒 LOCKED
│           ├── ManageDepartmentsPage.tsx
│           ├── ManageRolesPage.tsx
│           └── CompanySettingsPage.tsx # 🔒 LOCKED
├── hooks/
│   ├── index.ts               # Exports all hooks
│   ├── useDropdownKeyboard.ts # ⚠️ USE FOR ALL DROPDOWNS
│   ├── useFormChanges.ts
│   ├── useNavigationGuard.ts
│   ├── useSafeNavigate.ts
│   └── useUserDependencies.ts # User dependency hooks
├── utils/
│   ├── index.ts               # Exports all utils
│   ├── validation.ts          # Email/phone/website/address validation & formatting
│   └── addressAutocomplete.ts # Radar.io address autocomplete
└── contexts/
    ├── index.ts
    ├── authStore.ts           # Authentication state
    ├── clientsStore.ts        # Companies & Contacts data
    ├── companyStore.ts        # Company settings (your company)
    ├── usersStore.ts          # Portal users data
    ├── departmentsStore.ts    # Departments & Positions
    ├── rolesStore.ts          # Roles & Permissions
    ├── toastStore.ts          # Toast notifications
    ├── uiStore.ts             # UI state (theme, sidebar, etc.)
    ├── navigationGuardStore.ts
    └── userDependencyRegistry.ts  # User dependency tracking
```

---

## Adding New Features Checklist

When adding new features, **ALWAYS check if these exist first:**

### Components
- [ ] Need a button? → Use `Button` component
- [ ] Need form inputs? → Use `Input` component (has auto-validation!)
- [ ] Need a dropdown select? → Use `Select` component
- [ ] Need multi-user selection? → Use `MultiSelectUsers` component
- [ ] Need multi-line text? → Use `Textarea` component
- [ ] Need a toggle/switch? → Use `Toggle` component
- [ ] Need search input? → Use `SearchInput` component
- [ ] Need a dropdown filter? → Use `SelectFilter` component
- [ ] Need a data table/list? → Use `DataTable` component
- [ ] Need A-Z filtering? → Use `AlphabetFilter` component
- [ ] Need modal? → Use `Modal` or `ConfirmModal`
- [ ] Need unsaved changes confirmation? → Use `UnsavedChangesModal`
- [ ] Need user deactivation? → Use `UserDeactivationModal`
- [ ] Need collapsible sections? → Use `CollapsibleSection` (defaultOpen={false})
- [ ] Need toast notifications? → Use `useToast()`
- [ ] Need address input? → Use `AddressInput` component

### Hooks
- [ ] **ANY dropdown/select/autocomplete?** → **⚠️ MUST use `useDropdownKeyboard`**
- [ ] Need to track form changes? → Use `useFormChanges`
- [ ] Need to prevent navigation with unsaved changes? → Use `useNavigationGuardStore`
- [ ] Need safe navigation? → Use `useSafeNavigate`
- [ ] Need user dependency info? → Use `useUserDependencies`

### Validation
- [ ] Need email validation? → Use `Input type="email"` (auto-validates)
- [ ] Need phone validation? → Use `Input type="tel"` (auto-validates & formats)
- [ ] Need URL validation? → Use `Input type="url"` (auto-validates)
- [ ] Need custom validation? → Use functions from `@/utils/validation`

### User Assignment Tracking
- [ ] Creating a store with user assignments? → **Register with `userDependencyRegistry`**
- [ ] Deactivating/deleting users? → Use `UserDeactivationModal`

### Patterns
- [ ] Need duplicate detection? → Follow duplicate detection pattern
- [ ] Need back navigation? → Use `navigate(-1)`
- [ ] Creating a list page? → Use `DataTable` with `Page fillHeight`
- [ ] Need inline editing? → Follow inline editing pattern from ContactDetailPage
- [ ] Need address with autocomplete? → Use `AddressInput` component
- [ ] Need multiple addresses? → Follow CompanyDetailPage pattern
- [ ] Need sales rep assignment? → Follow Pattern #11 (company vs location level)
- [ ] Need modal for important changes? → Follow Modal vs Toast Guidelines

### Layout
- [ ] Page with DataTable? → Add `fillHeight` prop to `Page`
- [ ] Page in a panel? → Use appropriate `*Layout` wrapper

---

*Last updated: January 8, 2026*