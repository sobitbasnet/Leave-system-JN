import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';

export async function GET(request: NextRequest) {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');
    const query = searchParams.get('q');
    const month = searchParams.get('month'); // 1 - 12
    const year = searchParams.get('year');

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (employeeId && employeeId !== 'ALL') {
      where.employee_id = employeeId;
    }

    if (department && department !== 'ALL') {
      where.employee = {
        department: department,
      };
    }

    if (query) {
      where.OR = [
        { employee: { full_name: { contains: query } } },
        { employee: { employee_id: { contains: query } } },
        { reason: { contains: query } },
      ];
    }

    if (year && month) {
      const startIso = `${year}-${String(month).padStart(2, '0')}-01`;
      const endIso = `${year}-${String(month).padStart(2, '0')}-31`;
      where.start_date = { gte: startIso, lte: endIso };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employee_id: true,
            full_name: true,
            department: true,
            designation: true,
            whatsapp_number: true,
          },
        },
        handover_employee: {
          select: {
            id: true,
            full_name: true,
            department: true,
            designation: true,
          },
        },
        approver: {
          select: { id: true, full_name: true },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    // Augment with current employee balance
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const bal = await getEmployeeBalance(req.employee_id);
        return {
          ...req,
          employeeBalance: bal,
        };
      })
    );

    return NextResponse.json({ requests: enriched });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch leave requests.' }, { status: 500 });
  }
}
