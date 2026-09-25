import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const auditLogs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, full_name: true, email: true, role: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return NextResponse.json({ auditLogs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
