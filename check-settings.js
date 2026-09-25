const { PrismaClient } = require('@prisma/client');
async function main() {
  const p = new PrismaClient();
  const s = await p.organizationSettings.findUnique({ where: { id: 'default' } });
  console.log('weekly_holiday_day_of_week:', s?.weekly_holiday_day_of_week);
  console.log('Full settings:', JSON.stringify(s, null, 2));
  await p.$disconnect();
}
main().catch(console.error);
