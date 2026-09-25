# Jaynepal Action Volunteers — Staff Leave Management Portal
## UI/UX Design Specification (`ui.md`)

**Application Name:** JAV Staff Leave Portal  
**Target URL:** `https://leave.jaynepal.org`  
**Aesthetic Style:** Professional, Modern, Clean, Restrained NGO/Corporate Identity  
**Primary Color:** Deep Royal Blue (`#1E40AF` / `#2563EB`)  
**Neutral Palette:** Slate Gray (`#0F172A`, `#334155`, `#64748B`, `#F8FAFC`)  
**Design Principles:** Trustworthy, Accessible (WCAG AA), Scannable, Mobile-Optimized (360px+)  

---

## 1. Visual Identity & Design System

### 1.1 Color Palette
We avoid flashy consumer SaaS gradients and adhere to a clean, authoritative NGO color palette:

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| `primary-900` | `#1E3A8A` | Deep brand header, navbar active states |
| `primary-700` | `#1D4ED8` | Primary button hover, focus indicators |
| `primary-600` | `#2563EB` | Primary brand color, key buttons, links |
| `primary-50` | `#EFF6FF` | Card active background, primary badge tint |
| `surface-bg` | `#F8FAFC` | Page body background (slate-50) |
| `surface-card` | `#FFFFFF` | Form containers, modal dialogs, data cards |
| `text-primary`| `#0F172A` | High contrast headings, table values (slate-900) |
| `text-muted` | `#64748B` | Labels, secondary metadata, captions (slate-500) |
| `border-subtle`| `#E2E8F0` | Dividers, card borders, input borders (slate-200) |

#### Semantic Status Tokens (Strictly Scoped)
- **Approved / Success / Credit:** Emerald (`#059669`, bg: `#ECFDF5`, border: `#A7F3D0`)
- **Pending / In Review / Warning:** Amber (`#D97706`, bg: `#FFFBEB`, border: `#FDE68A`)
- **Rejected / Cancelled / Debit / Destructive:** Rose (`#E11D48`, bg: `#FFF1F2`, border: `#FECDD3`)
- **Informational / Neutral:** Slate (`#475569`, bg: `#F1F5F9`, border: `#CBD5E1`)

### 1.2 Typography & Spacing
- **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
- **Hierarchy:**
  - Page Titles: `text-2xl font-bold tracking-tight text-slate-900` (24px)
  - Section Headers: `text-lg font-semibold text-slate-800` (18px)
  - Card Metric Value: `text-3xl font-extrabold text-slate-900` (30px/36px)
  - Table & Form Text: `text-sm font-medium text-slate-700` (14px)
  - Microcopy / Timestamps: `text-xs text-slate-500` (12px)
- **Spacing Scale:** Standard 4px-based grid (p-2, p-4, p-6, p-8).

---

## 2. Information Architecture & Navigation

### 2.1 Visually Separate Entry Points
Although backed by a unified authentication service with strict server-side RBAC:
1. **`/login` (Staff Login):**
   - Clean, focused interface titled "Staff Portal Login".
   - Subtitle: "Jaynepal Action Volunteers — Staff Leave Management".
   - Link: "Are you an Approver or Administrator? Sign in here".
2. **`/approver/login` (Approver & Executive Login):**
   - Professional executive layout with deep navy header accents and badge "Approver & Executive Portal".
   - Link: "Looking for Staff Member Portal? Sign in here".

Both pages share secure password masking, CSRF protection, and friendly error feedback.

### 2.2 Navigation Structures

#### Staff Portal Sidebar & Topbar
- **Brand Header:** JAV Logo + "JAV Staff Leave"
- **Primary Nav Items:**
  1. 📊 **Dashboard** (`/dashboard`)
  2. 📝 **Apply for Leave** (`/leave/apply`)
  3. 📑 **My Leave Requests** (`/leave/requests`)
  4. 📈 **Leave Balance History** (`/leave/ledger`)
  5. 👤 **My Profile** (`/profile`)
  6. 🔑 **Change Password** (`/profile/password`)
  7. 🚪 **Sign Out**

