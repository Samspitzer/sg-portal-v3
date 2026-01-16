# New Common Components (January 14-15, 2026)

Add these sections to DEVELOPMENT.md after SelectFilter (line 462) and before DataTable (line 466):

---

### PositionSelector
**File:** `PositionSelector.tsx`

**Purpose:** Hierarchical dropdown for selecting positions by department. Supports drill-down navigation, search, and keyboard controls.

**Props:**
- `value`: string - Currently selected position ID
- `departments`: Array<{ id, name, positions: Array<{ id, name }> }> - Departments with positions
- `onChange`: (positionId: string) => void - Called with position ID or empty string when cleared
- `icon`: ReactNode (optional)
- `className`: string (optional)
- `placeholder`: string (default: "Select position...")
- `pending`: boolean (optional) - If true, traps focus and shows warning when trying to leave
- `pendingMessage`: string (optional) - Message for pending toast

**Features:**
- Two-level navigation: Departments list → Positions within department
- Arrow Right/Left to drill in/out of departments
- Search across all departments and positions
- Dropdown flips to top when near bottom of viewport
- ESC clears selection (when dropdown closed), goes back (when in department), closes (otherwise)
- Focus trap when `pending=true` - dispatches 'position-selector-pending' event

**Usage:**
```tsx
import { PositionSelector } from '@/components/common';

// Basic usage
<PositionSelector
  value={selectedPositionId}
  departments={departments}
  onChange={setSelectedPositionId}
  icon={<Briefcase className="w-3.5 h-3.5" />}
  placeholder="Select position..."
/>

// With pending state (e.g., position selected but no users assigned)
<PositionSelector
  value={selectedPositionId}
  departments={departments}
  onChange={handlePositionSelect}
  pending={isPending}
  pendingMessage={`No one is assigned to "${positionName}"`}
/>

// Listen for pending events
useEffect(() => {
  const handlePending = (e: CustomEvent) => {
    toast.warning('Cannot Proceed', e.detail.message);
  };
  window.addEventListener('position-selector-pending', handlePending);
  return () => window.removeEventListener('position-selector-pending', handlePending);
}, []);
```

**Keyboard Navigation:**
| Key | Action |
|-----|--------|
| Arrow Down | Move to next item |
| Arrow Up | Move to previous item |
| Arrow Right | Enter department (when on department) |
| Arrow Left | Go back to department list |
| Enter | Select position or enter department |
| Escape | Clear search → Go back → Close dropdown → Clear selection |
| Tab | Select current and close |

---

### SelectFilter Updates
**File:** `SelectFilter.tsx`

**New Features (January 14, 2026):**

1. **Dropdown positioning** - Automatically flips to top when near bottom of viewport
2. **Space bar in search** - Now types a space instead of selecting (use Enter to select)
3. **Smooth scroll** - Scrolls page if dropdown extends below viewport

**Updated Behavior:**
- `dropdownPosition` state tracks 'bottom' | 'top'
- Dropdown uses `bottom-full mb-1` when flipped to top
- ESC behavior: clear search → clear selection → close

---

### UserDeactivationModal (Updated January 15, 2026)
**File:** `UserDeactivationModal.tsx`

**Purpose:** Modal for deactivating/deleting users with comprehensive reassignment of all assigned items following chain of command.

**Props:**
- `isOpen`: boolean - Modal visibility
- `onClose`: () => void - Close handler
- `onConfirm`: (reassignToUserId: string | null) => void - Confirmation handler
- `user`: { id: string; name: string; positionId?: string } | null - User being deactivated
- `mode`: 'deactivate' | 'delete' - Action mode

**Features:**
1. **Shows all assignment types** where user appears (Companies Sales Rep, Companies Overrider, etc.)
2. **Chain of Command auto-assignment** - Finds user's manager via position hierarchy, defaults all items to direct manager
3. **Per-section bulk reassign** - "Reassign all to:" dropdown for each category
4. **Per-item manual override** - Expand section to change individual item assignments
5. **No "Leave unassigned" option** - All items must be reassigned (follows chain of command up to CEO)
6. **Portal-based dropdowns** - Uses `createPortal` to prevent overflow clipping

**ESC Key Behavior (hierarchical):**
1. If dropdown is open → Close dropdown only
2. If section is expanded → Collapse that section (one at a time, most recent first)
3. If all sections collapsed → Close modal

