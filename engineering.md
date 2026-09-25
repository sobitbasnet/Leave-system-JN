# Jaynepal Action Volunteers — Staff Leave Management Portal
## Engineering & Technical Architecture Document (`engineering.md`)

**Target System:** JAV Staff Leave Portal  
**Deployment Target:** `https://leave.jaynepal.org`  
**Timezone:** `Asia/Kathmandu` (UTC+05:45)  
**Author:** Senior Full-Stack Software Engineer & Systems Architect  
**Status:** Approved for Implementation  

---

## 1. System Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                  │
│  - Staff Mobile Browser (PWA ready, Responsive 360px+)                 │
│  - Approver / Executive Management Console                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Reverse Proxy & Ingress                           │
│  - Nginx / Caddy with SSL Auto-Renewal (Certbot / Let's Encrypt)       │
│  - Rate Limiting & Security Headers (CSP, HSTS, X-Frame-Options)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Reverse Proxy (Port 3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 14/15 Full-Stack Application                  │
│  ┌───────────────────────────────┐ ┌────────────────────────────────┐  │
│  │   Frontend Presentation       │ │   Server Actions & API Routes  │  │
│  │   - React Server Components   │ │   - Route Guards & RBAC        │  │
│  │   - Client Form Validations   │ │   - Leave Calculation Engine   │  │
│  │   - Tailwind CSS / Radix UI   │ │   - Transactional Approval Svc │  │
│  │   - Live Calculation Preview  │ │   - Email Dispatch Service  │  │
│  └───────────────────────────────┘ └────────────────┬───────────────┘  │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │
              ┌───────────────────────────────────────┴───────────────────────────────────────┐
              ▼                                                                               ▼
┌──────────────────────────────────────────────┐                       ┌──────────────────────────────────────────────┐
│        Relational Database (PostgreSQL)      │                       │          External Notification APIs          │
│  - Leave Ledger (Immutable Transactions)     │                       │  - Automated SMTP / Gmail Email Dispatch    │
│  - Staff Profiles & RBAC Credentials         │                       │  - Notification Failure Queue & Retry Engine │
│  - Concurrency Lock & Unique Constraints     │                       └──────────────────────────────────────────────┘
│  - Organization Settings & Public Holidays   │
│  - Audit Logs & Event History                │
└──────────────────────────────────────────────┘
```

---

## 2. Complete Database Schema (PostgreSQL)

```sql
-- Enums
CREATE TYPE user_role AS ENUM ('STAFF', 'APPROVER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE ledger_transaction_type AS ENUM (
  'OPENING_BALANCE',
  'MONTHLY_ACCRUAL',
  'APPROVED_LEAVE_DEBIT',
  'MANUAL_CREDIT',
  'MANUAL_DEBIT',
  'REVERSAL',
  'ADJUSTMENT'
);
CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- 1. Profiles & Staff Accounts
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  whatsapp_number VARCHAR(30) NOT NULL,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  profile_photo_url TEXT,
  role user_role NOT NULL DEFAULT 'STAFF',
  status user_status NOT NULL DEFAULT 'ACTIVE',
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requires_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_approver_id ON profiles(approver_id);

-- 2. Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  calculated_days NUMERIC(5, 2) NOT NULL CHECK (calculated_days > 0),
  handover_employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  contact_during_leave VARCHAR(100),
  additional_notes TEXT,
  attachment_url TEXT,
  status leave_status NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approval_remarks TEXT,
  rejected_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (end_date >= start_date),
  CONSTRAINT check_handover_not_self CHECK (employee_id <> handover_employee_id)
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- 3. Leave Ledger (Double-Entry Source of Truth)
CREATE TABLE leave_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  transaction_type ledger_transaction_type NOT NULL,
  amount NUMERIC(5, 2) NOT NULL, -- Positive for credits, negative for debits
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE RESTRICT,
  accrual_year INT,
  accrual_month INT,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency constraint for monthly accruals:
CREATE UNIQUE INDEX uq_employee_monthly_accrual 
ON leave_ledger (employee_id, accrual_year, accrual_month, transaction_type)
WHERE transaction_type = 'MONTHLY_ACCRUAL';

-- Unique constraint preventing duplicate ledger debit for same leave request:
CREATE UNIQUE INDEX uq_ledger_leave_request 
ON leave_ledger (leave_request_id, transaction_type)
WHERE transaction_type = 'APPROVED_LEAVE_DEBIT';

CREATE INDEX idx_leave_ledger_employee ON leave_ledger(employee_id);

-- 4. Organization Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name VARCHAR(150) NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(holiday_date);

-- 5. Organization Settings
CREATE TABLE organization_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  organization_name VARCHAR(150) NOT NULL DEFAULT 'Jaynepal Action Volunteers',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kathmandu',
  monthly_paid_leave NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
  weekly_holiday_day_of_week INT NOT NULL DEFAULT 6, -- 6 = Saturday (Sunday=0 ... Saturday=6)
  carry_forward_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_carry_forward NUMERIC(5, 2), -- NULL means unlimited
  negative_balance_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  approver_whatsapp_number VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- 7. Notification Logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
  recipient VARCHAR(100) NOT NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP',
  status notification_status NOT NULL DEFAULT 'QUEUED',
  provider VARCHAR(50) NOT NULL DEFAULT 'META_CLOUD_API',
  provider_message_id VARCHAR(255),
  payload JSONB,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_request ON notification_logs(leave_request_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
```

---

## 3. Leave Calculation & Accrual Engine

### 3.1 Working Day Calculation Function
```typescript
export interface CalculationResult {
  calendarDays: number;
  saturdaysExcluded: number;
  holidaysExcluded: number;
  excludedHolidayNames: string[];
  calculatedDays: number;
  isEligible: boolean;
  validationError?: string;
}

export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  holidays: { holiday_date: string; holiday_name: string; active: boolean }[],
  weeklyHolidayDayOfWeek = 6 // 6 = Saturday
): CalculationResult {
  const start = new Date(startDateStr + 'T00:00:00+05:45');
  const end = new Date(endDateStr + 'T00:00:00+05:45');

  if (end < start) {
    return {
      calendarDays: 0,
      saturdaysExcluded: 0,
      holidaysExcluded: 0,
      excludedHolidayNames: [],
      calculatedDays: 0,
      isEligible: false,
      validationError: 'End date cannot be earlier than start date.',
    };
  }

  // Active holiday lookup set
  const activeHolidayMap = new Map<string, string>();
  for (const h of holidays) {
    if (h.active) activeHolidayMap.set(h.holiday_date, h.holiday_name);
  }

  let current = new Date(start);
  let calendarDays = 0;
  let saturdaysExcluded = 0;
  let holidaysExcluded = 0;
  let calculatedDays = 0;
  const excludedHolidayNames: string[] = [];

  while (current <= end) {
    calendarDays++;
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
    const dateIso = current.toISOString().slice(0, 10);

    if (dayOfWeek === weeklyHolidayDayOfWeek) {
      saturdaysExcluded++;
    } else if (activeHolidayMap.has(dateIso)) {
      holidaysExcluded++;
      excludedHolidayNames.push(activeHolidayMap.get(dateIso)!);
    } else {
      calculatedDays += 1.0;
    }

    current.setDate(current.getDate() + 1);
  }

  if (calculatedDays <= 0) {
    return {
      calendarDays,
      saturdaysExcluded,
      holidaysExcluded,
      excludedHolidayNames,
      calculatedDays: 0,
      isEligible: false,
      validationError: 'Selected period contains 0 working days (falls entirely on Saturdays or Holidays).',
    };
  }

  return {
    calendarDays,
    saturdaysExcluded,
    holidaysExcluded,
    excludedHolidayNames,
    calculatedDays,
    isEligible: true,
  };
}
```

### 3.2 Dynamic Balance Calculation from Ledger
```sql
-- Fast aggregation view for balances:
SELECT 
  employee_id,
  COALESCE(SUM(amount), 0) AS current_balance,
  COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_accrued,
  COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_used
FROM leave_ledger
WHERE employee_id = $1
GROUP BY employee_id;
```

---

## 4. Concurrency & Transactional Approval Safety

To satisfy requirement §36 and §37 (Double Approval Prevention and Concurrency Protection):
```typescript
export async function approveLeaveRequest(
  requestId: string,
  approverId: string,
  approvalRemarks?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Pessimistic lock on the leave request
    const request = await tx.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'PENDING') {
      throw new Error('Leave request is no longer pending or does not exist.');
    }

    // 2. Lock & re-verify the employee balance
    const ledgerAgg = await tx.leaveLedger.aggregate({
      where: { employee_id: request.employee_id },
      _sum: { amount: true },
    });
    const currentBalance = Number(ledgerAgg._sum.amount ?? 0);

    if (currentBalance < Number(request.calculated_days)) {
      throw new Error(`Insufficient leave balance. Current: ${currentBalance}, Required: ${request.calculated_days}`);
    }

    // 3. Atomically update request status to APPROVED
    const updatedRequest = await tx.leaveRequest.update({
      where: { id: requestId, status: 'PENDING' }, // atomic check
      data: {
        status: 'APPROVED',
        approved_by: approverId,
        approved_at: new Date(),
        approval_remarks: approvalRemarks,
      },
    });

    // 4. Create Ledger Debit (Guaranteed unique by DB constraint)
    const ledgerEntry = await tx.leaveLedger.create({
      data: {
        employee_id: request.employee_id,
        transaction_type: 'APPROVED_LEAVE_DEBIT',
        amount: -Number(request.calculated_days),
        leave_request_id: requestId,
        notes: `Approved leave debit for request ${requestId} (${request.start_date} to ${request.end_date})`,
        created_by: approverId,
      },
    });

    // 5. Create Audit Log
    await tx.auditLog.create({
      data: {
        user_id: approverId,
        action: 'LEAVE_APPROVED',
        entity_type: 'leave_requests',
        entity_id: requestId,
        old_value: { status: 'PENDING' },
        new_value: { status: 'APPROVED', debit_amount: request.calculated_days },
      },
    });

    return { success: true, updatedRequest, ledgerEntry };
  }, {
    isolationLevel: 'Serializable', // Highest isolation level preventing phantom reads and race conditions
  });
}
```

---

## 5. Email Notification & Retry Architecture

### 5.1 Service Design
```typescript
export interface EmailNotificationPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  leaveRequestId?: string;
  notificationType?: string;
}

