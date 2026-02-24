# S&G Portal V3 — Development Reference
*Last Updated: February 18, 2026*

---

## ⚠️ OUTSTANDING FIXES REQUIRED

The following issues were found during the February 18 code audit. These must be fixed before building new features on top of these pages.

---

### FIX 1 — CompaniesPage & ContactsPage: AlphabetFilter must use `secondaryRow`

**Files:** `CompaniesPage.tsx`, `ContactsPage.tsx`

**Problem:** AlphabetFilter is rendered in a separate `<div>` *above* the FilterBar. It must be passed to FilterBar via the `secondaryRow` prop to be visually unified inside the FilterBar container.

**Current (wrong):**
```tsx
<div className="mb-4">
  <AlphabetFilter selected={letterFilter} onSelect={setLetterFilter} items={...} />
</div>
<FilterBar className="mb-4">
  <SearchInput ... />
  ...
</FilterBar>
```

**Fix (correct):**
```tsx
<FilterBar
  rightContent={<FilterCount count={filteredItems.length} singular="company" plural="companies" />}
  secondaryRow={
    <AlphabetFilter selected={letterFilter} onSelect={setLetterFilter} items={companies.map(c => c.name)} />
  }
>
  <SearchInput ... />
  <SelectFilter label="Location" ... className="w-36" />
  <SelectFilter label="Sales Rep" ... className="w-36" />
</FilterBar>
```

---

### FIX 2 — CompaniesPage & ContactsPage: FilterCount must be in `rightContent`

**Files:** `CompaniesPage.tsx`, `ContactsPage.tsx`

**Problem:** `FilterCount` is placed as a *child* inside FilterBar (in the left content area). It must be in the `rightContent` prop to appear on the right side.

**Fix:** Move `<FilterCount ... />` from children into `rightContent={...}` prop (see Fix 1 example above).

---

### FIX 3 — Missing `fillHeight` prop on List Pages

**Files:** `DealsPage.tsx`, `LeadsPage.tsx`, `ActivitiesPage.tsx`, `CompaniesPage.tsx`, `ContactsPage.tsx`

**Problem:** These pages are missing `fillHeight` on the `<Page>` component. Without it the DataTable cannot fill the viewport height correctly. `ManageUsersPage` and `TasksPage` are correct references.

**Fix:** Add `fillHeight` to the `<Page>` component on all list pages:
```tsx
<Page title="Deals" description="..." fillHeight actions={...}>
  <div className="flex flex-col h-full min-h-0">
    <FilterBar ...>...</FilterBar>
    <div className="flex-1 min-h-0">
      <DataTable ... />
    </div>
  </div>
</Page>
```

---

### FIX 4 — ActivitiesPage: FilterCount not in `rightContent`

**File:** `ActivitiesPage.tsx`

**Problem:** `FilterCount` is passed as a child inside FilterBar's children rather than as `rightContent`.

**Fix:**
```tsx
<FilterBar rightContent={<FilterCount count={sortedTasks.length} singular="activity" plural="activities" />}>
  <SearchInput ... />
  ...
</FilterBar>
```

---

### FIX 5 — TasksPage: Cascading Filter Pattern not implemented

**File:** `TasksPage.tsx`

**Problem:** `taskTypeOptions` is a simple map of active task types with no `count` or `disabled` logic. The dev standard requires cascading filters so disabled options (0 results) sort to the bottom. The Overdue `QuickFilter` is also missing its `count` and `isWarning` prop.

