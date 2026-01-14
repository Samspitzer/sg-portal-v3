# New Common Components (January 14, 2026)

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

*Added: January 14, 2026*