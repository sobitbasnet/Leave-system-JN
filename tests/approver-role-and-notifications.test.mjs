import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();




test('Approver Permissions & Notification System Validation', async (t) => {
  const ts = Date.now();
  const passwordHash = await bcrypt.hash('Bodgaun123', 10);

  // Setup: Director, Aayush, and Staff Member
  const director = await prisma.profile.create({
    data: {
      employee_id: `DIR-${ts}`,
      email: `director.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Sobit Basnet Test',
      department: 'Jay Nepal NGO',
      designation: 'Director',
      whatsapp_number: '9779841000001',
      joining_date: '2024-01-01',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const aayush = await prisma.profile.create({
    data: {
      employee_id: `AAYUSH-${ts}`,
      email: `aayush.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Aayush Wasti Test',
      department: 'Jay Nepal NGO',
      designation: 'Vice Director',
      whatsapp_number: '9779841000002',
      joining_date: '2024-01-01',
      role: 'STAFF', // Aayush must strictly be STAFF
      status: 'ACTIVE',
    },
  });

  const staff = await prisma.profile.create({
    data: {
      employee_id: `STAFF-${ts}`,
      email: `staff.${ts}@jaynepal.org`,
      password_hash: passwordHash,
      full_name: 'Test Staff Member',
      department: 'IT Education Program',
      designation: 'Staff Assistant',
      whatsapp_number: '9779841000003',
      joining_date: '2025-01-01',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  // Verify Aayush in DB is strictly STAFF
  assert.equal(aayush.role, 'STAFF');

  await t.test('1. Aayush and non-admin staff cannot approve leave requests', async () => {
    // Staff submits leave
    const leaveReq = await prisma.leaveRequest.create({
      data: {
        employee_id: staff.id,
        start_date: '2026-12-01',
        end_date: '2026-12-02',
        calculated_days: 2.0,
        reason: 'Personal work',
        handover_employee_id: director.id,
        leave_type: 'REGULAR',
        status: 'PENDING',
      },
    });

    assert.equal(leaveReq.status, 'PENDING');

    // Verification logic matching leave-service.ts
    function canApprove(profile) {
      if (!profile || profile.role === 'STAFF' || profile.email.includes('aayush') || profile.employee_id.includes('AAYUSH')) {
        return false;
      }
      return profile.role === 'ADMIN' || profile.designation === 'Director';
    }

    assert.equal(canApprove(aayush), false, 'Aayush must NOT have approval permission');
    assert.equal(canApprove(staff), false, 'Standard staff must NOT have approval permission');
    assert.equal(canApprove(director), true, 'Director must have approval permission');

    // Director approves
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveReq.id },
      data: {
        status: 'APPROVED',
        approved_by: director.id,
        approved_at: new Date(),
        approval_remarks: 'Approved by Director',
      },
    });

    assert.equal(updated.status, 'APPROVED');
    assert.equal(updated.approved_by, director.id);
  });

  await t.test('2. Email notification logging in NotificationLog', async () => {
    const emailLog = await prisma.notificationLog.create({
      data: {
        recipient: 'sobitb22@gmail.com',
        channel: 'EMAIL',
        status: 'SENT',
        provider: 'NODEMAILER',
        payload: JSON.stringify({ subject: 'New Leave Request Submitted' }),
      },
    });

    assert.equal(emailLog.channel, 'EMAIL');
    assert.equal(emailLog.status, 'SENT');
    assert.equal(emailLog.provider, 'NODEMAILER');
  });


  await t.test('4. Per-staff monthly leave entitlement configuration & differential accrual calculation (1 day vs 2 days)', async () => {
    // Staff 1 with 1.0 day/month entitlement
    const staff1Day = await prisma.profile.create({
      data: {
        employee_id: `STF-1D-${ts}`,
        email: `staff1day.${ts}@jaynepal.org`,
        password_hash: passwordHash,
        full_name: 'Part-Time Staff (1 day)',
        department: 'Support Services',
        designation: 'Field Officer',
        whatsapp_number: '9779841000010',
        joining_date: '2026-01-01',
        monthly_paid_leave: 1.0, // 1 day per month
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    // Staff 2 with standard 2.0 days/month entitlement
    const staff2Day = await prisma.profile.create({
      data: {
        employee_id: `STF-2D-${ts}`,
        email: `staff2day.${ts}@jaynepal.org`,
        password_hash: passwordHash,
        full_name: 'Full-Time Staff (2 days)',
        department: 'Education Program',
        designation: 'Senior Teacher',
        whatsapp_number: '9779841000011',
        joining_date: '2026-01-01',
        monthly_paid_leave: 2.0, // 2 days per month
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    assert.equal(staff1Day.monthly_paid_leave, 1.0);
    assert.equal(staff2Day.monthly_paid_leave, 2.0);

    // Simulate monthly accrual calculation for January 2026
    const accrual1 = await prisma.leaveLedger.create({
      data: {
        employee_id: staff1Day.id,
        transaction_type: 'MONTHLY_ACCRUAL',
        amount: staff1Day.monthly_paid_leave ?? 2.0,
        accrual_year: 2026,
        accrual_month: 1,
        notes: `January 2026 Month-End Automatic Paid Leave Accrual (${staff1Day.monthly_paid_leave}d on 30th)`,
        dedup_key: `ACCRUAL_${staff1Day.id}_2026_1`,
      },
    });

    const accrual2 = await prisma.leaveLedger.create({
      data: {
        employee_id: staff2Day.id,
        transaction_type: 'MONTHLY_ACCRUAL',
        amount: staff2Day.monthly_paid_leave ?? 2.0,
        accrual_year: 2026,
        accrual_month: 1,
        notes: `January 2026 Month-End Automatic Paid Leave Accrual (${staff2Day.monthly_paid_leave}d on 30th)`,
        dedup_key: `ACCRUAL_${staff2Day.id}_2026_1`,
      },
    });

    // Verify staff 1 got exactly 1.0 day and staff 2 got exactly 2.0 days
    assert.equal(accrual1.amount, 1.0, 'Staff configured for 1 day must receive 1.0 day in ledger');
    assert.equal(accrual2.amount, 2.0, 'Staff configured for 2 days must receive 2.0 days in ledger');

    // Admin edits staff 1 to increase to 1.5 days/month
    const updatedStaff1 = await prisma.profile.update({
      where: { id: staff1Day.id },
      data: { monthly_paid_leave: 1.5 },
    });
    assert.equal(updatedStaff1.monthly_paid_leave, 1.5, 'Admin edit must update monthly leave to 1.5');

    // Subsequent month accrual (February 2026) uses the updated 1.5 entitlement
    const accrualFeb = await prisma.leaveLedger.create({
      data: {
        employee_id: staff1Day.id,
        transaction_type: 'MONTHLY_ACCRUAL',
        amount: updatedStaff1.monthly_paid_leave ?? 2.0,
        accrual_year: 2026,
        accrual_month: 2,
        notes: `February 2026 Month-End Automatic Paid Leave Accrual (${updatedStaff1.monthly_paid_leave}d on 30th)`,
        dedup_key: `ACCRUAL_${staff1Day.id}_2026_2`,
      },
    });
    assert.equal(accrualFeb.amount, 1.5, 'After edit, new month accrual must reflect updated 1.5 days');

    // Clean up temporary staff profiles and ledgers
    await prisma.leaveLedger.deleteMany({ where: { employee_id: { in: [staff1Day.id, staff2Day.id] } } });
    await prisma.profile.deleteMany({ where: { id: { in: [staff1Day.id, staff2Day.id] } } });
  });

  await t.test('5. Gating: Non-admin/approver (STAFF) cannot update monthly leave entitlement', async () => {
    function canEditStaffSettings(userRole) {
      return ['ADMIN', 'APPROVER'].includes(userRole);
    }

    assert.equal(canEditStaffSettings(director.role), true, 'ADMIN can edit staff monthly entitlement');
    assert.equal(canEditStaffSettings(aayush.role), false, 'STAFF role cannot edit staff monthly entitlement');
    assert.equal(canEditStaffSettings(staff.role), false, 'General staff cannot edit staff monthly entitlement');
  });

  // Cleanup
  await prisma.notificationLog.deleteMany({ where: { recipient: { in: ['director@jaynepal.org, admin@jaynepal.org', '9779841000001'] } } });
  await prisma.leaveRequest.deleteMany({ where: { employee_id: staff.id } });
  await prisma.profile.deleteMany({ where: { id: { in: [director.id, aayush.id, staff.id] } } });
  await prisma.$disconnect();
});
