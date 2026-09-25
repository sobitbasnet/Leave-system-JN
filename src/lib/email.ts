import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  leaveRequestId?: string;
  notificationType?: string;
}

/**
 * Returns a configured Nodemailer transporter if SMTP environment variables or database settings are present.
 */
async function getTransporter() {
  let dbSettings: any = null;
  try {
    dbSettings = await prisma.organizationSettings.findUnique({ where: { id: 'default' } });
  } catch {}

  const host = dbSettings?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = dbSettings?.smtp_port || parseInt(process.env.SMTP_PORT || '465', 10);
  const user = dbSettings?.smtp_user || process.env.SMTP_USER || 'sobitb22@gmail.com';
  const pass = dbSettings?.smtp_pass || process.env.SMTP_PASS;
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';
  const from =
    dbSettings?.smtp_from ||
    process.env.SMTP_FROM ||
    `Jaynepal Action Volunteers <${user}>`;

  if (!host || !user || !pass) {
    return { transporter: null, fromAddress: from, user, configured: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return { transporter, fromAddress: from, user, configured: true };
}

/**
 * Sends an email notification.
 * Non-blocking: will never crash leave submission/approval flows even if email dispatch encounters an error.
 */
export async function sendEmail(options: EmailOptions) {
  const recipientStr = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  // 1. Initial Notification Log Record (QUEUED)
  let logRecord = await prisma.notificationLog.create({
    data: {
      leave_request_id: options.leaveRequestId || null,
      recipient: recipientStr,
      channel: 'EMAIL',
      status: 'QUEUED',
      provider: 'NODEMAILER',
      payload: JSON.stringify({
        subject: options.subject,
        to: recipientStr,
        notificationType: options.notificationType || 'GENERAL',
      }),
    },
  });

  const { transporter, fromAddress, configured } = await getTransporter();

  // 2. If SMTP is not yet configured with an App Password / credentials, simulate email dispatch safely
  if (!transporter) {
    console.log('\n======================================================');
    console.log(`[EMAIL NOTIFICATION (QUEUED/SIMULATED)]`);
    console.log(`To:      ${recipientStr}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Type:    ${options.notificationType || 'GENERAL'}`);
    console.log(`------------------------------------------------------`);
    if (options.text) console.log(options.text.slice(0, 300) + '...');
    console.log('======================================================\n');

    await prisma.notificationLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'SENT',
        provider: 'EMAIL_SIMULATED',
        provider_message_id: 'SIMULATED_' + Date.now(),
        error_message: 'SMTP credentials pending (Configure Gmail App Password in Settings or .env)',
      },
    });

    return {
      success: true,
      simulated: true,
      messageId: 'SIMULATED_' + Date.now(),
      logId: logRecord.id,
    };
  }

  // 3. Send real email via SMTP
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    await prisma.notificationLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'SENT',
        provider: 'NODEMAILER_SMTP',
        provider_message_id: info.messageId,
        error_message: null,
      },
    });

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      logId: logRecord.id,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Failed to dispatch email via SMTP';
    console.error('[EMAIL ERROR]:', errMsg);

    await prisma.notificationLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'FAILED',
        error_message: errMsg,
      },
    });

    return {
      success: false,
      error: errMsg,
      logId: logRecord.id,
    };
  }
}

/**
 * 1. Email to Approvers (Director sobitb22@gmail.com & Admin) when a new leave request is submitted
 */
