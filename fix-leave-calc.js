const { PrismaClient } = require('@prisma/client');
async function main() {
  const p = new PrismaClient();
  // Set weekly_holiday_day_of_week to null = no automatic day exclusion
  // This means 25 to 25 = 1 day, 25 to 26 = 2 days (calendar days)
  await p.organizationSettings.update({
    where: { id: 'default' },
    data: { weekly_holiday_day_of_week: null },
  });
  console.log('Done: weekly_holiday_day_of_week set to null (no day auto-excluded)');
  console.log('Now 25 to 25 = 1 day, 25 to 26 = 2 days ✓');
  await p.$disconnect();
}
main().catch(console.error);
