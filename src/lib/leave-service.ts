import { prisma } from './prisma';
import { calculateWorkingDays } from './leave-calculator';
import { getEmployeeBalance } from './balance';
import { createAuditLog } from './audit';
import {
  sendLeaveSubmittedEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from './email';

export interface SubmitLeaveInput {
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  handoverEmployeeId: string;
  reason: string;
  leaveType?: 'REGULAR' | 'ADVANCE';
  contactDuringLeave?: string;
  additionalNotes?: string;
  attachmentUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Submits a new leave request with comprehensive server-side validations:
 * - Active employee check
 * - Handover employee active & not self
 * - Date bounds & working day calculation (excluding Saturdays and Holidays)
 * - Negative balance / effective balance checks
 * - Overlap detection with existing active/pending requests
 */
export async function submitLeaveRequest(input: SubmitLeaveInput) {
  const {
    employeeId,
    startDate,
    endDate,
    handoverEmployeeId,
    reason,
    leaveType = 'REGULAR',
    contactDuringLeave,
    additionalNotes,
    attachmentUrl,
    ipAddress,
    userAgent,
  } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error('A reason for taking leave is mandatory.');
  }

  // 1. Fetch requesting employee
  const employee = await prisma.profile.findUnique({
    where: { id: employeeId },
  });

  if (!employee || employee.status !== 'ACTIVE') {
    throw new Error('Only active employees are permitted to submit leave requests.');
  }

  // 2. Handover validation & automatic supervisor fallback if not selected
  let resolvedHandoverId = handoverEmployeeId;
  if (!resolvedHandoverId || resolvedHandoverId === 'NONE' || resolvedHandoverId.trim() === '') {
    if (employee.approver_id && employee.approver_id !== employeeId) {
      resolvedHandoverId = employee.approver_id;
    } else {
      const defaultApprover = await prisma.profile.findFirst({
        where: {
          role: { in: ['APPROVER', 'ADMIN'] },
          status: 'ACTIVE',
          id: { not: employeeId },
        },
      });
      resolvedHandoverId = defaultApprover?.id || employeeId;
    }
  }

  if (employeeId === resolvedHandoverId) {
    const anotherStaff = await prisma.profile.findFirst({
      where: { id: { not: employeeId }, status: 'ACTIVE' },
    });
    if (anotherStaff) resolvedHandoverId = anotherStaff.id;
  }

  const handoverEmployee = await prisma.profile.findUnique({
    where: { id: resolvedHandoverId },
  });

  if (!handoverEmployee || handoverEmployee.status !== 'ACTIVE') {
    throw new Error('Selected handover colleague must be an active staff member.');
  }

  // 3. Holidays & Working day calculation
  const holidays = await prisma.holiday.findMany({
    where: { active: true },
    select: { holiday_date: true, holiday_name: true, active: true },
  });

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: 'default' },
  });

  const weeklyHoliday = settings?.weekly_holiday_day_of_week ?? null;

  const calcResult = calculateWorkingDays(startDate, endDate, holidays, weeklyHoliday);
  if (!calcResult.isEligible) {
    throw new Error(calcResult.validationError || 'Invalid leave dates.');
  }

  // 4. Overlap check with existing PENDING or APPROVED requests
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employee_id: employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          start_date: { lte: endDate },
          end_date: { gte: startDate },
        },
      ],
    },
  });

  if (overlapping) {
    throw new Error(
      `You already have a ${overlapping.status.toLowerCase()} leave request spanning ${overlapping.start_date} to ${overlapping.end_date}. Overlapping requests are not allowed.`
    );
  }

  // 5. Balance check
  const balanceSummary = await getEmployeeBalance(employeeId);
  const allowNegative = settings?.negative_balance_allowed ?? false;
  const isAdvance = leaveType === 'ADVANCE';

  if (!allowNegative && !isAdvance && balanceSummary.availableForNewRequests < calcResult.calculatedDays) {
    throw new Error(
      `Insufficient available leave balance. You have ${balanceSummary.currentBalance} days total (${balanceSummary.pendingDays} days currently pending review), leaving ${balanceSummary.availableForNewRequests} days available for new requests. Requested: ${calcResult.calculatedDays} days. If you are facing an emergency, you may apply for Advance Leave (अग्रीम बिदा).`
    );
  }

  // 6. Persist Leave Request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      calculated_days: calcResult.calculatedDays,
      handover_employee_id: resolvedHandoverId,
      reason,
      leave_type: isAdvance ? 'ADVANCE' : 'REGULAR',
      contact_during_leave: contactDuringLeave,
      additional_notes: additionalNotes,
      attachment_url: attachmentUrl,
      status: 'PENDING',
    },
    include: {
      employee: true,
      handover_employee: true,
    },
  });

  // 7. Audit Log
  await createAuditLog({
    userId: employeeId,
    action: 'LEAVE_SUBMITTED',
    entityType: 'leave_requests',
    entityId: leaveRequest.id,
    newValue: {
      startDate,
      endDate,
      calculatedDays: calcResult.calculatedDays,
      leaveType: isAdvance ? 'ADVANCE' : 'REGULAR',
      handover: handoverEmployee.full_name,
      reason,
    },
    ipAddress,
    userAgent,
  });



  // 9. Send Email Notification to Approvers (Director & Admin) (Non-blocking)
  sendLeaveSubmittedEmail({
    requestId: leaveRequest.id,
    employeeName: employee.full_name,
    employeeId: employee.employee_id,
    department: employee.department,
    designation: employee.designation,
    leaveType: isAdvance ? 'ADVANCE' : 'REGULAR',
    startDate,
    endDate,
    calculatedDays: calcResult.calculatedDays,
    reason,
    handoverName: handoverEmployee.full_name,
    currentBalance: balanceSummary.currentBalance,
    projectedBalance: Math.round((balanceSummary.currentBalance - calcResult.calculatedDays) * 100) / 100,
  }).catch((err) => console.error('Background Email dispatch error:', err));

  return leaveRequest;
}