export async function sendLeaveSubmittedEmail(data: {
  requestId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  leaveType: 'REGULAR' | 'ADVANCE';
  startDate: string;
  endDate: string;
  calculatedDays: number;
  reason: string;
  handoverName: string;
  currentBalance: number;
  projectedBalance: number;
}) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reviewUrl = `${appUrl}/approver/leave/${data.requestId}`;

  // Priority notification recipient: sobitb22@gmail.com
  let configuredRecipients = ['sobitb22@gmail.com'];
  try {
    const settings = await prisma.organizationSettings.findUnique({ where: { id: 'default' } });
    if (settings?.notification_email) {
      configuredRecipients = settings.notification_email
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }
  } catch {}

  if (process.env.ADMIN_NOTIFICATION_EMAILS) {
    const envEmails = process.env.ADMIN_NOTIFICATION_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);
    for (const em of envEmails) {
      if (!configuredRecipients.includes(em)) configuredRecipients.push(em);
    }
  }

  if (!configuredRecipients.includes('sobitb22@gmail.com')) {
    configuredRecipients.unshift('sobitb22@gmail.com');
  }

  const isAdvance = data.leaveType === 'ADVANCE';
  const subject = `[बिदा आवेदन] ${data.employeeName} (${data.department}) ले ${data.calculatedDays} दिन बिदा माग गर्नुभएको छ (${data.startDate} देखि ${data.endDate})`;

  const text = `📢 नयाँ बिदा आवेदन (New Leave Request Notification)\n\n` +
    `कर्मचारी: ${data.employeeName} (${data.employeeId})\n` +
    `शाखा/विभाग: ${data.department} - ${data.designation}\n` +
    `माग गरिएको बिदा: ${data.calculatedDays} दिन (${data.startDate} देखि ${data.endDate} सम्म)\n` +
    `बिदाको प्रकार: ${isAdvance ? 'अग्रीम बिदा (Advance Leave)' : 'नियमित बिदा (Regular Leave)'}\n` +
    `कारण: "${data.reason}"\n` +
    `कार्यभार सम्हाल्ने सहकर्मी: ${data.handoverName || 'None'}\n` +
    `बाँकी बिदा गणना: हालको ${data.currentBalance} दिन -> स्वीकृत भएपछिको बाँकी: ${data.projectedBalance} दिन\n\n` +
    `पोर्टलमा गएर समीक्षा तथा स्वीकृत/अस्वीकृत गर्नुहोस्:\n${reviewUrl}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #1d4ed8; color: #ffffff; padding: 22px 24px; }
          .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
          .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
          .notice-box { background: #eff6ff; border-left: 5px solid #2563eb; padding: 14px 16px; margin: 18px 24px 0; border-radius: 6px; }
          .notice-box h3 { margin: 0 0 4px; font-size: 16px; color: #1e40af; }
          .notice-box p { margin: 0; font-size: 14px; color: #0f172a; line-height: 1.5; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 10px; }
          .badge-advance { background: #fef3c7; color: #92400e; }
          .badge-regular { background: #dbeafe; color: #1e40af; }
          .content { padding: 20px 24px 24px; }
          .field-group { margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
          .field-group:last-child { border-bottom: none; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .value { font-size: 15px; color: #0f172a; font-weight: 600; margin-top: 2px; }
          .equation-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 13px; }
          .btn-container { text-align: center; margin: 24px 0 8px; }
          .btn { background: #1d4ed8; color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(29, 78, 216, 0.3); }
          .footer { background: #f8fafc; padding: 14px 24px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Jaynepal Action Volunteers</h1>
            <p>Staff Leave Management Portal — Leave Request Alert</p>
            <span class="badge ${isAdvance ? 'badge-advance' : 'badge-regular'}">
              ${isAdvance ? '⚠️ ADVANCE LEAVE / अग्रीम बिदा' : 'REGULAR LEAVE / नियमित बिदा'}
            </span>
          </div>

          <div class="notice-box">
            <h3>📢 नयाँ बिदा आवेदन</h3>
            <p>
              <strong>${data.employeeName}</strong> (${data.department}) ले 
              <strong style="color: #b91c1c; font-size: 16px;">${data.calculatedDays} दिन</strong>को बिदा माग गर्नुभएको छ।
            </p>
          </div>

          <div class="content">
            <div class="field-group">
              <div class="label">Staff Member (कर्मचारी)</div>
              <div class="value">${data.employeeName} (${data.employeeId})</div>
              <div style="font-size: 13px; color: #64748b;">${data.designation} &bull; ${data.department}</div>
            </div>

            <div class="field-group">
              <div class="label">Requested Period (बिदा माग गरिएको मिति)</div>
              <div class="value" style="color: #1d4ed8;">${data.startDate} देखि ${data.endDate} सम्म (${data.calculatedDays} दिन)</div>
            </div>

            <div class="field-group">
              <div class="label">Duty Handover (जिम्मेवारी लिने सहकर्मी)</div>
              <div class="value">${data.handoverName || 'None'}</div>
            </div>

            <div class="field-group">
              <div class="label">Reason (बिदा बस्नुको कारण)</div>
              <div class="value" style="font-weight: 400; font-style: italic; color: #334155;">"${data.reason}"</div>
            </div>

            <div class="equation-box">
              <strong>बाँकी बिदा मौज्दात (Leave Balance Impact):</strong><br/>
              हालको मौज्दात: <strong>${data.currentBalance} दिन</strong> &minus; माग गरिएको बिदा: <strong>${data.calculatedDays} दिन</strong> = 
              <strong>बाँकी रहने: ${data.projectedBalance} दिन</strong>
              ${data.projectedBalance < 0 ? '<br/><span style="color: #b91c1c; font-weight: bold;">⚠️ मौज्दात भन्दा बढी माग भएको छ (अग्रीम बिदा)। यो आगामी महिनाको संचित बिदाबाट कट्टा हुनेछ।</span>' : ''}
            </div>

            <div class="btn-container">
              <a href="${reviewUrl}" class="btn">पोर्टलमा गएर समीक्षा तथा स्वीकृत/अस्वीकृत गर्नुहोस् &rarr;</a>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Jaynepal Action Volunteers &bull; Director Notification Dispatch
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: configuredRecipients,
    subject,
    html,
    text,
    leaveRequestId: data.requestId,
    notificationType: 'LEAVE_SUBMITTED',
  });
}

/**
 * 2. Email to Employee when Leave Request is Approved
 */
export async function sendLeaveApprovedEmail(data: {
  requestId: string;
  recipientEmail: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  calculatedDays: number;
  remarks?: string;
  approverName: string;
}) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `[JAV Leave Portal] Your Leave Request has been APPROVED (${data.startDate} to ${data.endDate})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: #059669; color: #fff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 18px;">Leave Request Approved / बिदा स्वीकृत भयो</h2>
            <p style="margin: 4px 0 0; font-size: 13px;">Jaynepal Action Volunteers</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px;">नमस्ते <strong>${data.employeeName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              तपाईंले मिति <strong>${data.startDate}</strong> देखि <strong>${data.endDate}</strong> सम्म माग गर्नुभएको <strong>${data.calculatedDays} दिन</strong>को बिदा स्वीकृत भएको जानकारी गराइन्छ।
            </p>
            ${
              data.remarks
                ? `<div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; margin: 16px 0;">
                    <strong>Approver Remarks / व्यवस्थापकको टिप्पणी:</strong><br/>
                    <em>"${data.remarks}"</em>
                   </div>`
                : ''
            }
            <p style="font-size: 13px; color: #64748b;">Approved by: <strong>${data.approverName}</strong></p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}/leave/requests" style="background: #059669; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
                View My Leave Requests
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 12px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            &copy; ${new Date().getFullYear()} Jaynepal Action Volunteers
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: data.recipientEmail,
    subject,
    html,
    text: `Your leave request from ${data.startDate} to ${data.endDate} (${data.calculatedDays} days) has been APPROVED by ${data.approverName}.`,
    leaveRequestId: data.requestId,
    notificationType: 'LEAVE_APPROVED',
  });
}

