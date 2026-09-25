import { prisma } from './prisma';
import { EmployeeBalanceSummary } from './types';
import { ensureUpToDateAccruals } from './accrual';

/**
 * Computes an employee's exact leave balance directly from the immutable leave ledger
 * and aggregates currently pending leave commitments.
 * Automatically ensures all eligible month-end (30th) accruals are up to date.
 */
export async function getEmployeeBalance(employeeId: string): Promise<EmployeeBalanceSummary> {
  // Catch up any pending month-end accruals automatically
  await ensureUpToDateAccruals(employeeId);

  // Aggregate ledger
  const ledgerEntries = await prisma.leaveLedger.findMany({
    where: { employee_id: employeeId },
    select: { amount: true },
  });

  let currentBalance = 0;
  let totalAccrued = 0;
  let totalUsed = 0;

  for (const entry of ledgerEntries) {
    currentBalance += entry.amount;
    if (entry.amount > 0) {
      totalAccrued += entry.amount;
    } else if (entry.amount < 0) {
      totalUsed += Math.abs(entry.amount);
    }
  }

  // Aggregate pending requests
  const pendingRequests = await prisma.leaveRequest.findMany({
    where: {
      employee_id: employeeId,
      status: 'PENDING',
    },
    select: { calculated_days: true },
  });

  const pendingDays = pendingRequests.reduce((sum, req) => sum + req.calculated_days, 0);

  // Round to 2 decimal places to prevent floating-point precision issues
  currentBalance = Math.round(currentBalance * 100) / 100;
  totalAccrued = Math.round(totalAccrued * 100) / 100;
  totalUsed = Math.round(totalUsed * 100) / 100;
  const roundedPending = Math.round(pendingDays * 100) / 100;
  const availableForNewRequests = Math.round((currentBalance - roundedPending) * 100) / 100;

  return {
    currentBalance,
    totalAccrued,
    totalUsed,
    pendingDays: roundedPending,
    availableForNewRequests,
  };
}
