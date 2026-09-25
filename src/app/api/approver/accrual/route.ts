import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { runMonthlyAccrual } from '@/lib/accrual';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const body = await request.json().catch(() => ({}));
    const { year, month } = body;

    const result = await runMonthlyAccrual(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      admin.id
    );

    return NextResponse.json({
      success: true,
      message: `Accrual processing finished for ${result.month}/${result.year}. Credited: ${result.creditedCount}, Already credited: ${result.alreadyCreditedCount}.`,
      result,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to execute monthly accrual.' },
      { status: 500 }
    );
  }
}
