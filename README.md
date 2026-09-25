# Jaynepal Action Volunteers — Staff Leave Management Portal
### Production Web Application & Operations Manual
**Target Domain:** `https://leave.jaynepal.org`  
**Application Name:** JAV Staff Leave Portal  
**Organization:** Jaynepal Action Volunteers  
**System Timezone:** `Asia/Kathmandu` (UTC+05:45)  

---

## 1. Project Architecture Summary

The **JAV Staff Leave Portal** is an enterprise-grade full-stack web application built specifically for Jaynepal Action Volunteers. It replaces manual spreadsheets and unverified leave counters with an **immutable double-entry Leave Ledger**, automated **Nepali calendar working-day calculations** (excluding Saturdays and approved organization holidays), and **Meta WhatsApp Cloud API notifications**.

### Key Architectural Pillars
1. **Auditable Leave Ledger (Source of Truth):** Leave balances are never stored as a mutable number. They are computed from an auditable transaction history (`MONTHLY_ACCRUAL`, `APPROVED_LEAVE_DEBIT`, `OPENING_BALANCE`, `MANUAL_CREDIT`, `MANUAL_DEBIT`, `ADJUSTMENT`).
2. **Nepali Workweek & Holiday Awareness:** Saturday is automatically omitted as the weekly rest day (0 days deducted). Approved organization/national holidays falling on Sunday–Friday are excluded.
3. **Idempotent Monthly Accrual:** Credits 2.00 paid leave days per month. Database unique constraints prevent double-crediting. Staff members only accrue from their joining month onwards.
4. **Strict Concurrency Protection:** Approval actions utilize atomic database transactions and unique deduplication keys, preventing double-approval or double-debit even under simultaneous clicks.
5. **Decoupled Email Notifications:** Automated SMTP (Nodemailer) integration logs every attempt (`QUEUED`, `SENT`, `FAILED`). Failures never block leave submissions and can be retried with one click.
6. **Unified Auth with Role-Based Access Control (RBAC):** Visually separated entry points (`/login` for staff, `/approver/login` for managers) backed by HTTP-only secure JWT sessions and strict server-side middleware route guards.

---

## 2. Folder Structure

```text
d:/Jaynepal staff leave system/
├── product.md                     # Product requirements & business rules
├── ui.md                          # UI/UX design specifications & responsive layouts
├── engineering.md                 # System architecture, schemas, and concurrency safety
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Orchestration for App + PostgreSQL
├── .dockerignore
├── .env.example                   # Production environment variable reference
├── .env                           # Local development environment configuration
├── package.json                   # Dependencies, scripts, and test definitions
├── tsconfig.json                  # TypeScript compiler settings
├── tailwind.config.ts             # Tailwind CSS tokens and brand palette
├── postcss.config.js
├── next.config.mjs                # Next.js standalone output configuration
├── nginx/
│   └── leave.jaynepal.org.conf    # Nginx virtual host with TLS 1.3 & security headers
├── prisma/
│   ├── schema.prisma              # Local development schema (SQLite zero-dependency)
│   ├── schema.postgresql.prisma   # Production PostgreSQL schema
│   └── seed.js                    # Database seed script (sample staff, holidays, ledger)
├── src/
│   ├── middleware.ts              # Edge server-side RBAC guard for /approver routes
│   ├── lib/
│   │   ├── prisma.ts              # PrismaClient singleton
│   │   ├── types.ts               # Shared TypeScript interfaces
│   │   ├── auth.ts                # Jose JWT, bcrypt hashing, session cookies
│   │   ├── leave-calculator.ts    # Working day calculation (Saturdays & Holidays)
│   │   ├── balance.ts             # Live balance aggregation from ledger
│   │   ├── leave-service.ts       # Transactional submission, approval & rejection
│   │   ├── accrual.ts             # Idempotent monthly accrual engine
│   │   ├── email.ts               # Nodemailer SMTP email dispatcher & retry
│   │   └── audit.ts               # Structured administrative audit logger
│   ├── components/
│   │   ├── Navbar.tsx             # Responsive header with JAV branding & user info
│   │   ├── Sidebar.tsx            # Staff & Approver navigation sidebar
│   │   ├── PortalLayout.tsx       # Main authenticated page layout wrapper
│   │   ├── StatusBadge.tsx        # Semantic color status badges
│   │   ├── SummaryCards.tsx       # 5-grid leave summary metric cards
│   │   └── ApproverRequestActions.tsx # Approver review table, approval & rejection modals
│   └── app/
│       ├── layout.tsx             # Root HTML and metadata layout
│       ├── globals.css            # Global CSS, accessible focus rings, scrollbars
│       ├── page.tsx               # Root redirector based on authentication role
│       ├── login/                 # Staff Login portal
│       ├── approver/
│       │   ├── login/             # Approver & Executive Login portal
│       │   ├── dashboard/         # Approver Executive Dashboard & review queue
│       │   ├── requests/          # All leave requests & pending queue
│       │   ├── leave/[id]/        # Direct leave review landing page
│       │   ├── staff/             # Staff & Leave Balances roster & employee profile
│       │   ├── calendar/          # Privacy-preserved Team Leave Calendar
│       │   ├── employees/         # User management (create & toggle staff)
│       │   ├── settings/          # Org settings, holidays, & manual accrual trigger
│       │   ├── notifications/     # Email dispatch logs & retry engine
│       │   └── audit/             # Master system audit log
│       ├── dashboard/             # Staff personal dashboard
│       ├── leave/
│       │   ├── apply/             # Leave application form with live calculation
│       │   ├── requests/          # Staff personal leave requests & cancellation
│       │   └── ledger/            # Staff transparent leave balance history
│       ├── profile/               # Staff profile & password change
│       └── api/                   # REST API routes for auth, leave, approvals, exports
└── tests/
    ├── leave-calculator.test.mjs  # Unit tests for working days & holiday exclusions
    ├── accrual-and-concurrency.test.mjs # Tests for monthly accrual & concurrency locks
    └── integration-workflows.test.mjs  # End-to-end integration and security tests
```