/**
 * Transactional Leave Approval.
 * Uses atomic balance revalidation, status check, ledger debit, and audit log.
 * Database unique constraint on dedup_key prevents any possibility of double debit.
 */
export async function approveLeaveRequest(
  requestId: string,
  approverId: string,
  remarks?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const approvalResult = await prisma.$transaction(async (tx) => {
    // 1. Fetch request and lock logic
    const req = await tx.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!req) {
      throw new Error('Leave request not found.');
    }

    if (req.status !== 'PENDING') {
      throw new Error(`Request cannot be approved because it is already ${req.status}.`);
    }

    // Strict Approver Permission Verification: Only Director and Administrator can approve
    const approver = await tx.profile.findUnique({
      where: { id: approverId },
    });
    if (
      !approver ||
      approver.role === 'STAFF' ||
      approver.email === 'aayush@jaynepal.org' ||
      approver.employee_id === 'JAV-002'
    ) {
      throw new Error(
        'Unauthorized: Only the Director and System Administrator have authorization to approve leave requests.'
      );
    }

    // 2. Re-verify ledger balance inside transaction
    const ledgerAgg = await tx.leaveLedger.findMany({
      where: { employee_id: req.employee_id },
      select: { amount: true },
    });
    const currentBalance = ledgerAgg.reduce((sum, item) => sum + item.amount, 0);

    const settings = await tx.organizationSettings.findUnique({
      where: { id: 'default' },
    });
    const allowNegative = settings?.negative_balance_allowed ?? false;
    const isAdvance = (req as any).leave_type === 'ADVANCE';

    if (!allowNegative && !isAdvance && currentBalance < req.calculated_days) {
      throw new Error(
        `Insufficient balance for approval. Employee has ${currentBalance} days, but request requires ${req.calculated_days} days.`
      );
    }

    const dedupKey = `DEBIT_${req.id}`;

    // 3. Atomically update LeaveRequest status
    const updatedRequest = await tx.leaveRequest.update({
      where: { id: req.id },
      data: {
        status: 'APPROVED',
        approved_by: approverId,
        approved_at: new Date(),
        approval_remarks: remarks,
      },
    });

    // 4. Create Ledger Debit (fails atomically if dedupKey exists)
    const ledgerEntry = await tx.leaveLedger.create({
      data: {
        employee_id: req.employee_id,
        transaction_type: 'APPROVED_LEAVE_DEBIT',
        amount: -req.calculated_days,
        leave_request_id: req.id,
        notes: isAdvance
          ? `Advance leave debited for request ${req.id} (${req.start_date} to ${req.end_date})`
          : `Approved leave debit for request ${req.id} (${req.start_date} to ${req.end_date})`,
        dedup_key: dedupKey,
        created_by: approverId,
      },
    });

    // 5. Create Audit Log
    await tx.auditLog.create({
      data: {
        user_id: approverId,
        action: 'LEAVE_APPROVED',
        entity_type: 'leave_requests',
        entity_id: req.id,
        old_value: JSON.stringify({ status: 'PENDING' }),
        new_value: JSON.stringify({
          status: 'APPROVED',
          remarks: remarks || null,
          debitAmount: req.calculated_days,
        }),
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      },
    });

    return { request: updatedRequest, ledgerEntry, employee: req.employee, approver };
  });

  // Send Email Notification to Employee on Approval (Non-blocking)
  if (approvalResult?.employee?.email) {
    sendLeaveApprovedEmail({
      requestId: approvalResult.request.id,
      recipientEmail: approvalResult.employee.email,
      employeeName: approvalResult.employee.full_name,
      startDate: approvalResult.request.start_date,
      endDate: approvalResult.request.end_date,
      calculatedDays: approvalResult.request.calculated_days,
      remarks,
      approverName: approvalResult.approver?.full_name || 'Director / Administration',
    }).catch((err) => console.error('Email dispatch error on leave approval:', err));
  }

  return { request: approvalResult.request, ledgerEntry: approvalResult.ledgerEntry };
}

