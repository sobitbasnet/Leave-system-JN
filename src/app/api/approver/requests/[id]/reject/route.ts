import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { rejectLeaveRequest } from '@/lib/leave-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approver = await requireRole(['APPROVER', 'ADMIN']);
    if (approver.email === 'aayush@jaynepal.org' || approver.employee_id === 'JAV-002') {
      return NextResponse.json(
        {
          error:
            'Aayush Wasti does not have authorization to reject leave requests. Approvals are strictly reserved for the Director and Administrator.',
        },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const requestId = params.id;

    if (!body.rejectionReason || body.rejectionReason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A reason for rejection must be provided.' },
        { status: 400 }
      );
    }

    const updatedRequest = await rejectLeaveRequest(
      requestId,
      approver.id,
      body.rejectionReason,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Leave request rejected.',
      request: updatedRequest,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to reject leave request.' },
      { status: 400 }
    );
  }
}
