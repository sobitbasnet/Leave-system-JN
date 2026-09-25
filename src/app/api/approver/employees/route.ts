import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getEmployeeBalance } from '@/lib/balance';

export async function GET() {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const employees = await prisma.profile.findMany({
      include: {
        approver: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    // Attach live leave balance for each employee
    const employeesWithBalance = await Promise.all(
      employees.map(async (emp) => {
        try {
          const balance = await getEmployeeBalance(emp.id);
          return { ...emp, balance };
        } catch {
          return {
            ...emp,
            balance: {
              currentBalance: 0,
              totalAccrued: 0,
              totalUsed: 0,
              pendingDays: 0,
              availableForNewRequests: 0,
            },
          };
        }
      })
    );

    return NextResponse.json({ employees: employeesWithBalance });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const body = await request.json();

    const {
      employeeId,
      fullName,
      email,
      phone,
      whatsappNumber,
      department,
      designation,
      joiningDate,
      role = 'STAFF',
      approverId,
      openingBalance = 0,
      monthlyPaidLeave = 2.0,
      password,
    } = body;

    if (!employeeId || !fullName || !email || !whatsappNumber || !department || !designation || !joiningDate || !password) {
      return NextResponse.json(
        { error: 'All mandatory fields including temporary password must be provided.' },
        { status: 400 }
      );
    }

    // Check unique email and employee_id
    const existing = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { employee_id: employeeId.toUpperCase().trim() },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An employee with this Email or Staff ID already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newProfile = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          employee_id: employeeId.toUpperCase().trim(),
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          full_name: fullName.trim(),
          phone: phone?.trim() || null,
          whatsapp_number: whatsappNumber.replace(/[^\d]/g, ''),
          department: department.trim(),
          designation: designation.trim(),
          joining_date: joiningDate,
          role,
          status: 'ACTIVE',
          approver_id: approverId || null,
          monthly_paid_leave: Number(monthlyPaidLeave) > 0 ? Number(monthlyPaidLeave) : 2.0,
          requires_password_change: true,
        },
      });

      // Record initial remaining leave balance in ledger if non-zero
      const opening = Number(openingBalance);
      if (!isNaN(opening) && opening !== 0) {
        await tx.leaveLedger.create({
          data: {
            employee_id: profile.id,
            transaction_type: 'OPENING_BALANCE',
            amount: opening,
            notes: `Initial remaining leave balance set on creation (${joiningDate})`,
            dedup_key: `OPENING_${profile.id}`,
            created_by: admin.id,
          },
        });
      }

      return profile;
    });

    await createAuditLog({
      userId: admin.id,
      action: 'EMPLOYEE_CREATED',
      entityType: 'profiles',
      entityId: newProfile.id,
      newValue: {
        employeeId: newProfile.employee_id,
        email: newProfile.email,
        fullName: newProfile.full_name,
        role: newProfile.role,
        openingBalance,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee account created successfully.',
      employee: newProfile,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to create employee.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const body = await request.json();
    const {
      id,
      fullName,
      employeeId,
      email,
      phone,
      whatsappNumber,
      department,
      designation,
      joiningDate,
      role,
      status,
      approverId,
      password,
      targetBalance,
      monthlyPaidLeave,
      adjustmentNotes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const prev = await prisma.profile.findUnique({ where: { id } });
    if (!prev) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    // Check unique constraints if changing email or employee_id
    if (email && email.toLowerCase().trim() !== prev.email) {
      const emailTaken = await prisma.profile.findFirst({
        where: { email: email.toLowerCase().trim(), id: { not: id } },
      });
      if (emailTaken) {
        return NextResponse.json({ error: 'Email is already used by another employee.' }, { status: 400 });
      }
    }

    if (employeeId && employeeId.toUpperCase().trim() !== prev.employee_id) {
      const idTaken = await prisma.profile.findFirst({
        where: { employee_id: employeeId.toUpperCase().trim(), id: { not: id } },
      });
      if (idTaken) {
        return NextResponse.json({ error: 'Staff ID is already in use.' }, { status: 400 });
      }
    }

    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length > 0) {
      passwordHash = await hashPassword(password.trim());
    }

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { id },
        data: {
          full_name: fullName !== undefined ? fullName.trim() : prev.full_name,
          employee_id: employeeId !== undefined ? employeeId.toUpperCase().trim() : prev.employee_id,
          email: email !== undefined ? email.toLowerCase().trim() : prev.email,
          phone: phone !== undefined ? phone?.trim() || null : prev.phone,
          whatsapp_number: whatsappNumber !== undefined ? whatsappNumber.replace(/[^\d]/g, '') : prev.whatsapp_number,
          department: department !== undefined ? department.trim() : prev.department,
          designation: designation !== undefined ? designation.trim() : prev.designation,
          joining_date: joiningDate !== undefined ? joiningDate : prev.joining_date,
          role: role !== undefined ? role : prev.role,
          status: status !== undefined ? status : prev.status,
          approver_id: approverId !== undefined ? (approverId || null) : prev.approver_id,
          ...(monthlyPaidLeave !== undefined && monthlyPaidLeave !== ''
            ? { monthly_paid_leave: Number(monthlyPaidLeave) }
            : {}),
          ...(passwordHash ? { password_hash: passwordHash, requires_password_change: true } : {}),
        },
      });

      // Handle remaining leave balance adjustment if specified
      if (targetBalance !== undefined && targetBalance !== null && targetBalance !== '') {
        const target = Number(targetBalance);
        if (!isNaN(target)) {
          const ledgerAgg = await tx.leaveLedger.findMany({
            where: { employee_id: id },
            select: { amount: true },
          });
          const curBal = ledgerAgg.reduce((s, it) => s + it.amount, 0);
          const diff = Math.round((target - curBal) * 100) / 100;

          const hasOpening = await tx.leaveLedger.findFirst({
            where: { employee_id: id, transaction_type: 'OPENING_BALANCE' },
          });

          if (!hasOpening) {
            await tx.leaveLedger.create({
              data: {
                employee_id: id,
                transaction_type: 'OPENING_BALANCE',
                amount: target,
                notes: adjustmentNotes?.trim() || `Opening leave balance set by admin: ${target} days`,
                dedup_key: `OPENING_${id}`,
                created_by: admin.id,
              },
            });
          } else if (diff !== 0) {
            await tx.leaveLedger.create({
              data: {
                employee_id: id,
                transaction_type: 'ADJUSTMENT',
                amount: diff,
                notes: adjustmentNotes?.trim() || `Admin adjusted leave balance from ${curBal} to ${target} days`,
                created_by: admin.id,
              },
            });
          }
        }
      }

      return profile;
    });

    await createAuditLog({
      userId: admin.id,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'profiles',
      entityId: id,
      oldValue: {
        fullName: prev.full_name,
        employeeId: prev.employee_id,
        email: prev.email,
        status: prev.status,
        department: prev.department,
      },
      newValue: {
        fullName: updated.full_name,
        employeeId: updated.employee_id,
        email: updated.email,
        status: updated.status,
        department: updated.department,
        targetBalance,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee details updated successfully.',
      employee: updated,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update employee.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot delete your own administrative account.' }, { status: 400 });
    }

    const employee = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, full_name: true, employee_id: true, email: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unassign approver from any subordinates
      await tx.profile.updateMany({
        where: { approver_id: id },
        data: { approver_id: null },
      });

      // 2. Unassign from approved/rejected leave requests
      await tx.leaveRequest.updateMany({
        where: { approved_by: id },
        data: { approved_by: null },
      });
      await tx.leaveRequest.updateMany({
        where: { rejected_by: id },
        data: { rejected_by: null },
      });

      // 3. For handover colleagues on other requests, reassign handover to admin
      await tx.leaveRequest.updateMany({
        where: { handover_employee_id: id },
        data: { handover_employee_id: admin.id },
      });

      // 4. Find all leave requests created by this employee
      const employeeRequests = await tx.leaveRequest.findMany({
        where: { employee_id: id },
        select: { id: true },
      });
      const requestIds = employeeRequests.map((r) => r.id);

      // 5. Delete notification logs for these requests
      if (requestIds.length > 0) {
        await tx.notificationLog.deleteMany({
          where: { leave_request_id: { in: requestIds } },
        });
      }

      // 6. Delete all ledger entries associated with this employee or requests
      await tx.leaveLedger.deleteMany({
        where: {
          OR: [
            { employee_id: id },
            ...(requestIds.length > 0 ? [{ leave_request_id: { in: requestIds } }] : []),
          ],
        },
      });

      // 7. Unlink creator on any other ledger entries
      await tx.leaveLedger.updateMany({
        where: { created_by: id },
        data: { created_by: null },
      });

      // 8. Delete this employee's leave requests
      if (requestIds.length > 0) {
        await tx.leaveRequest.deleteMany({
          where: { id: { in: requestIds } },
        });
      }

      // 9. Unlink user from audit logs
      await tx.auditLog.updateMany({
        where: { user_id: id },
        data: { user_id: null },
      });

      // 10. Delete the profile itself
      await tx.profile.delete({
        where: { id },
      });
    });

    await createAuditLog({
      userId: admin.id,
      action: 'EMPLOYEE_DELETED',
      entityType: 'profiles',
      entityId: id,
      oldValue: {
        id: employee.id,
        fullName: employee.full_name,
        employeeId: employee.employee_id,
        email: employee.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff account for ${employee.full_name} (${employee.employee_id}) has been permanently deleted.`,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Failed to delete employee.' }, { status: 500 });
  }
}
