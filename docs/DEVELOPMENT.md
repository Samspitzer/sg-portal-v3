# Development Updates (January 27-28, 2026)

Add these sections to DEVELOPMENT.md:

---

## FilterBar Component System

### FilterBar
**File:** `Filterbar.tsx`

**Purpose:** Unified filter bar component for consistent styling across all list pages. Provides a bordered container with optional two-row layout for alphabet filters.

**Props:**
- `children`: ReactNode - Primary row content (search, dropdowns, etc.)
- `secondaryRow?`: ReactNode - Optional second row (alphabet filter)
- `rightContent?`: ReactNode - Right side content (counts, actions)
- `className?`: string - Additional CSS classes

**Usage:**
```tsx
import { FilterBar, FilterCount, SelectFilter } from '@/components/common';

// Single row (ManageUsersPage, TasksPage)
<FilterBar rightContent={<FilterCount count={items.length} singular="user" />}>
  <SearchInput ... />
  <SelectFilter label="Status" ... className="w-36" />
  <SelectFilter label="Department" ... className="w-36" />
</FilterBar>

// Two rows with alphabet filter (CompaniesPage, ContactsPage)
<FilterBar 
  rightContent={<FilterCount count={items.length} singular="company" plural="companies" />}
  secondaryRow={<AlphabetFilter ... />}
>
  <SearchInput ... />
  <SelectFilter label="Location" ... className="w-36" />
</FilterBar>
```

**Styling:**
- White background with rounded corners (`rounded-xl`)
- Border and subtle shadow
- Horizontal divider between rows when `secondaryRow` is provided
- Consistent padding (`px-3 py-2`)

---

### FilterCount
**Purpose:** Displays item count on the right side of FilterBar.

**Props:**
- `count`: number - The count to display
- `singular?`: string - Singular form (default: "item")
- `plural?`: string - Plural form (default: adds "s" to singular)

**Usage:**
```tsx
<FilterCount count={12} singular="task" />        // "12 tasks"
<FilterCount count={1} singular="user" />         // "1 user"
<FilterCount count={5} singular="company" plural="companies" />  // "5 companies"
```

---

### FilterToggle
**Purpose:** Toggle button group for view modes (e.g., List/Calendar).

**Props:**
- `options`: ToggleOption<T>[] - Array of { value, label, icon? }
- `value`: T - Currently selected value
- `onChange`: (value: T) => void

**Usage:**
```tsx
<FilterToggle
  options={[
    { value: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { value: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
  ]}
  value={viewMode}
  onChange={setViewMode}
/>
```

---

### QuickFilters
**Purpose:** Quick filter buttons (e.g., All, Overdue, Today, This week).

**Props:**
- `options`: QuickFilterOption<T>[] - Array of { value, label, count?, isWarning? }
- `value`: T - Currently selected value
- `onChange`: (value: T) => void

**Usage:**
```tsx
const timeFilterOptions: QuickFilterOption<TimeFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue', count: overdueCount, isWarning: true },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This week' },
];

<QuickFilters
  options={timeFilterOptions}
  value={timeFilter}
  onChange={setTimeFilter}
/>
```

**Styling:**
- `isWarning: true` shows red styling when active or when count > 0
- Count shown in parentheses when > 0: "Overdue (3)"

---

### FilterDivider
**Purpose:** Vertical divider line between filter groups.

**Usage:**
```tsx
<FilterBar>
  <SelectFilter ... />
  <SelectFilter ... />
  <FilterDivider />
  <QuickFilters ... />
</FilterBar>
```

---

## Cascading Filter Pattern

Filters should update their available options based on other active filters. Items with 0 matching results should be disabled and sorted to the bottom.

**Implementation (TasksPage example):**
```tsx
// Type filter options - cascading with user and time filters
const taskTypeOptions = useMemo(() => {
  const allTypeCounts = new Map<string, number>();
  const filteredTypeCounts = new Map<string, number>();
  
  tasks.forEach(t => {
    if (!t.type) return;
    
    // Count all tasks by type
    allTypeCounts.set(t.type, (allTypeCounts.get(t.type) || 0) + 1);
    
    // Check if task matches OTHER active filters (not this one)
    let matchesFilters = true;
    if (selectedUser) matchesFilters = t.assignedUserId === selectedUser;
    if (timeFilter !== 'all' && matchesFilters) matchesFilters = matchesTime(t.dueDate);
    
    if (matchesFilters) {
      filteredTypeCounts.set(t.type, (filteredTypeCounts.get(t.type) || 0) + 1);
    }
  });
  
  const hasActiveFilter = selectedUser || timeFilter !== 'all';
  
  return taskTypes
    .map(tt => ({
      value: tt.value,
      label: tt.label,
      count: hasActiveFilter ? (filteredTypeCounts.get(tt.value) || 0) : (allTypeCounts.get(tt.value) || 0),
      disabled: hasActiveFilter ? (filteredTypeCounts.get(tt.value) || 0) === 0 : false,
    }))
    .filter(tt => (allTypeCounts.get(tt.value) || 0) > 0)
    .sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
}, [tasks, selectedUser, timeFilter, matchesTime]);
```

