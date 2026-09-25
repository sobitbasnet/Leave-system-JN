import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';
import { isSameDepartment } from '@/lib/departments';

export async function GET() {
  try {
    const user = await requireAuth();

    // 1. Fetch employee's own requests
    const requests = await prisma.leaveRequest.findMany({
      where: { employee_id: user.id },
      include: {
        handover_employee: {
          select: { id: true, full_name: true, department: true, designation: true },
        },
        approver: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    // 2. Fetch employee's leave ledger transactions
    const ledger = await prisma.leaveLedger.findMany({
      where: { employee_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    // 3. Active colleagues for handover strictly within the user's department (excluding self)
    const allActive = await prisma.profile.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: user.id },
      },
      select: {
        id: true,
        full_name: true,
        department: true,
        designation: true,
        employee_id: true,
      },
      orderBy: { full_name: 'asc' },
    });

    const activeColleagues = allActive.filter((c) => isSameDepartment(c.department, user.department));

    // 4. Balance summary
    const balance = await getEmployeeBalance(user.id);

    return NextResponse.json({
      requests,
      ledger,
      activeColleagues,
      balance,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to retrieve leave records' }, { status: 500 });
  }
}
