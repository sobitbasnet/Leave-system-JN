import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { adjustLeaveBalance } from '@/lib/leave-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approver = await requireRole(['APPROVER', 'ADMIN']);
    const employeeId = params.id;
    const body = await request.json();

    const { transactionType, amount, notes } = body;

    if (!transactionType || amount === undefined || !notes) {
      return NextResponse.json(
        { error: 'Transaction type, amount, and mandatory reason notes are required.' },
        { status: 400 }
      );
    }

    const result = await adjustLeaveBalance(
      employeeId,
      approver.id,
      transactionType,
      Number(amount),
      notes,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Leave balance adjusted successfully.',
      result,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to adjust leave balance.' },
      { status: 400 }
    );
  }
}
