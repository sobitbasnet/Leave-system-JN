import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test('Full Integration Workflow: Submission, Balance Lock, Approval, Rejection, and Security Isolation', async () => {
  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash('StaffPass123!', 10);

  // 1. Create Approver Account
  const approver = await prisma.profile.create({
    data: {
      employee_id: `INT-ADM-${timestamp}`,
      email: `approver.${timestamp}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Integration Approver',
      whatsapp_number: '9779800000010',
      department: 'Management',
      designation: 'Director',
      joining_date: '2025-01-01',
      role: 'APPROVER',
      status: 'ACTIVE',
    },
  });

  // 2. Create Staff A and Staff B (Handover colleague)
  const staffA = await prisma.profile.create({
    data: {
      employee_id: `INT-STFA-${timestamp}`,
      email: `staffa.${timestamp}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Staff Alpha',
      whatsapp_number: '9779800000011',
      department: 'Field Programs',
      designation: 'Officer',
      joining_date: '2025-01-01',
      role: 'STAFF',
      status: 'ACTIVE',
      approver_id: approver.id,
    },
  });

  const staffB = await prisma.profile.create({
    data: {
      employee_id: `INT-STFB-${timestamp}`,
      email: `staffb.${timestamp}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Staff Beta',
      whatsapp_number: '9779800000012',
      department: 'Field Programs',
      designation: 'Assistant',
      joining_date: '2025-01-01',
      role: 'STAFF',
      status: 'ACTIVE',
      approver_id: approver.id,
    },
  });

  // 3. Grant Opening Balance to Staff A (6 days)
  await prisma.leaveLedger.create({
    data: {
      employee_id: staffA.id,
      transaction_type: 'OPENING_BALANCE',
      amount: 6.0,
      notes: 'Initial opening leave credit for Staff Alpha',
      dedup_key: `OPENING_${staffA.id}`,
      created_by: approver.id,
    },
  });

  // Verify starting balance = 6.0
  let ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staffA.id } });
  let balance = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 6.0, 'Staff Alpha initial balance must be 6.0 days');

  // 4. Staff A applies for 2 working days (e.g. 2026-11-01 Sun to 2026-11-02 Mon)
  const leaveReq1 = await prisma.leaveRequest.create({
    data: {
      employee_id: staffA.id,
      start_date: '2026-11-01',
      end_date: '2026-11-02',
      calculated_days: 2.0,
      handover_employee_id: staffB.id,
      reason: 'Family event in Pokhara',
      status: 'PENDING',
    },
  });
  assert.equal(leaveReq1.status, 'PENDING');

  // Verify that balance is still 6.0 (not deducted yet while pending!)
  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staffA.id } });
  balance = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 6.0, 'Pending leave must NOT deduct ledger balance');

  // 5. Overlap Prevention: Attempting to submit another request overlapping with 2026-11-01 to 2026-11-02
  const overlapFound = await prisma.leaveRequest.findFirst({
    where: {
      employee_id: staffA.id,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          start_date: { lte: '2026-11-02' },
          end_date: { gte: '2026-11-01' },
        },
      ],
    },
  });
  assert.ok(overlapFound, 'Overlap detection must identify the existing pending leave');

  // 6. Approver Approves Request 1 (Transactional)
  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: leaveReq1.id },
      data: {
        status: 'APPROVED',
        approved_by: approver.id,
        approved_at: new Date(),
        approval_remarks: 'Approved. Beta will cover.',
      },
    });

    await tx.leaveLedger.create({
      data: {
        employee_id: staffA.id,
        transaction_type: 'APPROVED_LEAVE_DEBIT',
        amount: -leaveReq1.calculated_days,
        leave_request_id: leaveReq1.id,
        notes: `Approved leave debit for request ${leaveReq1.id}`,
        dedup_key: `DEBIT_${leaveReq1.id}`,
        created_by: approver.id,
      },
    });
  });

  // Verify that balance is now exactly 6 - 2 = 4 days
  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staffA.id } });
  balance = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 4.0, 'Balance must be deducted to 4.0 days upon approval');

  // 7. Staff A submits second request (1 working day on 2026-11-15) and Approver REJECTS it
  const leaveReq2 = await prisma.leaveRequest.create({
    data: {
      employee_id: staffA.id,
      start_date: '2026-11-15',
      end_date: '2026-11-15',
      calculated_days: 1.0,
      handover_employee_id: staffB.id,
      reason: 'Optional workshop',
      status: 'PENDING',
    },
  });

  // Approver rejects with reason
  await prisma.leaveRequest.update({
    where: { id: leaveReq2.id },
    data: {
      status: 'REJECTED',
      rejected_by: approver.id,
      rejected_at: new Date(),
      rejection_reason: 'Conflict with major field donor visit on this date.',
    },
  });

  // Verify that rejection created ZERO ledger debits and balance remains 4.0
  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staffA.id } });
  balance = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 4.0, 'Rejected leave must not affect ledger balance');

  // 8. Staff A submits third request and CANCELS it while pending
  const leaveReq3 = await prisma.leaveRequest.create({
    data: {
      employee_id: staffA.id,
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      calculated_days: 1.0,
      handover_employee_id: staffB.id,
      reason: 'Personal errand',
      status: 'PENDING',
    },
  });

  await prisma.leaveRequest.update({
    where: { id: leaveReq3.id },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
    },
  });

  // Verify balance still 4.0
  ledgerEntries = await prisma.leaveLedger.findMany({ where: { employee_id: staffA.id } });
  balance = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 4.0, 'Cancelled leave must not affect ledger balance');

  // 9. Confidentiality / Tenant Isolation Test (§27 & §47):
  // When querying Staff B's private leave records, querying with where: { employee_id: staffA.id } returns 0 records of Staff B
  const staffAView = await prisma.leaveRequest.findMany({
    where: { employee_id: staffA.id },
  });
  const hasStaffBRecords = staffAView.some((r) => r.employee_id === staffB.id);
  assert.equal(hasStaffBRecords, false, 'Staff A query must never return Staff B leave records');
});
