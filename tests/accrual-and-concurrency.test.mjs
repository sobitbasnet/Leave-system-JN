import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test('Section 38: Monthly Accrual Calculation and Idempotency Test', async () => {
  // Create a clean isolated test employee
  const testEmail = `test.accrual.${Date.now()}@jaynepal.org`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  const emp = await prisma.profile.create({
    data: {
      employee_id: `TEST-ACC-${Date.now()}`,
      email: testEmail,
      password_hash: passwordHash,
      full_name: 'Test Accrual Employee',
      whatsapp_number: '9779800000001',
      department: 'Testing Dept',
      designation: 'Tester',
      joining_date: '2026-01-01',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  // Verify initial balance is 0
  const initialLedger = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  const initialBalance = initialLedger.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(initialBalance, 0, 'Initial balance must be 0');

  // 1. January Accrual (+2)
  await prisma.leaveLedger.create({
    data: {
      employee_id: emp.id,
      transaction_type: 'MONTHLY_ACCRUAL',
      amount: 2.0,
      accrual_year: 2026,
      accrual_month: 1,
      notes: 'January 2026 Accrual',
      dedup_key: `ACCRUAL_${emp.id}_2026_1`,
    },
  });
  let entries = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  let balance = entries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 2, 'January accrual must yield 2 days');

  // 2. February Accrual (+2) -> Total 4
  await prisma.leaveLedger.create({
    data: {
      employee_id: emp.id,
      transaction_type: 'MONTHLY_ACCRUAL',
      amount: 2.0,
      accrual_year: 2026,
      accrual_month: 2,
      notes: 'February 2026 Accrual',
      dedup_key: `ACCRUAL_${emp.id}_2026_2`,
    },
  });
  entries = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  balance = entries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 4, 'February accrual must yield 4 days total');

  // 3. Employee uses 1 day (-1) -> Total 3
  await prisma.leaveLedger.create({
    data: {
      employee_id: emp.id,
      transaction_type: 'APPROVED_LEAVE_DEBIT',
      amount: -1.0,
      notes: 'Used 1 approved leave day',
      dedup_key: `DEBIT_TEST_${Date.now()}`,
    },
  });
  entries = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  balance = entries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 3, 'After using 1 day, balance must be 3 days');

  // 4. March Accrual (+2) -> Total 5
  await prisma.leaveLedger.create({
    data: {
      employee_id: emp.id,
      transaction_type: 'MONTHLY_ACCRUAL',
      amount: 2.0,
      accrual_year: 2026,
      accrual_month: 3,
      notes: 'March 2026 Accrual',
      dedup_key: `ACCRUAL_${emp.id}_2026_3`,
    },
  });
  entries = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  balance = entries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 5, 'March accrual must yield 5 days total');

  // 5. Idempotency Test: Attempting to credit March a second time must FAIL or be rejected by DB constraint
  let secondMarchFailed = false;
  try {
    await prisma.leaveLedger.create({
      data: {
        employee_id: emp.id,
        transaction_type: 'MONTHLY_ACCRUAL',
        amount: 2.0,
        accrual_year: 2026,
        accrual_month: 3,
        notes: 'March 2026 Accrual Second Attempt',
        dedup_key: `ACCRUAL_${emp.id}_2026_3`, // identical dedup key
      },
    });
  } catch (err) {
    secondMarchFailed = true;
  }

  assert.equal(secondMarchFailed, true, 'Second March accrual must trigger unique constraint violation');

  // Re-verify balance remains 5, NOT 7!
  entries = await prisma.leaveLedger.findMany({ where: { employee_id: emp.id } });
  balance = entries.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(balance, 5, 'Balance must remain 5, not 7!');

  // 6. Test employee joining later (e.g. joined 2026-06-01)
  const lateEmp = await prisma.profile.create({
    data: {
      employee_id: `TEST-LATE-${Date.now()}`,
      email: `late.${Date.now()}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Late Joining Employee',
      whatsapp_number: '9779800000002',
      department: 'Testing Dept',
      designation: 'Late Joiner',
      joining_date: '2026-06-01',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  const accrualMonthEnd = '2026-03-31';
  const isEligibleForMarch = lateEmp.joining_date <= accrualMonthEnd;
  assert.equal(isEligibleForMarch, false, 'Employee joining in June is not eligible for March accrual');
});

test('Section 37: Concurrency Test - Two Simultaneous Approvals for the Same Request', async () => {
  const approver = await prisma.profile.findFirst({ where: { role: 'ADMIN' } });
  const staff = await prisma.profile.findFirst({ where: { role: 'STAFF' } });
  assert.ok(approver, 'Approver exists');
  assert.ok(staff, 'Staff exists');

  // Ensure staff has ample balance
  await prisma.leaveLedger.create({
    data: {
      employee_id: staff.id,
      transaction_type: 'MANUAL_CREDIT',
      amount: 10.0,
      notes: 'Concurrency test credit',
      created_by: approver.id,
    },
  });

  // Create a pending leave request
  const testRequest = await prisma.leaveRequest.create({
    data: {
      employee_id: staff.id,
      start_date: '2026-12-01',
      end_date: '2026-12-02',
      calculated_days: 2.0,
      handover_employee_id: approver.id,
      reason: 'Concurrency stress testing',
      status: 'PENDING',
    },
  });

  // Define atomic approval function simulating concurrent requests
  async function attemptApproval(approverUserId) {
    return prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.findUnique({
        where: { id: testRequest.id },
      });
      if (!req || req.status !== 'PENDING') {
        throw new Error('Request already processed or not pending');
      }

      await tx.leaveRequest.update({
        where: { id: req.id },
        data: {
          status: 'APPROVED',
          approved_by: approverUserId,
          approved_at: new Date(),
        },
      });

      const ledgerEntry = await tx.leaveLedger.create({
        data: {
          employee_id: req.employee_id,
          transaction_type: 'APPROVED_LEAVE_DEBIT',
          amount: -req.calculated_days,
          leave_request_id: req.id,
          notes: `Concurrency test approval`,
          dedup_key: `DEBIT_${req.id}`, // Unique constraint
          created_by: approverUserId,
        },
      });

      return ledgerEntry;
    });
  }

  // Fire two simultaneous approvals
  const results = await Promise.allSettled([
    attemptApproval(approver.id),
    attemptApproval(approver.id),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one approval must succeed');
  assert.equal(rejected.length, 1, 'Exactly one approval must fail due to lock or unique constraint');

  // Verify that in the database, exactly ONE debit exists for this leave request
  const debitEntries = await prisma.leaveLedger.findMany({
    where: { leave_request_id: testRequest.id },
  });

  assert.equal(debitEntries.length, 1, 'Exactly one ledger debit entry must exist in database');
  assert.equal(debitEntries[0].amount, -2.0, 'Debit amount must match the leave days');

  // Verify leave request final status
  const finalizedRequest = await prisma.leaveRequest.findUnique({
    where: { id: testRequest.id },
  });
  assert.equal(finalizedRequest.status, 'APPROVED');
});