export class EmailNotificationService {
  // Uses Nodemailer with SMTP credentials (Gmail App Password)
  // Configured in .env or Organization Settings
  // Dispatches non-blocking emails on submission, approval, and rejection
}
```

---

## 6. Authentication, RBAC & Server-Side Route Protection

- **Unified Auth Backend:** Single user table with encrypted passwords (Argon2id/bcrypt) and signed HTTP-only secure session cookies (`jwt` or iron-session).
- **Middleware Guard:**
  - If a user accesses `/approver/*` without `APPROVER` or `ADMIN` role, the server halts processing immediately and returns HTTP 403 Forbidden or redirects to `/login`.
  - Ordinary staff accessing `/api/approver/*` receives JSON `{ error: 'Forbidden' }` with HTTP 403.
- **Data Isolation:** Queries for staff leave history strictly filter by `where: { employee_id: session.user.id }`. Under no circumstances can client input alter `employee_id` to query another person's confidential records.

---

## 7. Production Docker & Deployment Configuration

### 7.1 Multi-Stage Production `Dockerfile`
```dockerfile
# 1. Base Node Image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production

# 2. Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 4. Production Runner
FROM base AS runner
WORKDIR /app
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

### 7.2 Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: jav_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-jav_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-SuperSecretPassword123!}
      POSTGRES_DB: ${POSTGRES_DB:-jav_leave_db}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: jav_leave_app
    restart: always
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-jav_admin}:${POSTGRES_PASSWORD:-SuperSecretPassword123!}@postgres:5432/${POSTGRES_DB:-jav_leave_db}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      APP_URL: https://leave.jaynepal.org
      APP_TIMEZONE: Asia/Kathmandu
      SMTP_HOST: smtp.gmail.com
      SMTP_PORT: 465
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  pgdata:
```

### 7.3 Nginx Virtual Host & SSL Configuration (`leave.jaynepal.org`)
```nginx
server {
    listen 80;
    server_name leave.jaynepal.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name leave.jaynepal.org;

    ssl_certificate /etc/letsencrypt/live/leave.jaynepal.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leave.jaynepal.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Verification & Testing Strategy
1. **Leave Calculation Unit Tests:**
   - Standard Sunday–Tuesday test: verifies 3 working days.
   - Weekend test (Friday–Sunday): verifies exactly 2 working days (Saturday excluded).
   - Single Saturday test: verifies 0 working days with validation rejection.
   - Holiday inside range test: verifies accurate holiday deductions and name reporting.
   - Date end before start test: throws validation error.
2. **Accrual Idempotency Tests:**
   - Simulates January, February, March runs with sequential balance additions.
   - Re-running an accrual for the same month must yield identical balance, not additional days.
3. **Approval Concurrency & Double-Debit Tests:**
   - Two concurrent approval triggers for the same pending request.
   - Verification that exactly one approval succeeds and exactly one ledger debit is committed.
4. **End-to-End Browser Flow:**
   - Staff login $\to$ Leave application submission $\to$ Approver login $\to$ Approval $\to$ Balance deduction verification $\to$ Audit log check $\to$ Security route guard verification.
