# S&G Portal V3 - Development Guide

> **For Claude/AI Assistants:** Read this document at the start of each session to understand existing patterns and avoid recreating functionality.

---

## Table of Contents

1. [Common Components](#common-components)
2. [Custom Hooks](#custom-hooks)
3. [Layout Components](#layout-components)
4. [Established Patterns](#established-patterns)
5. [Keyboard Navigation Standards](#keyboard-navigation-standards)
6. [File Structure](#file-structure)
7. [Adding New Features Checklist](#adding-new-features-checklist)

---

## ⚠️ IMPORTANT RULES

**Before creating any new component or functionality:**

1. **ALWAYS check this document first** - The component or pattern you need likely already exists
2. **ALWAYS use `useDropdownKeyboard` hook** for ANY dropdown, select, or autocomplete component
3. **ALWAYS use existing common components** - Don't recreate buttons, inputs, modals, etc.
4. **ALWAYS follow keyboard navigation standards** - Arrow keys, Enter, Escape must work consistently

---

## Common Components

Location: `src/components/common/`

### Button
**File:** `Button.tsx`

**Purpose:** Standardized button component with variants and sizes.

**Props:**
- `variant`: `'primary'` | `'secondary'` | `'danger'` | `'ghost'`
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

### AddressInput
**File:** `AddressInput.tsx`

**Purpose:** Address input with Radar.io autocomplete and Save/Discard pattern.

**Props:**
- `street`: string
- `city`: string
- `state`: string
- `zip`: string
- `onSave`: (address: AddressData) => void - Called when user clicks Save
- `disabled`: boolean (optional)
- `required`: boolean (optional)
- `className`: string (optional)

**Features:**
- Radar.io autocomplete on street field (type 3+ chars)
- Auto-populates City, State, ZIP when address selected
- Local state - changes don't save until "Save Address" clicked
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

<AddressInput
  street={company.address?.street || ''}
  city={company.address?.city || ''}
  state={company.address?.state || ''}
  zip={company.address?.zip || ''}
  onSave={(address) => {
    updateCompany(company.id, { address });
    toast.success('Updated', 'Address saved');
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

**Purpose:** Dropdown filter button with keyboard navigation built-in. Uses `useDropdownKeyboard` internally.

**Props:**
- `label`: string - Label shown when nothing is selected
- `value`: string - Currently selected value (empty string = all)
- `options`: SelectFilterOption[] - `{ value: string, label: string, count?: number }`
- `onChange`: (value: string) => void
- `icon`: ReactNode (optional)
- `showAllOption`: boolean (default: true)
- `allLabel`: string (default: "All")
- `className`: string (optional)

**Keyboard Support:** Arrow Up/Down, Enter, Escape (built-in)

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
- `defaultOpen`: boolean (default: true)
- `children`: ReactNode

**Usage:**
```tsx
import { CollapsibleSection } from '@/components/common';

<CollapsibleSection
  title="Contact Information"
  icon={<Phone className="w-4 h-4 text-slate-500" />}
  defaultOpen={true}
>
  {/* Content */}
</CollapsibleSection>
```

---

### Toast / ToastContainer
**File:** `Toast.tsx`

**Purpose:** Toast notifications system.

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

## Utilities

Location: `src/utils/`

### validation.ts
**File:** `validation.ts`

**Purpose:** Validation and formatting utilities for common field types.

**Functions:**

```tsx
import { 
  validateEmail, 
  validatePhone, 
  validateWebsite,
  formatPhoneNumber 
} from '@/utils/validation';

// Email validation
validateEmail('test@example.com');  // true
validateEmail('invalid');           // false

// Phone validation (10 digits required)
validatePhone('(555) 123-4567');    // true
validatePhone('555-1234');          // false (only 7 digits)

// Website validation (must have TLD)
validateWebsite('example.com');     // true
validateWebsite('https://test.org'); // true
validateWebsite('test');            // false (no TLD)

// Phone formatting
formatPhoneNumber('5551234567');    // '(555) 123-4567'
formatPhoneNumber('5551234567x123'); // '(555) 123-4567 #123'
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

## Keyboard Navigation Standards

### Dropdowns (Custom) - Use `useDropdownKeyboard`
| Key | Action |
|-----|--------|
| Arrow Down | Highlight next item |
| Arrow Up | Highlight previous item |
| Enter | Select highlighted item |
| Escape | Close dropdown |
| Tab | Close dropdown, move focus |

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
│   │   ├── Modal.tsx
│   │   ├── PageNavigationGuard.tsx
│   │   ├── SearchInput.tsx
│   │   ├── SelectFilter.tsx
│   │   ├── Toast.tsx
│   │   └── UnsavedChangesModal.tsx  # Standalone unsaved changes modal
│   ├── layout/
│   │   ├── index.ts
│   │   ├── Layout.tsx         # Contains Page component
│   │   ├── PanelLayout.tsx    # Panel wrappers with SideRibbon
│   │   ├── PanelHeader.tsx
│   │   ├── Sidebar.tsx
│   │   └── SideRibbon.tsx
│   └── panels/
│       └── customers/
│           ├── ContactsPage.tsx
│           ├── ContactDetailPage.tsx
│           ├── CompaniesPage.tsx
│           └── CompanyDetailPage.tsx
├── hooks/
│   ├── index.ts               # Exports all hooks
│   ├── useDropdownKeyboard.ts # ⚠️ USE FOR ALL DROPDOWNS
│   ├── useFormChanges.ts
│   ├── useNavigationGuard.ts
│   └── useSafeNavigate.ts
├── utils/
│   ├── validation.ts          # Email/phone/website validation & formatting
│   └── addressAutocomplete.ts # Radar.io address autocomplete
└── contexts/
    ├── index.ts
    ├── clientsStore.ts        # Companies & Contacts data
    ├── usersStore.ts          # Users data
    ├── toastStore.ts          # Toast notifications
    └── navigationGuardStore.ts
```

---

## Adding New Features Checklist

When adding new features, **ALWAYS check if these exist first:**

### Components
- [ ] Need a button? → Use `Button` component
- [ ] Need form inputs? → Use `Input` component (has auto-validation!)
- [ ] Need search input? → Use `SearchInput` component
- [ ] Need a dropdown filter? → Use `SelectFilter` component
- [ ] Need a data table/list? → Use `DataTable` component
- [ ] Need A-Z filtering? → Use `AlphabetFilter` component
- [ ] Need modal? → Use `Modal` or `ConfirmModal`
- [ ] Need unsaved changes confirmation? → Use `UnsavedChangesModal`
- [ ] Need collapsible sections? → Use `CollapsibleSection`
- [ ] Need toast notifications? → Use `useToast()`
- [ ] Need address input? → Use `AddressInput` component

### Hooks
- [ ] **ANY dropdown/select/autocomplete?** → **⚠️ MUST use `useDropdownKeyboard`**
- [ ] Need to track form changes? → Use `useFormChanges`
- [ ] Need to prevent navigation with unsaved changes? → Use `useNavigationGuardStore`
- [ ] Need safe navigation? → Use `useSafeNavigate`

### Validation
- [ ] Need email validation? → Use `Input type="email"` (auto-validates)
- [ ] Need phone validation? → Use `Input type="tel"` (auto-validates & formats)
- [ ] Need URL validation? → Use `Input type="url"` (auto-validates)
- [ ] Need custom validation? → Use functions from `@/utils/validation`

### Patterns
- [ ] Need duplicate detection? → Follow duplicate detection pattern
- [ ] Need back navigation? → Use `navigate(-1)`
- [ ] Creating a list page? → Use `DataTable` with `Page fillHeight`
- [ ] Need inline editing? → Follow inline editing pattern from ContactDetailPage
- [ ] Need address with autocomplete? → Use `AddressInput` component

### Layout
- [ ] Page with DataTable? → Add `fillHeight` prop to `Page`
- [ ] Page in a panel? → Use appropriate `*Layout` wrapper

---

*Last updated: January 6, 2026*