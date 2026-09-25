import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { holiday_date: 'asc' },
    });
    return NextResponse.json({ holidays });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const { holidayName, holidayDate, notes, active = true } = await request.json();

    if (!holidayName || !holidayDate) {
      return NextResponse.json(
        { error: 'Holiday name and date (YYYY-MM-DD) are required.' },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.upsert({
      where: { holiday_date: holidayDate },
      update: { holiday_name: holidayName, notes, active },
      create: { holiday_name: holidayName, holiday_date: holidayDate, notes, active },
    });

    await createAuditLog({
      userId: admin.id,
      action: 'HOLIDAY_SAVED',
      entityType: 'holidays',
      entityId: holiday.id,
      newValue: { holidayName, holidayDate, active },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to save holiday.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID required.' }, { status: 400 });
    }

    const deleted = await prisma.holiday.delete({ where: { id } });

    await createAuditLog({
      userId: admin.id,
      action: 'HOLIDAY_DELETED',
      entityType: 'holidays',
      entityId: id,
      oldValue: { name: deleted.holiday_name, date: deleted.holiday_date },
    });

    return NextResponse.json({ success: true, message: 'Holiday deleted.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete holiday.' }, { status: 500 });
  }
}
