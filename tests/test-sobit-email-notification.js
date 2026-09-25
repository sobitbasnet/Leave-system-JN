const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('=====================================================');
  console.log('TEST: EMAIL NOTIFICATION TO SOBITB22@GMAIL.COM');
  console.log('=====================================================');

  // 1. Check settings
  const settings = await prisma.organizationSettings.findUnique({ where: { id: 'default' } });
  console.log('Notification email in DB settings:', settings.notification_email);
  if (settings.notification_email !== 'sobitb22@gmail.com') {
    throw new Error(`FAIL: Expected notification_email to be sobitb22@gmail.com, got ${settings.notification_email}`);
  }
  console.log('✓ PASS 1: Organization settings has notification_email = sobitb22@gmail.com');

  // 2. Staff login (Birag Acharya, IT Teacher)
  const staff = await prisma.profile.findFirst({
    where: { full_name: 'Birag Acharya' },
  });
  const handover = await prisma.profile.findFirst({
    where: { full_name: 'Subash Majhi' },
  });

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: staff.employee_id, password: 'Bodgaun123' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log(`Staff login (${staff.full_name}): status ${loginRes.status}`);

  // Delete any conflicting future test requests
  await prisma.leaveRequest.deleteMany({
    where: {
      employee_id: staff.id,
      start_date: '2026-11-15',
    },
  });

  // 3. Submit Leave Request
  const applyRes = await fetch('http://localhost:3000/api/leave/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      startDate: '2026-11-15',
      endDate: '2026-11-17',
      handoverEmployeeId: handover.id,
      reason: 'Urgent family work in native village',
      leaveType: 'ADVANCE',
      contactDuringLeave: '9841234567',
    }),
  });

  const applyData = await applyRes.json();
  console.log('Leave Apply Response status:', applyRes.status, applyData.success ? 'SUCCESS' : applyData.error);
  if (!applyData.success) {
    throw new Error(`FAIL: Leave apply failed: ${applyData.error}`);
  }

  const reqId = applyData.leaveRequest.id;

  // 4. Verify NotificationLog
  // Give background non-blocking promise 100ms to complete logging
  await new Promise((r) => setTimeout(r, 200));

  const log = await prisma.notificationLog.findFirst({
    where: {
      leave_request_id: reqId,
      channel: 'EMAIL',
    },
    orderBy: { created_at: 'desc' },
  });

  if (!log) {
    throw new Error('FAIL: No NotificationLog record found for submitted leave request!');
  }

  console.log('Found NotificationLog entry:', {
    recipient: log.recipient,
    channel: log.channel,
    status: log.status,
    provider: log.provider,
  });

  if (!log.recipient.includes('sobitb22@gmail.com')) {
    throw new Error(`FAIL: Expected recipient to contain sobitb22@gmail.com, got: ${log.recipient}`);
  }

  const payload = JSON.parse(log.payload || '{}');
  console.log('Email Subject:', payload.subject);
  if (!payload.subject.includes('Birag Acharya')) {
    throw new Error(`FAIL: Subject does not mention Birag Acharya: ${payload.subject}`);
  }
  if (!payload.subject.includes('दिन बिदा माग')) {
    throw new Error(`FAIL: Subject does not contain Nepali leave alert phrase: ${payload.subject}`);
  }

  console.log('✓ PASS 2: Leave submission triggered email notification to sobitb22@gmail.com with Nepali subject!');

  // 5. Test approver test-email API
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@jaynepal.org', password: 'admin', portal: 'approver' }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');

  const testEmailRes = await fetch('http://localhost:3000/api/approver/notifications/test-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ email: 'sobitb22@gmail.com' }),
  });
  const testEmailData = await testEmailRes.json();
  console.log('Test email API status:', testEmailRes.status, testEmailData.message);
  if (!testEmailData.success) {
    throw new Error(`FAIL: Test email failed: ${testEmailData.error}`);
  }
  console.log('✓ PASS 3: Test Email API verified for sobitb22@gmail.com!');

  // Cleanup test request
  await prisma.leaveRequest.delete({ where: { id: reqId } });
  console.log('=====================================================');
  console.log('ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY! 100%');
  console.log('=====================================================');
}

runTest()
  .catch((err) => {
    console.error('TEST ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
