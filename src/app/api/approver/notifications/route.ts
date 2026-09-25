import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const notifications = await prisma.notificationLog.findMany({
      include: {
        leave_request: {
          include: {
            employee: { select: { full_name: true, department: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