**Fix — cascading taskTypeOptions:**
```tsx
const taskTypeOptions = useMemo(() => {
  const allTypeCounts = new Map<string, number>();
  const filteredTypeCounts = new Map<string, number>();
  const activeTypes = getActiveTaskTypes();

  tasks.forEach(t => {
    if (!t.type) return;
    allTypeCounts.set(t.type, (allTypeCounts.get(t.type) || 0) + 1);

    let matchesFilters = true;
    if (selectedUser) matchesFilters = t.assignedUserId === selectedUser;
    if (timeFilter !== 'all' && matchesFilters) matchesFilters = matchesTime(t.dueDate);

    if (matchesFilters) {
      filteredTypeCounts.set(t.type, (filteredTypeCounts.get(t.type) || 0) + 1);
    }
  });

  const hasActiveFilter = !!(selectedUser || timeFilter !== 'all');

  return activeTypes
    .map(tt => ({
      value: tt.value,
      label: tt.label,
      count: hasActiveFilter
        ? (filteredTypeCounts.get(tt.value) || 0)
        : (allTypeCounts.get(tt.value) || 0),
      disabled: hasActiveFilter
        ? (filteredTypeCounts.get(tt.value) || 0) === 0
        : false,
    }))
    .filter(tt => (allTypeCounts.get(tt.value) || 0) > 0)
    .sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
}, [tasks, selectedUser, timeFilter, matchesTime, getActiveTaskTypes]);
```

**Fix — overdue count on QuickFilters:**
```tsx
const overdueCount = useMemo(() =>
  tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = parseLocalDate(t.dueDate); d.setHours(0, 0, 0, 0);
    return d < today;
  }).length,
  [tasks]
);

const timeFilterOptions: QuickFilterOption<TimeFilter>[] = useMemo(() => [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue', count: overdueCount, isWarning: true },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
], [overdueCount]);
```

---

---

## FilterBar Component System

### FilterBar
**File:** `Filterbar.tsx`

**Purpose:** Unified filter bar component for consistent styling across all list pages. Provides a bordered container with optional two-row layout for alphabet filters.

**Props:**
- `children`: ReactNode — Primary row content (search, dropdowns, etc.)
- `secondaryRow?`: ReactNode — Optional second row (alphabet filter). Renders with a divider above it.
- `rightContent?`: ReactNode — Right side content (counts, actions). Always right-aligned.
- `className?`: string — Additional CSS classes

**Usage:**
```tsx
import { FilterBar, FilterCount, FilterDivider, SelectFilter, QuickFilters } from '@/components/common';

// Single row (ManageUsersPage, TasksPage)
<FilterBar rightContent={<FilterCount count={items.length} singular="user" />}>
  <SearchInput ... />
  <SelectFilter label="Status" ... className="w-36" />
  <SelectFilter label="Department" ... className="w-36" />
</FilterBar>

// Two rows with alphabet filter (CompaniesPage, ContactsPage)
<FilterBar
  rightContent={<FilterCount count={items.length} singular="company" plural="companies" />}
  secondaryRow={<AlphabetFilter selected={letterFilter} onSelect={setLetterFilter} items={...} />}
>
  <SearchInput ... />
  <SelectFilter label="Location" ... className="w-36" />
</FilterBar>

// With view toggle and quick filters (TasksPage, DealsPage, LeadsPage)
<FilterBar rightContent={<FilterCount count={items.length} singular="deal" />}>
  <FilterToggle options={[...]} value={viewMode} onChange={setViewMode} />
  <SearchInput ... />
  <QuickFilters options={timeOptions} value={timeFilter} onChange={setTimeFilter} />
  <FilterDivider />
  <SelectFilter label="Owner" ... className="w-36" />
</FilterBar>
```

**Styling:**
- White background with rounded corners (`rounded-xl`)
- Border and subtle shadow
- Horizontal divider between rows when `secondaryRow` is provided
- Consistent padding (`px-3 py-2`)

---

### FilterCount
**Purpose:** Displays item count on the right side of FilterBar via `rightContent` prop.

**Props:**
- `count`: number
- `singular?`: string (default: "item")
- `plural?`: string (default: singular + "s")

```tsx
<FilterCount count={12} singular="task" />                               // "12 tasks"
<FilterCount count={1} singular="user" />                                // "1 user"
<FilterCount count={5} singular="company" plural="companies" />          // "5 companies"
```

---

### FilterToggle
**Purpose:** Toggle button group for view modes (List/Calendar, List/Kanban, etc.)

**Props:**
- `options`: `ToggleOption<T>[]` — `{ value, label, icon? }`
- `value`: T
- `onChange`: (value: T) => void

