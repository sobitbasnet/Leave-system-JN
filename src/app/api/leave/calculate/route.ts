import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateWorkingDays } from '@/lib/leave-calculator';
import { getEmployeeBalance } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required.' },
        { status: 400 }
      );
    }

    const holidays = await prisma.holiday.findMany({
      where: { active: true },
      select: { holiday_date: true, holiday_name: true, active: true },
    });

    const settings = await prisma.organizationSettings.findUnique({
      where: { id: 'default' },
    });

    const weeklyHoliday = settings?.weekly_holiday_day_of_week ?? null;
    const calc = calculateWorkingDays(startDate, endDate, holidays, weeklyHoliday);
    const balance = await getEmployeeBalance(user.id);

    const projectedBalance = calc.isEligible
      ? Math.round((balance.currentBalance - calc.calculatedDays) * 100) / 100
      : balance.currentBalance;

    const hasSufficientBalance =
      settings?.negative_balance_allowed ||
      balance.availableForNewRequests >= calc.calculatedDays;

    return NextResponse.json({
      calculation: calc,
      balance,
      projectedBalance,
      hasSufficientBalance,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to calculate leave days' },
      { status: 500 }
    );
  }
}
