label="Email"
    value={contact.email || ''}
    onSave={(v) => handleFieldSave('email', v)}
    type="email"
    // ... other props
  />
  {contact.email && (
    <button
      onClick={() => handleFieldSave('email', '')}
      className="absolute top-1 right-0 p-1 text-slate-300 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
      title="Clear"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )}
</div>
```

**Key Differences from Delete:**
- Clear: Sets value to empty string, field remains
- Delete: Removes the entire field/record

---

### 15. Slug-Based URLs

Companies and Contacts use clean, readable URLs based on their names.

**URL Format:**
- Companies: `/clients/companies/acme-construction` (instead of `/clients/companies/company-1767885526746`)
- Contacts: `/clients/contacts/john-doe` (instead of `/clients/contacts/contact-1767885526746`)

**Data Structure:**
```tsx
interface Company {
  id: string;
  slug?: string;  // URL-friendly identifier
  name: string;
  // ...
}

interface Contact {
  id: string;
  slug?: string;  // URL-friendly identifier
  firstName: string;
  lastName: string;
  // ...
}
```

**Auto-Generation:**
- Slugs are generated automatically when creating records
- Slugs update automatically when names change
- Duplicate names get numbered suffixes: `john-doe`, `john-doe-2`

**Detail Pages (use hooks):**
```tsx
import { useCompanyBySlug, useContactBySlug } from '@/hooks';

// In CompanyDetailPage
const { company, notFound } = useCompanyBySlug();

// In ContactDetailPage
const { contact, company, notFound } = useContactBySlug();
```

**Navigation (use helpers):**
```tsx
import { getCompanyUrl, getContactUrl } from '@/hooks';

// In list pages
onRowClick={(company) => navigate(getCompanyUrl(company))}
onRowClick={(contact) => navigate(getContactUrl(contact))}

// In links
<span onClick={() => navigate(getCompanyUrl(company))}>
  {company.name}
</span>
```

**Legacy URL Support:**
- Old ID-based URLs automatically redirect to slug URLs
- No broken bookmarks

---

### 16. Direct Reporting Structure

Positions have a direct reporting relationship via `reportsToPositionId`.

**Data Model:**
```tsx
interface Position {
  id: string;
  name: string;
  departmentId: string;
  level: PositionLevel;  // Auto-calculated from reporting chain (1-5)
  reportsToPositionId: string | null;  // null = department head
  order: number;
}
```

**Key Concepts:**
- `reportsToPositionId: null` = Department head (escalates to parent department)
- `level` is auto-calculated based on depth in reporting chain
- Users can have a `supervisorId` to specify which person (when position has multiple people)

**Helper Functions:**
```tsx
import { useFieldsStore } from '@/contexts';

const {
  getReportingChain,    // Get full chain from position to top
  getDirectReports,     // Get positions reporting to this one
  getDepartmentHeads,   // Get positions with reportsToPositionId = null
} = useFieldsStore();
```

**Escalation Logic:**
- 1 person above → auto-assigned
- 2+ people above → user selects specific supervisor
- 0 people above → skip to parent department
- Department head → escalates to parent department Level 1

---

*Last updated: January 11, 2026*