```tsx
<FilterToggle
  options={[
    { value: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { value: 'kanban', label: 'Kanban', icon: <LayoutGrid className="w-4 h-4" /> },
  ]}
  value={viewMode}
  onChange={setViewMode}
/>
```

---

### QuickFilters
**Purpose:** Quick filter buttons (All, Overdue, Today, This Week, etc.)

**Props:**
- `options`: `QuickFilterOption<T>[]` — `{ value, label, count?, isWarning? }`
- `value`: T
- `onChange`: (value: T) => void

**Styling:**
- `isWarning: true` shows red styling when active or when `count > 0`
- Count shown in parentheses when > 0: `"Overdue (3)"`

```tsx
const timeFilterOptions: QuickFilterOption<TimeFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue', count: overdueCount, isWarning: true },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
];

<QuickFilters options={timeFilterOptions} value={timeFilter} onChange={setTimeFilter} />
```

---

### FilterDivider
**Purpose:** Vertical divider line separating filter groups inside FilterBar.

```tsx
<FilterBar>
  <SearchInput ... />
  <QuickFilters ... />
  <FilterDivider />
  <SelectFilter ... />
</FilterBar>
```

---

## Page Structure Pattern for List Pages

All list pages must follow this structure. **Currently broken on:** DealsPage, LeadsPage, ActivitiesPage, CompaniesPage, ContactsPage (see Fixes 1–4 above).

```tsx
<Page title="..." fillHeight actions={...}>
  <div className="flex flex-col h-full min-h-0">

    {/* FilterBar — OUTSIDE DataTable, NOT passed as `filters` prop */}
    <FilterBar
      rightContent={<FilterCount count={filteredData.length} singular="item" />}
      secondaryRow={/* AlphabetFilter if needed */}
    >
      <SearchInput ... />
      <SelectFilter label="Status" ... className="w-36" />
    </FilterBar>

    {/* DataTable — fills remaining height */}
    <div className="flex-1 min-h-0">
      <DataTable columns={columns} data={filteredData} emptyState={...} />
    </div>

  </div>
</Page>
```

**Key Rules:**
- `fillHeight` is REQUIRED on `<Page>` for all list pages
- FilterBar is OUTSIDE and ABOVE DataTable
- Outer div must have `flex flex-col h-full min-h-0`
- DataTable wrapper must have `flex-1 min-h-0`
- AlphabetFilter goes in `secondaryRow` prop, NOT above FilterBar
- FilterCount goes in `rightContent` prop, NOT in children

---

## Cascading Filter Pattern

Filters should update their available options based on other active filters. Options with 0 matching results are disabled and sorted to the bottom.

**Currently only partially implemented on TasksPage (needs Fix 5).**

**Key Points:**
- Each filter's options depend on OTHER filters, not itself
- Show count based on filtered results when other filters are active
- `disabled: true` when count is 0 under current active filters
- Sort disabled options to bottom, alphabetically within groups
- Only show types/statuses that have at least 1 item in the full unfiltered dataset

See Fix 5 above for full implementation example.

---

## ESC Key Clear Selection Pattern

All SelectFilter dropdowns implement this hierarchy:

1. ESC with search text → Clear search only
2. ESC with dropdown open → Close dropdown
3. ESC with dropdown closed + selection active → Clear selection

This is already implemented in `SelectFilter.tsx` — no changes needed.

---

## Consistent Dropdown Widths

All SelectFilter dropdowns on the same page use `className="w-36"` for visual consistency. Wider dropdowns (e.g. Company with long names) may use `className="w-44"`. Search inputs use `className="w-48"` with `[&_input]:h-[34px] [&_input]:text-sm`.

---

## CollapsibleSection

**File:** `CollapsibleSection.tsx`
**Fix Applied:** `overflow-hidden` removed from container, `rounded-t-xl` on header, conditional border-bottom, `p-4` on content wrapper.

Used extensively in: `CompanySettingsPage`, `FieldSettingsPage`, `CompanyDetailPage`, `ContactDetailPage`.