---

## 3. Database Schema Explanation

### Core Tables
1. **`profiles`**: Stores staff members, approvers, and administrators. Fields include `employee_id`, `email`, `password_hash`, `full_name`, `whatsapp_number`, `department`, `designation`, `joining_date`, `role` (`STAFF`, `APPROVER`, `ADMIN`), and `status` (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
2. **`leave_requests`**: Stores leave applications. Includes `start_date`, `end_date`, `calculated_days`, `handover_employee_id`, `reason`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), and decision remarks.
3. **`leave_ledger`**: The immutable double-entry source of truth. Contains `transaction_type`, `amount` (+ credits, - debits), `dedup_key`, `accrual_year`, `accrual_month`, and `notes`.
   - `dedup_key` enforces unique database constraints (`ACCRUAL_empId_year_month` and `DEBIT_requestId`), making double-crediting or double-debiting mathematically impossible.
4. **`holidays`**: Stores official organization and national holidays in Nepal (e.g. Dashain, Tihar, Buddha Jayanti). Active holidays are excluded from leave calculations.
5. **`organization_settings`**: Configures organization name, default monthly entitlement (2.0 days), weekly holiday (Saturday), carry forward, negative balance, and SMTP settings.
6. **`audit_logs`**: Tamper-evident record of all administrative actions (`LEAVE_APPROVED`, `LEAVE_REJECTED`, `BALANCE_ADJUSTED`, `EMPLOYEE_CREATED`, etc.).
7. **`notification_logs`**: Logs all email alerts with recipient, payload, provider message ID, and delivery status (`SENT`, `FAILED`, `QUEUED`).

---

## 4. Local Installation & Development Commands

```bash
# 1. Clone or navigate to the repository
cd "d:/Jaynepal staff leave system"

# 2. Install dependencies
npm install

# 3. Initialize database schema
npx prisma generate
npx prisma db push

# 4. Seed database with initial users, holidays, and demo transactions
node prisma/seed.js

# 5. Run test suite
npm test

# 6. Start local development server
npm run dev
# Server will be live at http://localhost:3000
```

---

## 5. Development Credentials (Local Testing Only)

> [!WARNING]
> These credentials are for local development and initial testing only. Change all passwords upon production deployment.

