import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { submitLeaveRequest } from '@/lib/leave-service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const leaveRequest = await submitLeaveRequest({
      employeeId: user.id,
      startDate: body.startDate,
      endDate: body.endDate,
      handoverEmployeeId: body.handoverEmployeeId,
      reason: body.reason,
      leaveType: body.leaveType,
      contactDuringLeave: body.contactDuringLeave,
      additionalNotes: body.additionalNotes,
      attachmentUrl: body.attachmentUrl,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      leaveRequest,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to submit leave request.' },
      { status: 400 }
    );
  }
}
