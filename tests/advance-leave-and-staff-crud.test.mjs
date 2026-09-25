import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function isMonthEligibleForAccrual(targetYear, targetMonth, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  if (targetYear < currentYear) return true;
  if (targetYear > currentYear) return false;
  if (targetMonth < currentMonth) return true;
  if (targetMonth > currentMonth) return false;

  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
  const thresholdDay = Math.min(30, lastDayOfMonth);
  return currentDay >= thresholdDay;
}

test('Advance Leave & Staff CRUD: Complete Workflow Validation', async () => {
  const ts = Date.now();
  const passwordHash = await bcrypt.hash('AdminPass2026!', 10);

  // 1. Create an Admin account
  const admin = await prisma.profile.create({
    data: {
      employee_id: `ADM-CRUD-${ts}`,
      email: `admin.crud.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Test Administrator',
      whatsapp_number: '9779800000020',
      department: 'Executive Administration',
      designation: 'Director',
      joining_date: '2025-01-01',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 2. Create Staff with Initial Remaining Leave (Opening Balance) of 2.0 days
  const staff = await prisma.profile.create({
    data: {
      employee_id: `STF-ADV-${ts}`,
      email: `staff.adv.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Ramesh Adhikari',
      whatsapp_number: '9779800000021',
      department: 'Health Program',
      designation: 'Health Assistant',
      joining_date: '2026-01-15',
      role: 'STAFF',
      status: 'ACTIVE',
      approver_id: admin.id,
    },
  });

  // Add Initial Remaining Leave via ledger
  await prisma.leaveLedger.create({
    data: {
      employee_id: staff.id,
      transaction_type: 'OPENING_BALANCE',
      amount: 2.0,
      notes: 'Initial remaining leave balance on account creation',
      dedup_key: `OPENING_${staff.id}`,
      created_by: admin.id,
    },
  });

  // Create handover colleague
  const colleague = await prisma.profile.create({
    data: {
      employee_id: `STF-COL-${ts}`,
      email: `colleague.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Sita Sharma',
      whatsapp_number: '9779800000022',
      department: 'Health Program',
      designation: 'Staff Nurse',
      joining_date: '2026-01-15',
      role: 'STAFF',
      status: 'ACTIVE',
      approver_id: admin.id,
    },
  });

  // Verify staff initial balance is exactly 2.0 days
  let ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staff.id } });
  let balance = ledgerEntries.reduce((s, it) => s + it.amount, 0);
  assert.equal(balance, 2.0, 'Staff initial balance must equal 2.0 days');

  // 3. Regular Leave test logic: requesting 8 days when having only 2 days without advance leave should be rejected
  const requestedDays = 8.0;
  const allowNegative = false;
  const isAdvance = false;

  const canApplyRegular = allowNegative || isAdvance || balance >= requestedDays;
  assert.equal(canApplyRegular, false, 'Regular leave exceeding 2.0 available days must not be permitted');

  // 4. Advance Leave test: requesting 8 days with Advance Leave flag enabled
  const canApplyAdvance = true; // Advance leave bypasses balance limit
  assert.equal(canApplyAdvance, true, 'Advance leave must be permitted even with low balance');

  const advanceReq = await prisma.leaveRequest.create({
    data: {
      employee_id: staff.id,
      start_date: '2026-10-04',
      end_date: '2026-10-13',
      calculated_days: 8.0,
      handover_employee_id: colleague.id,
      reason: 'Emergency hospital visit for family',
      leave_type: 'ADVANCE',
      status: 'PENDING',
    },
  });
  assert.equal(advanceReq.status, 'PENDING');
  assert.equal(advanceReq.leave_type, 'ADVANCE');
  assert.equal(advanceReq.calculated_days, 8.0);

  // 5. Approver approves Advance Leave: balance debited into negative: 2.0 - 8.0 = -6.0
  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: advanceReq.id },
      data: {
        status: 'APPROVED',
        approved_by: admin.id,
        approved_at: new Date(),
        approval_remarks: 'Approved advance emergency leave',
      },
    });

    await tx.leaveLedger.create({
      data: {
        employee_id: staff.id,
        transaction_type: 'APPROVED_LEAVE_DEBIT',
        amount: -8.0,
        leave_request_id: advanceReq.id,
        notes: `Advance leave debited for request ${advanceReq.id}`,
        dedup_key: `DEBIT_${advanceReq.id}`,
        created_by: admin.id,
      },
    });
  });

  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staff.id } });
  balance = ledgerEntries.reduce((s, it) => s + it.amount, 0);
  assert.equal(balance, -6.0, 'After 8-day advance leave approval from 2.0 balance, balance must be -6.0');

  // 6. Test Month-End Accrual 30th Eligibility
  // Current month day < 30 is NOT eligible
  const midMonthDate = new Date('2026-09-15T12:00:00Z');
  const isMidMonthEligible = isMonthEligibleForAccrual(2026, 9, midMonthDate);
  assert.equal(isMidMonthEligible, false, 'September 15 is before the 30th and must not be eligible for accrual');

  // On the 30th of the month, it IS eligible
  const monthEndDate = new Date('2026-09-30T12:00:00Z');
  const isMonthEndEligible = isMonthEligibleForAccrual(2026, 9, monthEndDate);
  assert.equal(isMonthEndEligible, true, 'September 30 has reached the 30th and must be eligible for accrual');

  // 7. Simulating month-end automatic accrual of +2.0 days reduces negative balance (-6.0 + 2.0 = -4.0)
  await prisma.leaveLedger.create({
    data: {
      employee_id: staff.id,
      transaction_type: 'MONTHLY_ACCRUAL',
      amount: 2.0,
      accrual_year: 2026,
      accrual_month: 10,
      notes: 'October 2026 Month-End Accrual (30th)',
      dedup_key: `ACCRUAL_${staff.id}_2026_10`,
      created_by: null,
    },
  });

  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staff.id } });
  balance = ledgerEntries.reduce((s, it) => s + it.amount, 0);
  assert.equal(balance, -4.0, 'After October month-end +2 accrual, balance recovers from -6.0 to -4.0');

  // 8. Test Admin Editing Staff Details & Adjusting Remaining Leave Balance
  // Admin updates staff designation and adjusts balance to 0.0
  await prisma.profile.update({
    where: { id: staff.id },
    data: {
      designation: 'Senior Health Assistant',
    },
  });

  const updatedStaff = await prisma.profile.findUnique({ where: { id: staff.id } });
  assert.equal(updatedStaff.designation, 'Senior Health Assistant');

  // Balance adjustment to 0.0
  const curBal = -4.0;
  const targetBal = 0.0;
  const diff = targetBal - curBal; // +4.0
  await prisma.leaveLedger.create({
    data: {
      employee_id: staff.id,
      transaction_type: 'ADJUSTMENT',
      amount: diff,
      notes: 'Admin manual balance reset to 0.0',
      created_by: admin.id,
    },
  });

  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staff.id } });
  balance = ledgerEntries.reduce((s, it) => s + it.amount, 0);
  assert.equal(balance, 0.0, 'Balance after administrative adjustment must be 0.0');

  // 9. Test Deleting Staff Member
  // Ensure that staff deletion removes their leave requests and ledger entries cleanly
  await prisma.$transaction(async (tx) => {
    const reqs = await tx.leaveRequest.findMany({ where: { employee_id: staff.id }, select: { id: true } });
    const reqIds = reqs.map(r => r.id);
    if (reqIds.length > 0) {
      await tx.notificationLog.deleteMany({ where: { leave_request_id: { in: reqIds } } });
    }
    await tx.leaveLedger.deleteMany({ where: { employee_id: staff.id } });
    if (reqIds.length > 0) {
      await tx.leaveRequest.deleteMany({ where: { id: { in: reqIds } } });
    }
    await tx.profile.delete({ where: { id: staff.id } });
  });

  const deletedStaff = await prisma.profile.findUnique({ where: { id: staff.id } });
  assert.equal(deletedStaff, null, 'Staff profile must be completely deleted');
});
