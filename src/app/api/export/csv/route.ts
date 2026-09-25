import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['APPROVER', 'ADMIN']);
    const type = request.nextUrl.searchParams.get('type') || 'balances';

    let csvContent = '';
    let filename = `jav_export_${type}_${Date.now()}.csv`;

    if (type === 'balances') {
      const employees = await prisma.profile.findMany({
        orderBy: { full_name: 'asc' },
      });

      const header = [
        'Staff ID',
        'Full Name',
        'Email',
        'Department',
        'Designation',
        'Joining Date',
        'Status',
        'Total Accrued (Days)',
        'Total Used (Days)',
        'Pending (Days)',
        'Remaining Balance (Days)',
      ];

      const rows: string[] = [header.join(',')];

      for (const emp of employees) {
        const bal = await getEmployeeBalance(emp.id);
        rows.push(
          [
            escapeCsv(emp.employee_id),
            escapeCsv(emp.full_name),
            escapeCsv(emp.email),
            escapeCsv(emp.department),
            escapeCsv(emp.designation),
            escapeCsv(emp.joining_date),
            escapeCsv(emp.status),
            bal.totalAccrued,
            bal.totalUsed,
            bal.pendingDays,
            bal.currentBalance,
          ].join(',')
        );
      }
      csvContent = rows.join('\n');
      filename = `jav_staff_leave_balances_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'requests') {
      const requests = await prisma.leaveRequest.findMany({
        include: {
          employee: true,
          handover_employee: true,
          approver: true,
        },
        orderBy: { requested_at: 'desc' },
      });

      const header = [
        'Request ID',
        'Staff ID',
        'Employee Name',
        'Department',
        'Start Date',
        'End Date',
        'Working Days',
        'Handover To',
        'Status',
        'Requested At',
        'Approved/Rejected By',
      ];

      const rows: string[] = [header.join(',')];

      for (const r of requests) {
        rows.push(
          [
            escapeCsv(r.id),
            escapeCsv(r.employee.employee_id),
            escapeCsv(r.employee.full_name),
            escapeCsv(r.employee.department),
            escapeCsv(r.start_date),
            escapeCsv(r.end_date),
            r.calculated_days,
            escapeCsv(r.handover_employee.full_name),
            escapeCsv(r.status),
            escapeCsv(r.requested_at.toISOString()),
            escapeCsv(r.approver?.full_name || ''),
          ].join(',')
        );
      }
      csvContent = rows.join('\n');
      filename = `jav_leave_requests_report_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'ledger') {
      const entries = await prisma.leaveLedger.findMany({
        include: {
          employee: true,
          creator: true,
        },
        orderBy: { created_at: 'desc' },
      });

      const header = [
        'Transaction ID',
        'Date',
        'Staff ID',
        'Employee Name',
        'Transaction Type',
        'Credit/Debit Amount',
        'Year',
        'Month',
        'Description',
        'Created By',
      ];

      const rows: string[] = [header.join(',')];

      for (const e of entries) {
        rows.push(
          [
            escapeCsv(e.id),
            escapeCsv(e.created_at.toISOString()),
            escapeCsv(e.employee.employee_id),
            escapeCsv(e.employee.full_name),
            escapeCsv(e.transaction_type),
            e.amount,
            e.accrual_year || '',
            e.accrual_month || '',
            escapeCsv(e.notes),
            escapeCsv(e.creator?.full_name || 'System'),
          ].join(',')
        );
      }
      csvContent = rows.join('\n');
      filename = `jav_leave_ledger_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