```tsx
<CollapsibleSection title="Section Title" defaultOpen={true}>
  {/* content — will not be clipped */}
</CollapsibleSection>
```

---

## ViewMode Persistence Pattern

Pages with multiple views (list/kanban, list/calendar) persist the selected view to `localStorage` so it survives navigation.

**Implementation (TasksPage reference):**
```tsx
const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
  const saved = localStorage.getItem('tasks-view-mode');
  return (saved === 'list' || saved === 'calendar') ? saved : 'list';
});

useEffect(() => {
  localStorage.setItem('tasks-view-mode', viewMode);
}, [viewMode]);
```

**Keys in use:**
- `tasks-view-mode` — TasksPage (list | calendar)
- `deals-view-mode` — DealsPage (list | kanban) — **needs implementing**
- `leads-view-mode` — LeadsPage (list | kanban) — **needs implementing**

---

## KanbanBoard Component

**File:** `KanbanBoard.tsx`
**Used by:** `DealsPage.tsx`, `LeadsPage.tsx`

Generic drag-and-drop Kanban board. Deals default to `kanban` view; Leads default to `kanban` view.

**Props:**
```tsx
interface KanbanBoardProps<T> {
  columns: KanbanColumn[];        // { id, title, color?, count? }
  items: T[];
  getColumnId: (item: T) => string;
  renderCard: (props: KanbanCardProps<T>) => ReactNode;
  onMoveItem: (item: T, newColumnId: string) => void;
  emptyColumnMessage?: string;
}
```

**Usage:**
```tsx
<KanbanBoard
  columns={stageColumns}
  items={filteredDeals}
  getColumnId={(deal) => deal.stageId}
  renderCard={(props) => <DealCard {...props} />}
  onMoveItem={(deal, stageId) => updateDealStage(deal.id, stageId)}
/>
```

**Card Component Pattern:**
```tsx
function DealCard({ item, onClick, onDragStart, isDragging }: KanbanCardProps<DealCardData>) {
  return (
    <div
      draggable={item.status === 'active'}
      onDragStart={(e) => item.status === 'active' && onDragStart(e, item)}
      onClick={() => onClick(item)}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-lg border ...',
        isDragging && 'opacity-50 shadow-lg scale-105',
        item.status === 'won' && 'border-l-4 border-l-green-500',
        item.status === 'lost' && 'border-l-4 border-l-red-500 opacity-60'
      )}
    >
      ...
    </div>
  );
}
```

---

## FormStack System

**File:** `add-forms/FormStackProvider.tsx`
**Hook:** `useFormStack()`

Global form stack for opening add/edit forms from anywhere in the app. Forms stack with proper z-index management.

**Available methods:**
```tsx
const {
  openAddCompany,   // (options?: CompanyFormOptions) => void
  openAddContact,   // (options?: ContactFormOptions) => void
  openAddLead,      // (options?: LeadFormOptions) => void
  openAddDeal,      // (options?: DealFormOptions) => void
  openAddTask,      // (options?: TaskFormOptions) => void
  openEditTask,     // (options: EditTaskFormOptions) => void
  stackDepth,       // number
} = useFormStack();
```

**Options include pre-filled defaults** for linked entities (company, contact, lead, deal) and callbacks:
```tsx
openAddTask({
  defaultCompanyId: company.id,
  defaultCompanyName: company.name,
  defaultContactId: contact.id,
  defaultContactName: contact.name,
  defaultLinkedItemType: 'deal',
  defaultLinkedItemId: deal.id,
  defaultLinkedItemName: deal.name,
  defaultDueDate: '2026-02-20',
  onCreated: (task) => console.log('created', task),
});

openEditTask({
  task: existingTask,
  onUpdated: (task) => {...},
  onDeleted: (taskId) => {...},
});
```

**Provider must wrap the app** (already in `App.tsx`). Never call `useFormStack()` outside the provider.

---

## Task Panel Layout

### AddTaskForm Layout Order
1. Title Input — full width, large text
2. Activity Type — button group row
3. Divider
4. Due Date / Due Time / Assigned To — 3-column row
5. Priority — full width button row
6. Divider
7. Company / Contact — 2-column row
8. Link to Item — full width search
9. Divider
10. Notes — Textarea

