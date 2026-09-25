const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Starting full reset...\n');

    // 1. Delete all notification logs
    const notifDel = await prisma.notificationLog.deleteMany({});
    console.log(`✅ Notification Logs deleted: ${notifDel.count}`);

    // 2. Delete all audit logs
    const auditDel = await prisma.auditLog.deleteMany({});
    console.log(`✅ Audit Logs deleted: ${auditDel.count}`);

    // 3. Delete all leave ledger entries FIRST (references leaveRequest)
    const ledgerDel = await prisma.leaveLedger.deleteMany({});
    console.log(`✅ Leave Ledger entries deleted: ${ledgerDel.count}`);

    // 4. Delete all leave requests
    const leaveReqDel = await prisma.leaveRequest.deleteMany({});
    console.log(`✅ Leave Requests deleted: ${leaveReqDel.count}`);

    console.log('\n🎉 Full reset complete! All records cleared, all balances are now 0.');
    console.log('You can now credit fresh opening balances from the Admin panel.');

  } catch (err) {
    console.error('Error during reset:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
