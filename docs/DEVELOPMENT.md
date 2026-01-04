# S&G Portal V3 - Development Guide

> **For Claude/AI Assistants:** Read this document at the start of each session to understand existing patterns and avoid recreating functionality.

---

## Table of Contents

1. [Common Components](#common-components)
2. [Custom Hooks](#custom-hooks)
3. [Established Patterns](#established-patterns)
4. [Keyboard Navigation Standards](#keyboard-navigation-standards)
5. [File Structure](#file-structure)

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

**Purpose:** Form input with label, error states, icons, and addons.

**Props:**
- `label`: string (optional)
- `error`: string (optional)
- `hint`: string (optional)
- `leftIcon` / `rightIcon`: ReactNode
- `leftAddon` / `rightAddon`: string
- `required`: boolean
- All standard input HTML attributes

**Usage:**
```tsx
import { Input } from '@/components/common';

<Input 
  label="Email" 
  type="email" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
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
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

<CollapsibleSection
  title="Contact Information"
  icon={<Phone className="w-4 h-4 text-slate-500" />}
  defaultOpen={true}
>
  {/* Content */}
</CollapsibleSection>
```

---

### AlphabetFilter
**File:** `AlphabetFilter.tsx`

**Purpose:** A-Z filter bar that shows available letters based on data.

**Props:**
- `selected`: string | null
- `onSelect`: (letter: string | null) => void
- `items`: string[] - array of names to determine available letters

**Usage:**
```tsx
import { AlphabetFilter } from '@/components/common/AlphabetFilter';

const contactNames = contacts.map(c => c.firstName);

<AlphabetFilter
  selected={letterFilter}
  onSelect={setLetterFilter}
  items={contactNames}
/>
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

## Custom Hooks

Location: `src/hooks/`

### useDropdownKeyboard
**File:** `useDropdownKeyboard.ts`

**Purpose:** Keyboard navigation for custom dropdowns (Arrow Up/Down, Enter, Escape).

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

// In JSX:
<input onKeyDown={dropdownKeyboard.handleKeyDown} />

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

## Established Patterns

### 1. Inline Editing with Unsaved Changes Modal

Used in detail pages for editable fields. Pattern includes:
- Click to edit
- Tab/Enter/Escape keyboard handling
- Unsaved changes modal on navigation away

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

// In dropdown:
{showAddOption && (
  <button onClick={openAddModal}>
    Add "{search}" as new item
  </button>
)}
{filteredItems.map(item => (
  <button onClick={() => selectItem(item)}>{item.name}</button>
))}
```

---

## Keyboard Navigation Standards

### Dropdowns (Custom)
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
| Enter | Show unsaved changes modal (if changed) |
| Escape | Show unsaved changes modal (if changed), else close |
| Tab | Show unsaved changes modal (if changed), then move to next field |

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
│   │   ├── AlphabetFilter.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── DuplicateCompanyModal.tsx
│   │   ├── DuplicateContactModal.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── PageNavigationGuard.tsx
│   │   ├── SearchInput.tsx
│   │   └── Toast.tsx
│   ├── layout/
│   └── panels/
│       └── customers/
│           ├── ContactsPage.tsx
│           ├── ContactDetailPage.tsx
│           ├── CompaniesPage.tsx
│           └── CompanyDetailPage.tsx
├── hooks/
│   ├── index.ts               # Exports all hooks
│   ├── useDropdownKeyboard.ts
│   ├── useFormChanges.ts
│   ├── useNavigationGuard.ts
│   └── useSafeNavigate.ts
└── contexts/
    ├── index.ts
    ├── clientsStore.ts        # Companies & Contacts data
    ├── usersStore.ts          # Users data
    ├── toastStore.ts          # Toast notifications
    └── navigationGuardStore.ts
```

---

## Adding New Features Checklist

When adding new features, check if these exist:

- [ ] Need a button? → Use `Button` component
- [ ] Need form inputs? → Use `Input` component
- [ ] Need search with dropdown? → Use `SearchInput` + `useDropdownKeyboard`
- [ ] Need modal? → Use `Modal` or `ConfirmModal`
- [ ] Need collapsible sections? → Use `CollapsibleSection`
- [ ] Need A-Z filtering? → Use `AlphabetFilter`
- [ ] Need toast notifications? → Use `useToast()`
- [ ] Need to track form changes? → Use `useFormChanges`
- [ ] Need to prevent navigation with unsaved changes? → Use `useNavigationGuardStore`
- [ ] Need duplicate detection? → Follow duplicate detection pattern
- [ ] Need back navigation? → Use `navigate(-1)`

---

*Last updated: January 2026*