| Role | Portal URL | Official Email | Staff ID | Full Name | Designation & Department | Default Password |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Director / Admin** | `/approver/login` | `sobit@jaynepal.org` | JAV-001 | Sobit Basnet | Director, Jay Nepal NGO | `JaynepalAdmin2026!` |
| **Vice Director / Admin** | `/approver/login` | `aayush@jaynepal.org` | JAV-002 | Aayush Wasti | Vice Director, Jay Nepal NGO | `JaynepalAdmin2026!` |
| **Medical Superintendent** | `/approver/login` | `dr.bikesh@jaynepal.org` | JAV-007 | Dr. Bikesh Shrestha | Medical Superintendent, Bodgaun Primary Hospital | `JaynepalAdmin2026!` |
| **Coordinator (SOSD)** | `/login` | `sajan@jaynepal.org` | JAV-003 | Sajan Majhi | Coordinator, School of Social Development (SOSD) | `JaynepalStaff2026!` |
| **IT Teacher** | `/login` | `aavash@jaynepal.org` | JAV-004 | Aavash Poudel | IT Teacher, IT Education Program | `JaynepalStaff2026!` |
| **Cleaner (SOSD)** | `/login` | `sarita.majhi@jaynepal.org` | JAV-005 | Sarita Majhi | Cleaner, School of Social Development (SOSD) | `JaynepalStaff2026!` |
| **Security Guard** | `/login` | `tarachandra@jaynepal.org` | JAV-006 | Tarachandra Majhi | Security Guard / Facility Support, SOSD | `JaynepalStaff2026!` |
| **Lab Technician** | `/login` | `aastha@jaynepal.org` | JAV-008 | Aastha Parajuli | Lab Technician, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Pharmacist** | `/login` | `sudip.moktan@jaynepal.org` | JAV-009 | Sudip Moktan | Pharmacist, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Health Assistant (HA)** | `/login` | `sudip.basnet@jaynepal.org` | JAV-010 | Sudip Basnet | Health Assistant (HA), Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Staff Nurse** | `/login` | `rakshya@jaynepal.org` | JAV-011 | Rakshya Pandeya | Staff Nurse, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Cashier & Admin** | `/login` | `sarita.admin@jaynepal.org` | JAV-012 | Sarita Majhi (A) | Cashier & Administrative Reporting Assistant | `JaynepalStaff2026!` |
| **Area Lead** | `/login` | `bimal@jaynepal.org` | JAV-013 | Bimal Majhi | Area Lead, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Maintenance Lead** | `/login` | `insaan@jaynepal.org` | JAV-014 | Insaan Majhi | Maintenance Lead, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **AHW** | `/login` | `sarita.danuwar@jaynepal.org` | JAV-015 | Sarita Danuwar | AHW, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **ANM** | `/login` | `sabina@jaynepal.org` | JAV-016 | Sabina Rai Danuwar | ANM, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **AHW** | `/login` | `gorakh@jaynepal.org` | JAV-017 | Gorakh Gurdhami | AHW, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **OH** | `/login` | `maiya@jaynepal.org` | JAV-018 | Maiya Neupane | OH, Bodgaun Primary Hospital | `JaynepalStaff2026!` |
| **Senior HA** | `/login` | `datta@jaynepal.org` | JAV-019 | Datta Singh Karki | Senior HA / Anesthesia Assistant, Hospital | `JaynepalStaff2026!` |
| **System Admin Root** | `/approver/login` | `admin@jaynepal.org` | JAV-ADM-000 | Central Admin | System Root Administrator | `JaynepalAdmin2026!` |

---

## 6. How Monthly Leave Accrual Works & How to Run It

- Each active staff member receives **2.00 days** of paid leave per month.
- Employees who joined after the target month are automatically skipped (no retroactive credits before joining).
- Unused leave carries forward automatically.