/**
 * Rejects a leave request.
 * Does NOT deduct leave balance.
 */
export async function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  rejectionReason: string,
  ipAddress?: string,
  userAgent?: string
) {
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new Error('A reason for rejection must be provided.');
  }

  // Strict Approver Permission Verification: Only Director and Administrator can reject
  const approver = await prisma.profile.findUnique({
    where: { id: approverId },
  });
  if (
    !approver ||
    approver.role === 'STAFF' ||
    approver.email === 'aayush@jaynepal.org' ||
    approver.employee_id === 'JAV-002'
  ) {
    throw new Error(
      'Unauthorized: Only the Director and System Administrator have authorization to reject leave requests.'
    );
  }

  const req = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });

  if (!req) {
    throw new Error('Leave request not found.');
  }

  if (req.status !== 'PENDING') {
    throw new Error(`Request cannot be rejected because it is currently ${req.status}.`);
  }

  const updatedRequest = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      rejected_by: approverId,
      rejected_at: new Date(),
      rejection_reason: rejectionReason,
    },
    include: { employee: true },
  });

  await createAuditLog({
    userId: approverId,
    action: 'LEAVE_REJECTED',
    entityType: 'leave_requests',
    entityId: requestId,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'REJECTED', rejectionReason },
    ipAddress,
    userAgent,
  });

  // Send Email Notification to Employee on Rejection (Non-blocking)
  if ((updatedRequest as any).employee?.email) {
    const emp = (updatedRequest as any).employee;
    sendLeaveRejectedEmail({
      requestId: updatedRequest.id,
      recipientEmail: emp.email,
      employeeName: emp.full_name,
      startDate: updatedRequest.start_date,
      endDate: updatedRequest.end_date,
      calculatedDays: updatedRequest.calculated_days,
      rejectionReason,
      approverName: approver?.full_name || 'Director / Administration',
    }).catch((err) => console.error('Email dispatch error on leave rejection:', err));
  }

  return updatedRequest;
}

/**
 * Cancels a pending leave request.
 * Can only be executed while request is in PENDING status.
 */
export async function cancelLeaveRequest(
  requestId: string,
  employeeId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const req = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
  });

  if (!req) {
    throw new Error('Leave request not found.');
  }

  if (req.employee_id !== employeeId) {
    throw new Error('You do not have authorization to cancel this leave request.');
  }

  if (req.status !== 'PENDING') {
    throw new Error(`Only pending leave requests can be cancelled. Current status is ${req.status}.`);
  }

  const updatedRequest = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
    },
  });

  await createAuditLog({
    userId: employeeId,
    action: 'LEAVE_CANCELLED',
    entityType: 'leave_requests',
    entityId: requestId,
    oldValue: { status: 'PENDING' },
    newValue: { status: 'CANCELLED' },
    ipAddress,
    userAgent,
  });

  return updatedRequest;
}

/**
 * Performs an authorized manual balance adjustment (Credit or Debit) with mandatory reason.
 */
export async function adjustLeaveBalance(
  targetEmployeeId: string,
  adminUserId: string,
  transactionType: 'MANUAL_CREDIT' | 'MANUAL_DEBIT' | 'OPENING_BALANCE' | 'REVERSAL' | 'ADJUSTMENT',
  amount: number,
  notes: string,
  ipAddress?: string,
  userAgent?: string
) {
  if (!notes || notes.trim().length === 0) {
    throw new Error('Mandatory administrative reason required for manual leave adjustments.');
  }

  if (amount === 0) {
    throw new Error('Adjustment amount cannot be zero.');
  }

  // Adjust sign based on type
  let finalAmount = amount;
  if (transactionType === 'MANUAL_DEBIT' && finalAmount > 0) {
    finalAmount = -finalAmount;
  } else if (transactionType === 'MANUAL_CREDIT' && finalAmount < 0) {
    finalAmount = Math.abs(finalAmount);
  }

  const prevBalance = await getEmployeeBalance(targetEmployeeId);

  const ledgerEntry = await prisma.leaveLedger.create({
    data: {
      employee_id: targetEmployeeId,
      transaction_type: transactionType,
      amount: finalAmount,
      notes,
      created_by: adminUserId,
    },
  });

  const newBalance = await getEmployeeBalance(targetEmployeeId);

  await createAuditLog({
    userId: adminUserId,
    action: 'BALANCE_MANUALLY_ADJUSTED',
    entityType: 'leave_ledger',
    entityId: ledgerEntry.id,
    oldValue: { currentBalance: prevBalance.currentBalance },
    newValue: {
      transactionType,
      amount: finalAmount,
      newBalance: newBalance.currentBalance,
      notes,
    },
    ipAddress,
    userAgent,
  });

  return { ledgerEntry, prevBalance, newBalance };
}
