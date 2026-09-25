import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { retryEmailNotification } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(['APPROVER', 'ADMIN']);
    const logId = params.id;

    const result = await retryEmailNotification(logId);

    return NextResponse.json({
      success: true,
      message: 'Notification retry initiated.',
      result,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to retry notification.' },
      { status: 400 }
    );
  }
}
