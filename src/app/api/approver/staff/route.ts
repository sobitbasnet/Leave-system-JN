import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';

export async function GET(request: NextRequest) {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('q');
    const lowBalanceOnly = searchParams.get('lowBalance') === 'true';

    const where: any = {};
    if (department && department !== 'ALL') {
      where.department = department;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { full_name: { contains: search } },
        { employee_id: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const employees = await prisma.profile.findMany({
      where,
      orderBy: { full_name: 'asc' },
    });

    // Compute live balance from ledger for each employee
    const enrichedEmployees = await Promise.all(
      employees.map(async (emp) => {
        const balance = await getEmployeeBalance(emp.id);
        return {
          id: emp.id,
          employee_id: emp.employee_id,
          full_name: emp.full_name,
          email: emp.email,
          phone: emp.phone,
          whatsapp_number: emp.whatsapp_number,
          department: emp.department,
          designation: emp.designation,
          joining_date: emp.joining_date,
          role: emp.role,
          status: emp.status,
          approver_id: emp.approver_id,
          balance,
        };
      })
    );

    let filtered = enrichedEmployees;
    if (lowBalanceOnly) {
      filtered = filtered.filter((e) => e.balance.currentBalance <= 2.0);
    }

    // Get unique departments for filter dropdown
    const allDepartments = Array.from(new Set(employees.map((e) => e.department))).sort();

    return NextResponse.json({
      employees: filtered,
      departments: allDepartments,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch staff list.' }, { status: 500 });
  }
}