**Key Points:**
- Each filter's options depend on OTHER filters, not itself
- Show count based on filtered results when other filters active
- `disabled: true` when count is 0
- Sort disabled options to bottom

---

## ESC Key Clear Selection Pattern

All dropdown filters should clear their selection when ESC is pressed while the dropdown is closed.

**Hierarchy:**
1. ESC with search text → Clear search
2. ESC with dropdown open → Close dropdown
3. ESC with dropdown closed + selection → Clear selection

**Implementation in SelectFilter:**
```tsx
const handleButtonKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
      setSearchQuery('');
    } else if (hasSelection) {
      // ESC when closed clears the filter
      onChange('');
    }
  }
  // ... other key handlers
};
```

---

## Consistent Dropdown Widths

All SelectFilter dropdowns on a page should have the same width for visual consistency.

**Pattern:**
```tsx
// Use className="w-36" for all dropdowns on a page
<SelectFilter label="Status" ... className="w-36" />
<SelectFilter label="Department" ... className="w-36" />
<SelectFilter label="Office" ... className="w-36" />
```

---

## CollapsibleSection Content Fix

**Issue:** Content inside CollapsibleSection was being clipped at the bottom.

**Fix:** 
1. Removed `overflow-hidden` from container
2. Added `rounded-t-xl` to header for border radius
3. Made border-bottom conditional (only when open)
4. Added `p-4` padding to content wrapper

---

## Task Panel Redesign

### Form Layout
The New Task / Edit Task panel now has improved alignment:

1. **Title Input** - Full width, larger text
2. **Activity Type** - Button group row
3. **Divider**
4. **Due Date / Due Time / Assigned To** - 3-column row
5. **Priority** - Full width button row
6. **Divider**
7. **Company / Contact** - 2-column row
8. **Link to Item** - Full width search
9. **Divider**
10. **Notes** - Textarea

### Mini Calendar Sidebar

The sidebar now includes an interactive mini calendar:

**Features:**
- Month navigation (prev/next buttons)
- Visual indicators:
  - Blue highlight for selected date
  - Light blue for today
  - Blue dot under dates with tasks
- Click any date to set it as Due Date
- Shows tasks scheduled for selected date below calendar

**Props added to DayScheduleSidebar:**
```tsx
interface DayScheduleSidebarProps {
  date: string;
  tasks: Task[];
  onDateChange?: (date: string) => void;  // NEW - updates form's dueDate
}
```

**Implementation:**
```tsx
<DayScheduleSidebar 
  date={formData.dueDate || ''} 
  tasks={allTasks}
  onDateChange={(newDate) => setFormData(d => ({ ...d, dueDate: newDate }))}
/>
```

---

## Page Structure Pattern for List Pages

All list pages should follow this structure for consistent filter bar placement:

```tsx
<Page title="..." fillHeight actions={...}>
  <div className="flex flex-col h-full min-h-0">
    {/* FilterBar - outside DataTable */}
    <FilterBar 
      rightContent={<FilterCount ... />}
      secondaryRow={/* AlphabetFilter if needed */}
    >
      <SearchInput ... />
      <SelectFilter ... className="w-36" />
    </FilterBar>

    {/* DataTable - fills remaining height */}
    <div className="flex-1 min-h-0">
      <DataTable
        columns={columns}
        data={filteredData}
        emptyState={...}
        // NO filters prop - FilterBar is separate
      />
    </div>
  </div>
</Page>
```

**Key Points:**
- FilterBar is OUTSIDE DataTable, not passed as `filters` prop
- Wrapped in flex container with `h-full min-h-0`
- DataTable wrapped in `flex-1 min-h-0` div

---

*Last Updated: January 28, 2026*