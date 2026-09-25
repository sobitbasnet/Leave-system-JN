const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

// SMTP creds (from .env)
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_USER = process.env.SMTP_USER || 'sobitb22@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  try {
    // Find Sajan (SQLite doesn't support insensitive mode)
    const allProfiles = await prisma.profile.findMany({
      select: { id: true, full_name: true, email: true, department: true },
    });

    const sajan = allProfiles.find(p =>
      p.full_name.toLowerCase().includes('sajan')
    );

    console.log('Found:', JSON.stringify(sajan, null, 2));

    if (!sajan) {
      console.log('Sajan not found! All profiles:');
      allProfiles.forEach(p => console.log(' -', p.full_name, '|', p.email));
      return;
    }

    if (!sajan.email) {
      console.log('Sajan has no email set — update it in the portal Edit Profile first.');
      return;
    }

    if (!SMTP_PASS) {
      console.log('No SMTP_PASS available!');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Test 1: APPROVED email
    const approvedInfo = await transporter.sendMail({
      from: `Jaynepal Action Volunteers <${SMTP_USER}>`,
      to: sajan.email,
      subject: `[JAV Leave Portal] Your Leave Request has been APPROVED (TEST)`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#059669;color:#fff;padding:20px 24px;">
            <h2 style="margin:0;">✅ Leave Request Approved / बिदा स्वीकृत भयो</h2>
            <p style="margin:4px 0 0;font-size:13px;">Jaynepal Action Volunteers — TEST</p>
          </div>
          <div style="padding:24px;">
            <p style="font-size:15px;">नमस्ते <strong>${sajan.full_name}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;">
              तपाईंले मिति <strong>2026-09-30</strong> देखि <strong>2026-10-02</strong> सम्म माग गर्नुभएको <strong>3 दिन</strong>को बिदा स्वीकृत भएको जानकारी गराइन्छ।
            </p>
            <div style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:13px;margin:16px 0;">
              <strong>Approver Remarks:</strong><br/>
              <em>"यो एउटा test email हो — real approval जस्तै email आउनेछ।"</em>
            </div>
            <p style="font-size:13px;color:#64748b;">Approved by: <strong>Sobit Bajracharya (Director)</strong></p>
            <div style="text-align:center;margin-top:24px;">
              <a href="http://localhost:3000/leave/requests" style="background:#059669;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:bold;font-size:13px;display:inline-block;">
                View My Leave Requests
              </a>
            </div>
          </div>
          <div style="background:#f8fafc;padding:12px;font-size:11px;text-align:center;color:#94a3b8;border-top:1px solid #e2e8f0;">
            © ${new Date().getFullYear()} Jaynepal Action Volunteers
          </div>
        </div>
      `,
    });

    console.log('\n✅ APPROVED email sent to:', sajan.email);
    console.log('   MessageId:', approvedInfo.messageId);

    // Test 2: REJECTED email
    const rejectedInfo = await transporter.sendMail({
      from: `Jaynepal Action Volunteers <${SMTP_USER}>`,
      to: sajan.email,
      subject: `[JAV Leave Portal] Leave Request Update: Not Approved (TEST)`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#e11d48;color:#fff;padding:20px 24px;">
            <h2 style="margin:0;">❌ Leave Request Not Approved / बिदा स्वीकृत हुन सकेन</h2>
            <p style="margin:4px 0 0;font-size:13px;">Jaynepal Action Volunteers — TEST</p>
          </div>
          <div style="padding:24px;">
            <p style="font-size:15px;">नमस्ते <strong>${sajan.full_name}</strong>,</p>
            <p style="font-size:14px;line-height:1.6;">
              तपाईंले मिति <strong>2026-09-30</strong> देखि <strong>2026-10-02</strong> सम्म माग गर्नुभएको <strong>3 दिन</strong>को बिदा यस पटक स्वीकृत हुन सकेन।
            </p>
            <div style="background:#fff1f2;border:1px solid #fecdd3;padding:14px;border-radius:8px;font-size:13px;color:#9f1239;margin:16px 0;">
              <strong>Rejection Reason / कारण:</strong><br/>
              "यो एउटा test email हो — real rejection जस्तै email आउनेछ।"
            </div>
            <p style="font-size:13px;color:#64748b;">Reviewed by: <strong>Sobit Bajracharya (Director)</strong></p>
          </div>
          <div style="background:#f8fafc;padding:12px;font-size:11px;text-align:center;color:#94a3b8;border-top:1px solid #e2e8f0;">
            © ${new Date().getFullYear()} Jaynepal Action Volunteers
          </div>
        </div>
      `,
    });

    console.log('\n❌ REJECTED email sent to:', sajan.email);
    console.log('   MessageId:', rejectedInfo.messageId);
    console.log('\nDone! Check inbox of:', sajan.email);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
