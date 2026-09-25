import { prisma } from './prisma';
import { createAuditLog } from './audit';

export interface AccrualRunResult {
  year: number;
  month: number;
  totalActiveStaff: number;
  creditedCount: number;
  alreadyCreditedCount: number;
  notYetJoinedCount: number;
  skippedInactiveCount: number;
  details: Array<{
    employeeId: string;
    employeeName: string;
    status: 'CREDITED' | 'ALREADY_CREDITED' | 'NOT_YET_JOINED' | 'INACTIVE';
    amount?: number;
    reason?: string;
  }>;
}

/**
 * Checks if a target month is eligible for leave accrual.
 * Accrual for a month is only granted on or after the 30th of that month (or last day for Feb).
 * Past months are always eligible.
 */
export function isMonthEligibleForAccrual(
  targetYear: number,
  targetMonth: number,
  now: Date = new Date()
): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12
  const currentDay = now.getDate();

  if (targetYear < currentYear) return true;
  if (targetYear > currentYear) return false;
  if (targetMonth < currentMonth) return true;
  if (targetMonth > currentMonth) return false;

  // targetMonth === currentMonth: Must have reached the 30th or last day of the month
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
  const thresholdDay = Math.min(30, lastDayOfMonth);
  return currentDay >= thresholdDay;
}

/**
 * Automatically catches up all eligible month-end accruals for an employee or all active employees.
 * This runs automatically whenever balances are retrieved, so leave is credited on the 30th without manual steps.
 */
export async function ensureUpToDateAccruals(targetEmployeeId?: string): Promise<number> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const settings = await prisma.organizationSettings.findUnique({
      where: { id: 'default' },
    });
    const defaultMonthlyEntitlement = settings?.monthly_paid_leave ?? 2.0;

    const employees = await prisma.profile.findMany({
      where: {
        status: 'ACTIVE',
        ...(targetEmployeeId ? { id: targetEmployeeId } : {}),
      },
    });

    let newlyCredited = 0;

    for (const emp of employees) {
      if (!emp.joining_date) continue;

      // Only accrue if an OPENING_BALANCE baseline has been set by admin
      const opening = await prisma.leaveLedger.findFirst({
        where: { employee_id: emp.id, transaction_type: 'OPENING_BALANCE' },
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      });

      // If no opening balance has been entered yet, do not auto-accrue.
      // Leave balance remains 0.00 until admin manually inputs remaining leave.
      if (!opening) {
        continue;
      }

      const opDate = new Date(opening.created_at);
      let startYear = opDate.getFullYear();
      let startMonth = opDate.getMonth() + 1; // 1 to 12

      // Accruals begin from the month following the baseline
      startMonth += 1;
      if (startMonth > 12) {
        startYear += 1;
        startMonth = 1;
      }

      for (let y = startYear; y <= currentYear; y++) {
        const startM = y === startYear ? startMonth : 1;
        const endM = y === currentYear ? currentMonth : 12;

        for (let m = startM; m <= endM; m++) {
          if (!isMonthEligibleForAccrual(y, m, now)) {
            continue; // Not yet 30th / month-end
          }

          const dedupKey = `ACCRUAL_${emp.id}_${y}_${m}`;
          const existing = await prisma.leaveLedger.findUnique({
            where: { dedup_key: dedupKey },
            select: { id: true },
          });

          if (!existing) {
            try {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
              ];
              const monthName = monthNames[m - 1] || `Month ${m}`;

              const empMonthlyEntitlement =
                typeof (emp as any).monthly_paid_leave === 'number' && !isNaN((emp as any).monthly_paid_leave)
                  ? (emp as any).monthly_paid_leave
                  : defaultMonthlyEntitlement;

              await prisma.leaveLedger.create({
                data: {
                  employee_id: emp.id,
                  transaction_type: 'MONTHLY_ACCRUAL',
                  amount: empMonthlyEntitlement,
                  accrual_year: y,
                  accrual_month: m,
                  notes: `${monthName} ${y} Month-End Automatic Paid Leave Accrual (${empMonthlyEntitlement}d on 30th)`,
                  dedup_key: dedupKey,
                },
              });
              newlyCredited++;
            } catch (err: any) {
              if (err.code !== 'P2002') {
                console.error(`Auto-accrual error for ${emp.id} (${y}-${m}):`, err);
              }
            }
          }
        }
      }
    }

    return newlyCredited;
  } catch (err) {
    console.error('ensureUpToDateAccruals error:', err);
    return 0;
  }
}

/**
 * Executes the monthly paid leave accrual process for a specified year and month.
 * Enforces strict idempotency through unique dedup keys in LeaveLedger.
 */