**Internal Components:**
- `UserSelectDropdown` - Custom dropdown with:
  - Portal rendering for proper z-index
  - Grouped options ("Chain of Command" / "Other Users")
  - Search functionality (when >5 users)
  - "Manager" badge on direct manager
  - Keyboard navigation via `useDropdownKeyboard`
  - `onOpenChange` callback for tracking open state

**Usage:**
```tsx
import { UserDeactivationModal } from '@/components/common';

<UserDeactivationModal
  isOpen={showDeactivateModal}
  onClose={() => setShowDeactivateModal(false)}
  onConfirm={handleDeactivateConfirm}
  user={selectedUser}
  mode="deactivate"
/>
```

**Chain of Command Logic:**
```tsx
// Walks up position hierarchy to find managers
const getChainOfCommand = (userId: string): string[] => {
  // 1. Get user's positionId
  // 2. Find position's reportsToPositionId
  // 3. Find active users in that position
  // 4. Repeat up the chain until no more reportsToPositionId
  // Returns array of userIds from direct manager up to CEO
};
```

---

### DuplicateCompanyModal
**File:** `DuplicateCompanyModal.tsx`

**Purpose:** Modal shown when creating a company that matches an existing one. Handles exact duplicates vs same-name-different-location scenarios.

**Props:**
- `isOpen`: boolean
- `duplicateType`: 'exact' | 'simlar' - Exact blocks creation, similar offers options
- `existingCompany`: Company | null - The matching company found
- `newCompanyInfo`: { name, street, city, state, zip } | null - Data being entered
- `onClose`: () => void
- `onViewExisting`: () => void - Navigate to existing company
- `onAddAsNewLocation`: () => void - Add as additional address to existing company
- `onCreateSeparate`: () => void - Create as separate company anyway

**Duplicate Detection Logic:**
- **Exact duplicate**: Same name AND same address → Block creation, show "View Existing" only
- **Similar (same name, different location)**: Offer three options:
  1. View existing company
  2. Add as new location to existing company
  3. Create as separate company

---

### DuplicateContactModal
**File:** `DuplicateContactModal.tsx`

**Purpose:** Modal shown when creating a contact that matches an existing one.

**Props:**
- `isOpen`: boolean
- `duplicateType`: 'exact' | 'simlar'
- `existingContact`: Contact | null
- `newContactInfo`: { firstName, lastName, email, phone } | null
- `onClose`: () => void
- `onTransferAndUpdate`: () => void - Transfer to new company and update info
- `onCreateNew`: () => void - Create as new contact anyway

---

## Hooks

### useDropdownKeyboard
**File:** `useDropdownKeyboard.ts`

**Purpose:** Standard keyboard navigation for custom dropdowns.

**Parameters:**
```tsx
interface UseDropdownKeyboardOptions<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T, index: number) => void;
  onClose?: () => void;
  loop?: boolean; // Wrap around from last to first (default: true)
  hasAddOption?: boolean; // If true, index 0 is "add new" option
  skipDisabled?: boolean; // Skip items with disabled property
}
```

**Returns:**
```tsx
interface UseDropdownKeyboardReturn {
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  resetHighlight: () => void;
}
```

**Usage:**
```tsx
const dropdownKeyboard = useDropdownKeyboard({
  items: filteredItems,
  isOpen: showDropdown,
  onSelect: (item) => selectItem(item),
  onClose: () => setShowDropdown(false),
});

// In your input:
<input onKeyDown={dropdownKeyboard.handleKeyDown} />

// In your dropdown items:
{items.map((item, index) => (
  <div className={index === dropdownKeyboard.highlightedIndex ? 'bg-slate-100' : ''}>
    {item.name}
  </div>
))}
```

---

### useUserDependencies
**File:** `useUserDependencies.ts`

**Purpose:** Get all items assigned to a user across all registered modules.

**Usage:**
```tsx
import { useUserDependencies, getDependencySummary } from '@/hooks';

const dependencies = useUserDependencies(userId, userName);

// Returns:
interface UserDependencies {
  hasItems: boolean;
  totalCount: number;
  categories: DependencyCategory[];
}

interface DependencyCategory {
  module: string;      // e.g., 'companies'
  label: string;       // e.g., 'Companies (Sales Rep)'
  icon: string;
  field: string;       // e.g., 'salesRepId'
  items: DependencyItem[];
  canReassign: boolean;
}

// Get summary text
const summary = getDependencySummary(dependencies);
// "This user is assigned to 3 companies (sales rep)."
```

---

### useReassignUserItems
**File:** `useUserDependencies.ts`

**Purpose:** Reassign items from one user to another.