/**
 * 3. Email to Employee when Leave Request is Rejected
 */
export async function sendLeaveRejectedEmail(data: {
  requestId: string;
  recipientEmail: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  calculatedDays: number;
  rejectionReason: string;
  approverName: string;
}) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `[JAV Leave Portal] Leave Request Update: Not Approved (${data.startDate} to ${data.endDate})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: #e11d48; color: #fff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 18px;">Leave Request Update / बिदा स्वीकृत हुन सकेन</h2>
            <p style="margin: 4px 0 0; font-size: 13px;">Jaynepal Action Volunteers</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px;">नमस्ते <strong>${data.employeeName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              तपाईंले मिति <strong>${data.startDate}</strong> देखि <strong>${data.endDate}</strong> सम्म माग गर्नुभएको <strong>${data.calculatedDays} दिन</strong>को बिदा यस पटक स्वीकृत हुन सकेन।
            </p>
            <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 14px; border-radius: 8px; font-size: 13px; color: #9f1239; margin: 16px 0;">
              <strong>Rejection Reason / कारण:</strong><br/>
              "${data.rejectionReason}"
            </div>
            <p style="font-size: 13px; color: #64748b;">Reviewed by: <strong>${data.approverName}</strong></p>
            <p style="font-size: 12px; color: #64748b;">
              थप जानकारी वा आकस्मिक अवस्थामा सिधै निर्देशक वा प्रशासनमा सम्पर्क राख्न सक्नुहुन्छ।
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}/leave/requests" style="background: #475569; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
                View Details in Portal
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 12px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            &copy; ${new Date().getFullYear()} Jaynepal Action Volunteers
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: data.recipientEmail,
    subject,
    html,
    text: `Your leave request from ${data.startDate} to ${data.endDate} (${data.calculatedDays} days) was not approved. Reason: ${data.rejectionReason}`,
    leaveRequestId: data.requestId,
    notificationType: 'LEAVE_REJECTED',
  });
}

/**
 * Retries a previously failed email notification log entry.
 */
export async function retryEmailNotification(logId: string) {
  const log = await prisma.notificationLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new Error('Notification record not found');
  }

  if (log.status === 'SENT' || log.status === 'DELIVERED') {
    throw new Error('Email notification has already been sent successfully. Will not resend.');
  }

  await prisma.notificationLog.update({
    where: { id: logId },
    data: {
      retry_count: { increment: 1 },
      status: 'QUEUED',
    },
  });

  const payload = log.payload ? JSON.parse(log.payload) : {};
  return sendEmail({
    to: log.recipient,
    subject: payload.subject || '[JAV Leave Portal] Notification',
    html: payload.html || `<p>${payload.text || 'Notification update'}</p>`,
    text: payload.text,
    leaveRequestId: log.leave_request_id || undefined,
    notificationType: payload.notificationType,
  });
}