export async function runMonthlyAccrual(
  year?: number,
  month?: number,
  adminUserId?: string,
  force: boolean = false
): Promise<AccrualRunResult> {
  // If year/month not provided, default to current Kathmandu time
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1; // 1 to 12

  // Fetch organization settings
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: 'default' },
  });
  const defaultMonthlyEntitlement = settings?.monthly_paid_leave ?? 2.0;

  // Retrieve all profiles
  const allEmployees = await prisma.profile.findMany();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[targetMonth - 1] || `Month ${targetMonth}`;

  const result: AccrualRunResult = {
    year: targetYear,
    month: targetMonth,
    totalActiveStaff: 0,
    creditedCount: 0,
    alreadyCreditedCount: 0,
    notYetJoinedCount: 0,
    skippedInactiveCount: 0,
    details: [],
  };

  // Determine the start date of the accrual month in YYYY-MM-DD
  const accrualMonthStartStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const accrualMonthEndStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`;

  for (const emp of allEmployees) {
    if (emp.status !== 'ACTIVE') {
      result.skippedInactiveCount++;
      result.details.push({
        employeeId: emp.employee_id,
        employeeName: emp.full_name,
        status: 'INACTIVE',
        reason: `Employee status is ${emp.status}`,
      });
      continue;
    }

    result.totalActiveStaff++;

    // Employee must have an opening balance baseline set by administrator
    const opening = await prisma.leaveLedger.findFirst({
      where: { employee_id: emp.id, transaction_type: 'OPENING_BALANCE' },
      select: { id: true, created_at: true },
    });

    if (!opening) {
      result.notYetJoinedCount++;
      result.details.push({
        employeeId: emp.employee_id,
        employeeName: emp.full_name,
        status: 'NOT_YET_JOINED',
        reason: 'Opening balance baseline has not yet been set by administrator',
      });
      continue;
    }

    // Check joining date
    // Employee must have joined on or before the end of the accrual month to be eligible
    if (emp.joining_date > accrualMonthEndStr) {
      result.notYetJoinedCount++;
      result.details.push({
        employeeId: emp.employee_id,
        employeeName: emp.full_name,
        status: 'NOT_YET_JOINED',
        reason: `Employee joined on ${emp.joining_date}, after ${monthName} ${targetYear}`,
      });
      continue;
    }

    const dedupKey = `ACCRUAL_${emp.id}_${targetYear}_${targetMonth}`;

    // Check if already credited
    const existing = await prisma.leaveLedger.findUnique({
      where: { dedup_key: dedupKey },
    });

    if (existing) {
      result.alreadyCreditedCount++;
      result.details.push({
        employeeId: emp.employee_id,
        employeeName: emp.full_name,
        status: 'ALREADY_CREDITED',
        reason: `Monthly accrual of ${existing.amount} days was already processed on ${existing.created_at.toISOString().slice(0, 10)}`,
      });
      continue;
    }

    // Insert atomic ledger credit
    const empMonthlyEntitlement =
      typeof (emp as any).monthly_paid_leave === 'number' && !isNaN((emp as any).monthly_paid_leave)
        ? (emp as any).monthly_paid_leave
        : defaultMonthlyEntitlement;

    try {
      await prisma.leaveLedger.create({
        data: {
          employee_id: emp.id,
          transaction_type: 'MONTHLY_ACCRUAL',
          amount: empMonthlyEntitlement,
          accrual_year: targetYear,
          accrual_month: targetMonth,
          notes: `${monthName} ${targetYear} Monthly Paid Leave Accrual (${empMonthlyEntitlement}d)`,
          dedup_key: dedupKey,
          created_by: adminUserId ?? null,
        },
      });

      result.creditedCount++;
      result.details.push({
        employeeId: emp.employee_id,
        employeeName: emp.full_name,
        status: 'CREDITED',
        amount: empMonthlyEntitlement,
      });
    } catch (err: any) {
      // If constraint violation occurred concurrently
      if (err.code === 'P2002') {
        result.alreadyCreditedCount++;
        result.details.push({
          employeeId: emp.employee_id,
          employeeName: emp.full_name,
          status: 'ALREADY_CREDITED',
          reason: 'Concurrent transaction already committed this accrual',
        });
      } else {
        throw err;
      }
    }
  }

  // Record audit log
  await createAuditLog({
    userId: adminUserId ?? null,
    action: 'MONTHLY_ACCRUAL_PROCESSED',
    entityType: 'leave_ledger',
    entityId: `${targetYear}-${targetMonth}`,
    newValue: {
      year: targetYear,
      month: targetMonth,
      creditedCount: result.creditedCount,
      alreadyCreditedCount: result.alreadyCreditedCount,
      notYetJoinedCount: result.notYetJoinedCount,
    },
  });

  return result;
}
