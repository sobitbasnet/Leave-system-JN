const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Get all real JAV staff (JAV-xxx IDs) with 0 balance
    const staff = await prisma.profile.findMany({
      where: {
        status: 'ACTIVE',
        role: 'STAFF',
        employee_id: { startsWith: 'JAV-' },
      },
      select: { id: true, full_name: true, employee_id: true },
      orderBy: { employee_id: 'asc' },
    });

    console.log(`Found ${staff.length} JAV staff members\n`);

    let credited = 0;
    let skipped = 0;

    for (const s of staff) {
      // Check current balance
      const ledger = await prisma.leaveLedger.findMany({
        where: { employee_id: s.id },
        select: { amount: true },
      });
      const currentBalance = ledger.reduce((sum, l) => sum + l.amount, 0);

      if (currentBalance === 0) {
        await prisma.leaveLedger.create({
          data: {
            employee_id: s.id,
            transaction_type: 'OPENING_BALANCE',
            amount: 15,
            notes: 'Opening balance — FY 2082/083 initial allocation (15 days)',
            created_by: s.id,
          },
        });
        console.log(`✅ ${s.full_name} (${s.employee_id}): +15 days credited`);
        credited++;
      } else {
        console.log(`⏭  ${s.full_name} (${s.employee_id}): already ${currentBalance} days — skipped`);
        skipped++;
      }
    }

    console.log(`\nSummary: ${credited} staff credited, ${skipped} already had balance`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
