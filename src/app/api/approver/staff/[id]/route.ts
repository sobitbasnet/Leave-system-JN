import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(['APPROVER', 'ADMIN']);
    const employeeId = params.id;

    const profile = await prisma.profile.findUnique({
      where: { id: employeeId },
      include: {
        approver: {
          select: { id: true, full_name: true, email: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const balance = await getEmployeeBalance(employeeId);

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employee_id: employeeId },
      include: {
        handover_employee: {
          select: { id: true, full_name: true, department: true },
        },
        approver: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    const ledger = await prisma.leaveLedger.findMany({
      where: { employee_id: employeeId },
      include: {
        creator: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entity_id: employeeId },
          { user_id: employeeId },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      profile,
      balance,
      leaveRequests,
      ledger,
      auditLogs,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch employee details.' }, { status: 500 });
  }
}