#### Approver & Admin Portal Navigation
- **Executive Badge:** "Management & Approvals Console"
- **Management Nav Items:**
  1. 📊 **Executive Dashboard** (`/approver/dashboard`)
  2. ⏳ **Pending Approvals** (`/approver/requests/pending`)
  3. 📋 **All Leave Requests** (`/approver/requests`)
  4. 👥 **Staff & Leave Balances** (`/approver/staff`)
  5. 📅 **Team Leave Calendar** (`/approver/calendar`)
  6. 🏢 **Employee Roster** (`/approver/employees`)
  7. 🗓️ **Holidays & Non-Working Days** (`/approver/settings/holidays`)
  8. ✉️ **Email Notifications & Logs** (`/approver/notifications`)
  9. 🛡️ **System Audit Log** (`/approver/audit`)
  10. ⚙️ **Organization Settings** (`/approver/settings`)
  11. 👤 **My Profile** (`/profile`)
  12. 🚪 **Sign Out**

---

## 3. Screen Layouts & Component Design

### 3.1 Staff Dashboard (`/dashboard`)
- **Metric Summary Cards (5-Grid Responsive Layout):**
  1. **Remaining Paid Leave:** Highlighted prominent metric (e.g., `8.0 Days`, emerald pill badge "Available").
  2. **Earned Leave:** Total accrued to date (e.g., `12.0 Days`).
  3. **Used Leave:** Total consumed in approved leaves (e.g., `4.0 Days`).
  4. **Pending Approval:** Days locked in review (e.g., `2.0 Days`, amber pill badge).
  5. **Available for New Requests:** Effective limit = Current - Pending (e.g., `6.0 Days`).
- **Quick Action Bar:**
  - High-visibility button: `+ Apply for Leave`.
  - Notification banner showing pending reviews or upcoming approved leaves.
- **Recent Requests Table:**
  - Display last 5 requests with columns: Period, Days, Handover Person, Status Badge, Submitted Date, Details action.
- **Recent Ledger Entries:**
  - Mini summary of the last 3 credits/debits.

### 3.2 Leave Application Interface (`/leave/apply`)
- **Form Layout:** Clean two-column desktop / single-column mobile form with **Live Calculation Preview Box**.
- **Input Fields:**
  - `Leave From` (Date picker, defaults to next working day).
  - `Leave To` (Date picker).
  - `Handover Responsibility To` (Searchable select dropdown showing active staff members; self-selection disabled).
  - `Reason for Leave` (Textarea, required).
  - `Contact Number During Leave` (Optional phone input).
  - `Additional Notes` (Optional textarea).
  - `Supporting Document` (Optional file upload, accepting PDF/JPG/PNG up to 5MB).
- **Interactive Live Calculation Panel:**
  ```text
  ┌────────────────────────────────────────────────────────┐
  │ Leave Calculation Summary                              │
  ├────────────────────────────────────────────────────────┤
  │ Calendar Days:           5 days                        │
  │ Saturdays Excluded:     -1 day                         │
  │ Organization Holidays:  -1 day (Dashain Festival)      │
  ├────────────────────────────────────────────────────────┤
  │ Net Working Leave Days:  3.0 Days                      │
  ├────────────────────────────────────────────────────────┤
  │ Current Balance:         8.0 Days                      │
  │ Pending In Review:       2.0 Days                      │
  │ Effective Available:     6.0 Days                      │
  │ Balance After Approval:  5.0 Days (Sufficient)         │
  └────────────────────────────────────────────────────────┘
  ```
- **Validation Guardrails:** If requested days > available balance, the submit button is disabled and an informative alert warns: *"Your requested duration (4 days) exceeds your effective available balance (2 days)."*

### 3.3 Approver Dashboard & Pending Approval Queue
- **High-Priority Pending Queue:**
  - Displayed as contextual review cards or interactive table.
  - Each item displays:
    - Employee Avatar, Name, Staff ID, Department, and Designation.
    - Start Date, End Date, and Net Working Days (with breakdown popover).
    - Handover Person's name and role.
    - Full Reason (rendered securely with privacy guards).
    - Current balance and Projected Balance after approval.
    - **Approval Action Group:**
      - Green `Approve` button (triggers confirmation modal with optional remark).
      - Red `Reject` button (opens mandatory remark modal).
      - Blue `View Full History` link.