### DayScheduleSidebar (Mini Calendar)
**File:** `DayScheduleSidebar.tsx`

Interactive mini calendar shown in the EditTaskForm sidebar.

**Features:**
- Month navigation (prev/next)
- Blue highlight for selected date
- Light blue for today
- Blue dot under dates with tasks
- Click date to set Due Date
- Shows tasks for selected date below calendar

**Props:**
```tsx
interface DayScheduleSidebarProps {
  date: string;             // YYYY-MM-DD
  tasks: ScheduleTask[];
  onDateChange?: (date: string) => void;
  className?: string;
}
```

**Usage in EditTaskForm:**
```tsx
<DayScheduleSidebar
  date={formData.dueDate || ''}
  tasks={allTasks}
  onDateChange={(newDate) => setFormData(d => ({ ...d, dueDate: newDate }))}
/>
```

---

## QuickViewModal

**File:** `QuickViewModal.tsx`
**Used by:** `ActivitiesPage`, `CompanyDetailPage`, `ContactDetailPage`, `LeadDetailPage`

Generic read-only preview modal for any entity. Avoids opening a full edit panel for quick inspection.

**Props:**
```tsx
interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconBgClass?: string;           // e.g. "bg-blue-100 dark:bg-blue-900/30"
  badges?: QuickViewBadge[];      // { label, className? }
  fields?: QuickViewField[];      // { label, value, icon?, onClick?, fullWidth?, hideIfEmpty? }
  notes?: string;
  notesLabel?: string;            // default: "Notes"
  footerMeta?: ReactNode;
  leftActions?: QuickViewAction[];   // e.g. Delete button
  rightActions?: QuickViewAction[];  // e.g. Open / Edit button
}
```

**Usage pattern:**
```tsx
<QuickViewModal
  isOpen={!!selectedTask}
  onClose={() => setSelectedTask(null)}
  title={selectedTask?.title ?? ''}
  subtitle={selectedTask?.dueDate ? formatDate(selectedTask.dueDate, 'short') : undefined}
  icon={<Clock className="w-5 h-5 text-blue-600" />}
  iconBgClass="bg-blue-100 dark:bg-blue-900/30"
  badges={[{ label: selectedTask?.priority ?? '', className: priorityColor }]}
  fields={[
    { label: 'Assigned To', value: assignedUser?.name, icon: <User className="w-4 h-4" /> },
    { label: 'Company', value: company?.name, icon: <Building2 className="w-4 h-4" />, onClick: () => navigate(...) },
  ]}
  notes={selectedTask?.notes}
  rightActions={[
    { label: 'Open', icon: <ExternalLink className="w-4 h-4" />, onClick: () => openEditTask({ task: selectedTask! }) }
  ]}
  leftActions={[
    { label: 'Delete', variant: 'danger', onClick: handleDelete }
  ]}
/>
```

---

## EntityTasksSection

**File:** `EntityTasksSection.tsx`
**Used by:** `CompanyDetailPage`, `ContactDetailPage`, `LeadDetailPage`, `DealDetailPage`

Reusable collapsible tasks list for any detail page. Shows open and completed tasks grouped, with inline complete toggle.

**Props:**
```tsx
interface EntityTasksSectionProps {
  entityType: LinkedEntityType;  // 'company' | 'contact' | 'lead' | 'deal' | ...
  entityId: string;
  entityName: string;
  onAddTask: () => void;         // Should call openAddTask with entity pre-linked
  onTaskClick: (task: Task) => void;  // Should call openEditTask
  defaultCollapsed?: boolean;
}
```

**Usage:**
```tsx
<EntityTasksSection
  entityType="company"
  entityId={company.id}
  entityName={company.name}
  onAddTask={() => openAddTask({
    defaultCompanyId: company.id,
    defaultCompanyName: company.name,
  })}
  onTaskClick={(task) => openEditTask({ task })}
/>
```

---

## EntitySalesSection

