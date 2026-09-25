const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dummyEmployees = await prisma.profile.findMany({
    where: {
      OR: [
        { employee_id: { startsWith: 'TEST-' } },
        { employee_id: { startsWith: 'INT-' } },
        { employee_id: { startsWith: 'ADM-CRUD' } },
        { employee_id: { startsWith: 'STF-COL' } },
      ],
    },
  });

  console.log('Found dummy profiles to delete:', dummyEmployees.map((d) => d.employee_id));
  const admin = await prisma.profile.findFirst({ where: { role: 'ADMIN' } });

  for (const emp of dummyEmployees) {
    const id = emp.id;
    await prisma.$transaction(async (tx) => {
      await tx.profile.updateMany({ where: { approver_id: id }, data: { approver_id: null } });
      await tx.leaveRequest.updateMany({ where: { approved_by: id }, data: { approved_by: null } });
      await tx.leaveRequest.updateMany({ where: { rejected_by: id }, data: { rejected_by: null } });
      await tx.leaveRequest.updateMany({
        where: { handover_employee_id: id },
        data: { handover_employee_id: admin.id },
      });
      const reqs = await tx.leaveRequest.findMany({ where: { employee_id: id }, select: { id: true } });
      const reqIds = reqs.map((r) => r.id);
      if (reqIds.length > 0) {
        await tx.notificationLog.deleteMany({ where: { leave_request_id: { in: reqIds } } });
      }
      await tx.leaveLedger.deleteMany({
        where: {
          OR: [{ employee_id: id }, ...(reqIds.length > 0 ? [{ leave_request_id: { in: reqIds } }] : [])],
        },
      });
      await tx.leaveLedger.updateMany({ where: { created_by: id }, data: { created_by: null } });
      if (reqIds.length > 0) {
        await tx.leaveRequest.deleteMany({ where: { id: { in: reqIds } } });
      }
      await tx.auditLog.updateMany({ where: { user_id: id }, data: { user_id: null } });
      await tx.profile.delete({ where: { id } });
    });
    console.log('Successfully deleted:', emp.employee_id, emp.full_name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