### 3.4 Staff & Leave Balances Management (`/approver/staff`)
- **Search & Filter Bar:**
  - Text search: filter by name, email, employee ID.
  - Department dropdown filter.
  - Status toggle: Active / Inactive.
  - Low balance threshold filter (< 2 days).
  - "Currently on Leave" filter.
  - Export: `Export CSV` button.
- **Roster Table:**
  - Columns: Staff ID, Name & Avatar, Department, Designation, Joining Date, Monthly Entitlement, Total Accrued, Used, Pending, Remaining Balance, Status, Actions.
  - Action item: "Open Leave Profile" and "Adjust Balance".

### 3.5 Manual Balance Adjustment Modal
- **Trigger:** From employee detail view by authorized Approver/Admin.
- **Required Inputs:**
  - Transaction Type: `MANUAL_CREDIT`, `MANUAL_DEBIT`, `OPENING_BALANCE`, `REVERSAL`, `ADJUSTMENT`.
  - Amount in Days (e.g., `+1.5` or `-1.0`).
  - Mandatory Audit Reason: e.g., *"Compensatory credit for Saturday emergency field flood response"*.
- **Live Preview:** Shows previous balance $\to$ adjusted new balance.
- **Execution:** Generates a real entry in `leave_ledger` with `created_by` audit reference. Never mutates historical records.

### 3.6 Team Leave Calendar (`/approver/calendar`)
- Monthly and weekly grid view showing staff on leave.
- Filterable by department.
- **Strict Privacy Rule:** The calendar shows **only** the employee name, department, and duration. It **never** reveals private medical or personal leave reasons to avoid privacy breaches.

### 3.7 Holiday Calendar Management (`/approver/settings/holidays`)
- Add Holiday Modal: Holiday Name, Date (Nepali Bikram Sambat / Gregorian sync), Description, Active toggle.
- List view of holidays with active/inactive status and delete/edit capabilities.
- Live reminder: *"Active holidays falling between Sunday and Friday are automatically excluded from leave calculations."*

---

## 4. Mobile Responsiveness Breakdown

| Viewport Width | Form Factor | Layout Adaptations |
| :--- | :--- | :--- |
| **360px – 390px** | Small Mobile (iPhone SE, Galaxy A) | Single-column cards. Tables transform into structured cards with badge rows. Bottom navigation bar or drawer menu. Touch targets $\ge 48\text{px}$. |
| **390px – 430px** | Modern Mobile (iPhone 14/15, Pixel) | Full-width responsive cards. Sticky floating action button for quick leave application. Modals open as bottom-sheet drawers. |
| **768px – 1024px** | Tablet & Small Laptops | Collapsible sidebar. 2-column dashboard metric grid. Horizontal scrolling preserved for data-dense tables with sticky left column. |
| **1200px+** | Desktop Workstations | Fixed persistent navigation sidebar. 4-column and 5-column metric grids. Dual-pane inspection view for leave approvals. |

---

## 5. Accessibility (a11y) & UX States
1. **Focus Management:** All buttons, date pickers, and inputs feature visible focus rings (`ring-2 ring-primary-600 ring-offset-2`).
2. **Keyboard Navigation:** Full tab-order navigation; ESC key closes modals, dropdowns, and drawers.
3. **Empty States:**
   - No Pending Requests: Friendly illustration + "All caught up! There are no pending leave requests awaiting approval."
   - No Leave History: "You have not submitted any leave requests yet. Click 'Apply for Leave' to get started."
4. **Loading States:** Skeleton screens matching table and card structures to eliminate visual layout shifts (CLS).
5. **Error & Notification Toasts:** Non-blocking floating toasts (via Sonner/Toast component) for asynchronous feedback (e.g., *"Leave request submitted. Email notification sent to approver."*).