**File:** `EntitySalesSection.tsx`
**Used by:** `CompanyDetailPage`, `ContactDetailPage`

Reusable collapsible section showing linked leads and deals for a contact or company.

**Usage:**
```tsx
<EntitySalesSection
  entityType="company"
  entityId={company.id}
  entityName={company.name}
  onLeadClick={(lead) => navigate(`/sales/leads/${lead.slug}`)}
  onDealClick={(deal) => navigate(`/sales/deals/${deal.slug}`)}
  onAddLead={() => openAddLead({ defaultCompanyId: company.id, defaultCompanyName: company.name })}
  onAddDeal={() => openAddDeal({ defaultCompanyId: company.id, defaultCompanyName: company.name })}
/>
```

---

## InlineEditField

**File:** `InlineEditField.tsx`
**Used by:** `CompanyDetailPage`, `ContactDetailPage`, `LeadDetailPage`, `DealDetailPage`, `UserDetailPage`

Click-to-edit field with full keyboard support. Used for all editable fields on detail pages.

**Features:**
- Click to edit, Enter to save, Escape to cancel
- Tab navigation between fields
- Phone auto-formatting
- Real-time validation (email, phone, URL)
- Optional "Needs Review" badge with confirm button

**Props:**
```tsx
interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'url' | 'textarea';
  placeholder?: string;
  icon?: React.ElementType;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  needsReview?: boolean;
  onConfirm?: () => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
<InlineEditField
  label="Email"
  value={contact.email || ''}
  onSave={(v) => updateContact({ email: v })}
  type="email"
  icon={Mail}
  placeholder="Add email..."
/>
```

---

## InlineSelectField

**File:** `InlineSelectField.tsx`
**Used by:** Detail pages for dropdowns (role, status, stage, priority, etc.)

Click-to-edit select field. Same visual style as InlineEditField.

**Props:**
```tsx
interface InlineSelectFieldProps {
  label: string;
  value: string;
  options: InlineSelectOption[];  // { value, label, color? }
  onSave: (value: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  allowClear?: boolean;
}
```

---

## MultiSelectUsers

**File:** `MultiSelectUsers.tsx`
**Used by:** `CompanyDetailPage` (Sales Reps field), `ManageUsersPage`

Multi-user selector with avatar chips. Used for fields that support multiple user assignments.

```tsx
<MultiSelectUsers
  label="Sales Reps"
  selectedIds={company.salesRepIds || []}
  onChange={(ids) => updateCompany({ salesRepIds: ids })}
  users={activeUsers}
/>
```

---

## AddressInput

**File:** `AddressInput.tsx`

Address input with Google Places autocomplete. Used on `AddCompanyForm`, `CompanyDetailPage`, `CompanySettingsPage`.

```tsx
<AddressInput
  value={formData.address}
  onChange={(address) => setFormData(d => ({ ...d, address }))}
  label="Main Office Address"
/>
```

---

## CompanySearchField

**File:** `CompanySearchField.tsx`

Searchable company selector with inline "Create new company" option. Used on `AddContactForm`, `ContactDetailPage`.

```tsx
<CompanySearchField
  value={formData.companyId}
  companyName={formData.companyName}
  onChange={(id, name) => setFormData(d => ({ ...d, companyId: id, companyName: name }))}
  onCreateNew={(name) => openAddCompany({ defaultName: name })}
/>
```

---

## EntitySearchDropdown

**File:** `EntitySearchDropdown.tsx`
**Used by:** `AddTaskForm`, `EditTaskForm` (Link to Item field)

Generic search dropdown for any entity type (companies, contacts, leads, deals).

```tsx
<EntitySearchDropdown
  label="Link to Item"
  value={formData.linkedItemId}
  displayValue={formData.linkedItemName}
  onSelect={(item) => setFormData(d => ({ ...d, linkedItemId: item.id, linkedItemName: item.name, linkedItemType: item.type }))}
  entityTypes={['lead', 'deal']}
/>
```

---

## UserDeactivationModal

**File:** `UserDeactivationModal.tsx`
**Used by:** `ManageUsersPage`, `UserDetailPage`