**Usage:**
```tsx
const { reassignItems } = useReassignUserItems();

// Reassign all items in categories from fromUserId to toUserId
reassignItems(fromUserId, toUserId, categories);
```

---

## Updated Patterns

### Multiple Additional Supervisors

Users can now have multiple additional supervisors stored as an array.

**Data Model:**
```tsx
interface User {
  // ... other fields
  supervisorIds?: string[];           // Array of additional supervisor user IDs
  defaultSupervisorDisabled?: boolean; // If true, ignore position's reportsToPositionId
}
```

**Key Rules:**
1. Cannot disable default supervisor unless at least one additional supervisor exists
2. Removing the last additional supervisor auto-re-enables the default supervisor
3. Additional supervisors are displayed with position name + user name (same format as default)

**UI Pattern (UserDetailPage):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Reporting Structure                                              │
├─────────────────────────────┬───────────────────────────────────┤
│ Reports to                  │ Add Additional Supervisor          │
│ VP of Sales (John)  [Disable]│ [By User] [By Position]           │
│ ─────────────────────────── │ [Select user...        ▼]          │
│ Additional                  │                                    │
│ Sales Manager (Jane) [Remove]│                                    │
│ Additional                  │                                    │
│ Director (Bob)       [Remove]│                                    │
└─────────────────────────────┴───────────────────────────────────┘
```

**Handlers:**
```tsx
// Add supervisor
const handleAddAdditionalSupervisor = (supervisorId: string) => {
  if (additionalSupervisorIds.includes(supervisorId)) {
    toast.error('Already Added', 'This supervisor is already in the list');
    return;
  }
  const newIds = [...additionalSupervisorIds, supervisorId];
  updateUser(user.id, { supervisorIds: newIds });
};

// Remove supervisor (auto-enables default if removing last one)
const handleRemoveAdditionalSupervisor = (supervisorId: string) => {
  const newIds = additionalSupervisorIds.filter(id => id !== supervisorId);
  
  if (newIds.length === 0 && user.defaultSupervisorDisabled) {
    updateUser(user.id, { 
      supervisorIds: undefined, 
      defaultSupervisorDisabled: false 
    });
    toast.success('Updated', 'Additional supervisor removed - default supervisor re-enabled');
  } else {
    updateUser(user.id, { supervisorIds: newIds.length > 0 ? newIds : undefined });
  }
};

// Disable default (only if additional supervisors exist)
const handleToggleDefaultSupervisor = () => {
  if (!user.defaultSupervisorDisabled && !hasAdditionalSupervisors) {
    toast.warning('Cannot Disable', 'Add an additional supervisor first');
    return;
  }
  updateUser(user.id, { defaultSupervisorDisabled: !user.defaultSupervisorDisabled });
};
```

---

### Dropdown with Portal Pattern

For dropdowns that need to escape overflow:hidden containers (like modals):

**Implementation:**
```tsx
import { createPortal } from 'react-dom';

function PortalDropdown({ isOpen, triggerRef, children }) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 220);
      
      // Align to right edge of trigger to prevent cutoff
      let left = rect.right - dropdownWidth;
      
      // Bounds checking
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      
      // Vertical positioning
      const dropdownHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;
      
      setPosition({
        top: showAbove ? rect.top - dropdownHeight : rect.bottom + 4,
        left,
        width: dropdownWidth,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
      }}
      className="bg-white dark:bg-slate-800 border rounded-lg shadow-xl"
    >
      {children}
    </div>,
    document.body
  );
}
```

---

### Dropdown Flip-to-Top Pattern

When dropdowns are near the bottom of the viewport, they should flip to open above the trigger.

**Implementation:**
```tsx
const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
const buttonRef = useRef<HTMLButtonElement>(null);
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen && buttonRef.current && dropdownRef.current) {
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      setDropdownPosition('top');
    } else {
      setDropdownPosition('bottom');
      // Scroll if still extends below
      if (buttonRect.bottom + dropdownHeight > viewportHeight) {
        window.scrollBy({ top: buttonRect.bottom + dropdownHeight - viewportHeight + 20, behavior: 'smooth' });
      }
    }
  }
}, [isOpen]);

// In JSX:
<div 
  ref={dropdownRef}
  className={clsx(
    'absolute z-50 ...',
    dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
  )}
>
```

---

### ESC Key Hierarchy Pattern

For modals with nested interactive elements, implement hierarchical ESC handling:

**Implementation:**
```tsx
// Track open dropdowns
const [openDropdownCount, setOpenDropdownCount] = useState(0);
const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

