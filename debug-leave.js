const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Show who submitted what (all recent leave requests with employee name)
    const requests = await prisma.leaveRequest.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        employee: { select: { full_name: true, employee_id: true, role: true } },
      },
    });

    console.log('=== Recent Leave Requests ===');
    for (const r of requests) {
      console.log(`\n[${r.status}] ${r.employee?.full_name} (${r.employee?.employee_id})`);
      console.log(`  Dates: ${r.start_date} → ${r.end_date} (${r.calculated_days} days)`);
      console.log(`  Created: ${r.created_at}`);
      if (r.rejection_reason) console.log(`  Rejection: ${r.rejection_reason}`);
    }

    // Show balances for real staff only
    console.log('\n=== Leave Balances for Real Staff ===');
    const staff = await prisma.profile.findMany({
      where: {
        status: 'ACTIVE',
        NOT: [
          { employee_id: { startsWith: 'INT-' } },
          { employee_id: { startsWith: 'STF-COL' } },
          { employee_id: { startsWith: 'TEST-' } },
        ],
      },
      select: { id: true, full_name: true, employee_id: true, role: true },
      orderBy: { full_name: 'asc' },
    });

    for (const s of staff) {
      const ledger = await prisma.leaveLedger.findMany({
        where: { employee_id: s.id },
        select: { amount: true },
      });
      const balance = ledger.reduce((sum, l) => sum + l.amount, 0);
      const pending = await prisma.leaveRequest.findMany({
        where: { employee_id: s.id, status: { in: ['PENDING', 'APPROVED'] } },
        select: { calculated_days: true, start_date: true, end_date: true, status: true },
      });
      const pendingDays = pending.reduce((sum, r) => sum + r.calculated_days, 0);
      console.log(`\n${s.full_name} [${s.role}] (${s.employee_id})`);
      console.log(`  Balance: ${balance} days | Pending/Approved: ${pendingDays} days | Available: ${balance - pendingDays} days`);
      if (pending.length > 0) {
        pending.forEach(p => console.log(`  → ${p.status}: ${p.start_date} to ${p.end_date}`));
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