### Running Accrual Automatically
You can set up a monthly Linux cron job on the production server to invoke the internal accrual runner on the 1st of every month:
```bash
0 0 1 * * curl -X POST https://leave.jaynepal.org/api/approver/accrual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### Running Accrual Manually
1. Log in to the Approver Console (`/approver/login`).
2. Navigate to **Organization Settings** (`/approver/settings`).
3. Click the **"Run Monthly Accrual"** button.
4. Select the target year and month (defaults to current month).
5. Click **"Run Accrual Now"**. The modal displays an itemized receipt showing newly credited staff, already-credited staff, and employees joining later.

---

## 7. Email Notification (Gmail / SMTP) Setup Instructions

1. Configure SMTP in `.env` or in the **Approver Settings** (`/approver/settings`):
   ```bash
   ADMIN_NOTIFICATION_EMAILS="sobitb22@gmail.com"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="465"
   SMTP_SECURE="true"
   SMTP_USER="sobitb22@gmail.com"
   SMTP_PASS="your_16_character_google_app_password"
   SMTP_FROM="Jaynepal Action Volunteers <sobitb22@gmail.com>"
   ```
2. For Gmail, generate a 16-character **Google App Password** from your Google Account > Security > 2-Step Verification > App Passwords.
3. Test your configuration directly from the Approver portal via **"Send Test Email"** on `/approver/notifications` or `/approver/settings`.

---

## 8. Production Docker Deployment (`leave.jaynepal.org`)

### Step 1: Clone onto VPS / Hostinger Server
```bash
git clone <your-repo-url> /var/www/jav-leave
cd /var/www/jav-leave
cp .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` on the server:
```bash
DATABASE_URL="postgresql://jav_admin:StrongPasswordHere@postgres:5432/jav_leave_db?schema=public"
JWT_SECRET="generate-32-char-random-secret-key-here"
APP_URL="https://leave.jaynepal.org"
NEXT_PUBLIC_APP_URL="https://leave.jaynepal.org"
APP_TIMEZONE="Asia/Kathmandu"
```

### Step 3: Launch Containers
```bash
# Build and run containers
docker-compose up -d --build

# Run PostgreSQL database migrations
docker-compose exec app npx prisma db push --schema=prisma/schema.postgresql.prisma

# Seed initial admin and holidays
docker-compose exec app node prisma/seed.js
```

### Step 4: Configure DNS & Nginx Reverse Proxy
1. Add an **A Record** in your domain registrar DNS:
   - **Host:** `leave`
   - **Type:** `A`
   - **Value:** `<Your-Server-Public-IP>`
2. Copy the Nginx virtual host configuration:
   ```bash
   sudo cp nginx/leave.jaynepal.org.conf /etc/nginx/sites-available/leave.jaynepal.org.conf
   sudo ln -s /etc/nginx/sites-available/leave.jaynepal.org.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. Issue free SSL certificate via Certbot:
   ```bash
   sudo certbot --nginx -d leave.jaynepal.org
   ```

---

## 9. Backup & Disaster Recovery Procedures

### Database Backup
Run a nightly cron job to create compressed SQL dumps:
```bash
# Backup PostgreSQL database
docker-compose exec -T postgres pg_dump -U jav_admin jav_leave_db | gzip > /backups/jav_leave_$(date +%Y%m%d_%H%M%S).sql.gz

# Retain backups for 30 days
find /backups -name "jav_leave_*.sql.gz" -mtime +30 -exec rm {} \;
```

### Database Restore
```bash
gunzip < /backups/jav_leave_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T postgres psql -U jav_admin -d jav_leave_db
```

---

## 10. Automated Test Results

The full test suite can be run at any time via `npm test`. All tests have been executed with 100% pass rates:
- **`leave-calculator.test.mjs`**: Sunday–Tuesday (3 days), Friday–Sunday (2 days with Saturday excluded), Single Saturday (0 days rejection), Holiday deductions.
- **`accrual-and-concurrency.test.mjs`**: Stepwise accrual sequence (0 $\to$ 2 $\to$ 4 $\to$ 3 $\to$ 5), idempotency verification (running second time remains 5, not 7), and **two simultaneous approval actions** verifying exactly one approval succeeds and exactly one ledger debit is committed.
- **`integration-workflows.test.mjs`**: End-to-end leave submission, balance lock, approval transaction, rejection, cancellation, and cross-employee confidentiality checks.
#   L e a v e - s y s t e m - J N  
 #   L e a v e - s y s t e m - J N  
 #   L e a v e - s y s t e m - J N  
 