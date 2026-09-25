import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const approver = await requireRole(['APPROVER', 'ADMIN']);
    const body = await request.json().catch(() => ({}));

    const targetEmail = body.email || approver.email || 'sobitb22@gmail.com';

    const result = await sendEmail({
      to: targetEmail,
      subject: `[JAV Leave Portal] SMTP Test Email — Verified Successfully`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
          <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1d4ed8; margin-top: 0;">Jaynepal Action Volunteers</h2>
            <p><strong>Staff Leave Management System</strong></p>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 6px; color: #065f46; font-size: 14px;">
              ✓ <strong>Email Notification System is Active!</strong><br/>
              This is a test notification dispatched to ${targetEmail} from the Leave Management System.
            </div>
            <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
              Triggered by: <strong>${approver.full_name}</strong> (${approver.designation})<br/>
              Date & Time: ${new Date().toLocaleString('ne-NP', { timeZone: 'Asia/Kathmandu' })}
            </p>
          </div>
        </div>
      `,
      text: `JAV Staff Leave System: SMTP Email Notification test sent to ${targetEmail} by ${approver.full_name}.`,
      notificationType: 'TEST_EMAIL',
    });

    return NextResponse.json({
      success: true,
      message: result.simulated
        ? `Notification logged for ${targetEmail}. (Note: Live inbox delivery requires Google App Password in Settings or .env)`
        : `Live test email delivered successfully to ${targetEmail}!`,
      result,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to send test email.' },
      { status: 500 }
    );
  }
}