const handleDropdownOpenChange = useCallback((isOpen: boolean) => {
  setOpenDropdownCount(prev => isOpen ? prev + 1 : Math.max(0, prev - 1));
}, []);

// Use capture phase to intercept before Modal's handler
useEffect(() => {
  if (!modalIsOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // 1. If dropdown open - let dropdown handle it
      if (openDropdownCount > 0) return;
      
      // 2. If section expanded - collapse one section
      if (expandedSections.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const lastExpanded = Array.from(expandedSections).pop();
        if (lastExpanded) {
          setExpandedSections(prev => {
            const next = new Set(prev);
            next.delete(lastExpanded);
            return next;
          });
        }
        return;
      }
      
      // 3. All collapsed - let modal close
    }
  };

  document.addEventListener('keydown', handleKeyDown, true); // capture phase
  return () => document.removeEventListener('keydown', handleKeyDown, true);
}, [modalIsOpen, openDropdownCount, expandedSections]);
```

---

### Focus Trap with Custom Event Pattern

For components that need to prevent navigation until a condition is met (like clearing an invalid selection):

```tsx
// In the component that needs focus trap
useEffect(() => {
  if (pending && !isOpen) {
    buttonRef.current?.focus();
    
    const handleFocusOut = () => {
      setTimeout(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          onChange(''); // Clear selection
          window.dispatchEvent(new CustomEvent('my-component-pending', { 
            detail: { message: 'Selection cleared because...' } 
          }));
        }
      }, 0);
    };
    
    containerRef.current?.addEventListener('focusout', handleFocusOut);
    return () => containerRef.current?.removeEventListener('focusout', handleFocusOut);
  }
}, [pending, isOpen, onChange]);

// In the parent component
useEffect(() => {
  const handlePending = (e: CustomEvent) => {
    toast.warning('Title', e.detail.message);
  };
  window.addEventListener('my-component-pending', handlePending as EventListener);
  return () => window.removeEventListener('my-component-pending', handlePending as EventListener);
}, [toast]);
```

---

### Company with Multiple Addresses Pattern

Companies can have multiple office locations stored in an `addresses` array.

**Data Model:**
```tsx
interface Company {
  id: string;
  name: string;
  // Primary address (legacy, still used for display)
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Multiple addresses
  addresses?: CompanyAddress[];
}

interface CompanyAddress {
  id: string;
  label: string;        // e.g., "New York Office", "LA Branch"
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  zip?: string;
}
```

**Contact Office Location:**
```tsx
interface Contact {
  // ... other fields
  companyId: string;
  officeLocationId?: string;  // References company.addresses[].id
}
```

**When duplicate company detected with different address:**
- Option to add as new location to existing company
- Updates `addresses` array on existing company

---

### Chain of Command for User Reassignment

When deactivating a user, all their assigned items must be reassigned following the chain of command.

**Logic:**
```tsx
const getChainOfCommand = (userId: string): string[] => {
  const user = users.find(u => u.id === userId);
  if (!user?.positionId) return [];
  
  const chain: string[] = [];
  let currentPositionId = user.positionId;
  const visited = new Set<string>();
  
  while (currentPositionId) {
    if (visited.has(currentPositionId)) break;
    visited.add(currentPositionId);
    
    const position = positions.find(p => p.id === currentPositionId);
    if (!position?.reportsToPositionId) break;
    
    // Find active users in parent position
    const managers = users.filter(
      u => u.positionId === position.reportsToPositionId && 
           u.isActive && 
           u.id !== userId
    );
    
    managers.forEach(m => {
      if (!chain.includes(m.id)) chain.push(m.id);
    });
    
    currentPositionId = position.reportsToPositionId;
  }
  
  return chain; // [directManager, manager'sManager, ..., CEO]
};
```

**UI shows:**
1. Chain of Command users first (with "Manager" badge on direct manager)
2. Separator
3. Other Users

**Default behavior:** All items default to direct manager, can override per-section or per-item.

---

## Type Definitions

### Position Type
```tsx
interface Position {
  id: string;
  name: string;                    // Position title, e.g., "Sales Manager"
  reportsToPositionId?: string;    // Parent position in hierarchy
}
```

### Department Type
```tsx
interface Department {
  id: string;
  name: string;
  positions: Position[];
}
```

### DependencyItem Type
```tsx
interface DependencyItem {
  id: string;
  name: string;
  url?: string;    // Link to view the item
}
```

---

*Last Updated: January 15, 2026*