Handles deactivation with dependency checking. Shows what the user is assigned to (tasks, deals, leads, companies) before allowing deactivation. Allows reassignment before proceeding.

```tsx
<UserDeactivationModal
  isOpen={showDeactivateModal}
  onClose={() => setShowDeactivateModal(false)}
  user={selectedUser}
  onConfirm={handleDeactivate}
/>
```

---

## Duplicate Detection Modals

**Files:** `DuplicateCompanyModal.tsx`, `DuplicateContactModal.tsx`
**Used by:** `AddCompanyForm`, `AddContactForm`

Shown when a potential duplicate is detected on form submit. Allows the user to view the existing record, merge, or continue creating.

```tsx
<DuplicateCompanyModal
  isOpen={showDuplicateModal}
  duplicates={duplicateCompanies}
  onContinue={handleContinueCreate}
  onCancel={() => setShowDuplicateModal(false)}
  onViewExisting={(company) => navigate(getCompanyUrl(company))}
/>
```

---

## SectionHeader

**File:** `SectionHeader.tsx`
**Used by:** Detail pages for non-collapsible section headers.

Visual companion to CollapsibleSection for sections that are always visible.

```tsx
<SectionHeader title="Contact Information" action={<Button size="sm">Edit</Button>} />
```

---

## IconPicker

**File:** `IconPicker.tsx`
**Used by:** `FieldSettingsPage` (task type icon selection)

Searchable grid of Lucide icons for selecting an icon for task types and other configurable entities.

```tsx
<IconPicker
  value={taskType.icon}
  onChange={(iconName) => updateTaskType({ icon: iconName })}
/>
```

---

## Stores Reference

| Store | File | Purpose |
|---|---|---|
| `useAuthStore` | `authStore.ts` | Auth state, current user |
| `useClientsStore` | `clientsStore.ts` | Companies and contacts |
| `useCompanyStore` | `companyStore.ts` | Company settings (offices, branding) |
| `useFieldsStore` | `fieldsStore.ts` | Custom fields, departments, contact roles |
| `useSalesStore` | `salesStore.ts` | Leads and deals |
| `useTaskStore` | `taskStore.ts` | Tasks |
| `useTaskTypesStore` | `taskTypesStore.ts` | Task type definitions |
| `useUsersStore` | `usersStore.ts` | Users |
| `useRolesStore` | `rolesStore.ts` | Permission roles |
| `useToast` | `toastStore.ts` | Toast notifications |
| `useUiStore` | `uiStore.ts` | Sidebar state, panel state |
| `useNavigationGuardStore` | `navigationGuardStore.ts` | Unsaved changes guard |

---

## Hooks Reference

| Hook | File | Purpose |
|---|---|---|
| `useDocumentTitle` | `useDocumentTitle.ts` | Sets browser tab title |
| `useFormChanges` | `useFormChanges.ts` | Tracks unsaved changes in forms |
| `useNavigationGuard` | `useNavigationGuard.ts` | Blocks navigation with unsaved changes |
| `useSafeNavigate` | `useSafeNavigate.ts` | Navigate with guard check |
| `useSlugParam` | `useSlugParam.ts` | Reads slug from URL params |
| `useDropdownKeyboard` | `useDropdownKeyboard.ts` | Arrow key navigation for dropdowns |
| `useUserDependencies` | `useUserDependencies.ts` | Finds what a user is assigned to |
| `getCompanyUrl` | `hooks/index.ts` | Gets URL for company detail page |
| `getContactUrl` | `hooks/index.ts` | Gets URL for contact detail page |
| `getUserUrl` | `hooks/index.ts` | Gets URL for user detail page |

---

## Scope Note

We are only actively developing the following panels. All others (Projects, Estimates, Invoices, Accounting) are placeholders and should be ignored.

**Active Panels:**
- Customers (Companies, Contacts)
- Sales (Leads, Deals, Activities)
- Tasks
- Admin (Manage Users, User Detail, Company Settings, Field Settings, Permissions)
- Profile
- Notification Settings