const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Official Organization Roster (19 Staff Members + 1 Central Admin)
const officialRoster = [
  // Executive Leadership (Jay Nepal NGO)
  {
    employee_id: 'JAV-001',
    full_name: 'Sobit Basnet',
    designation: 'Director',
    department: 'Jay Nepal NGO',
    email: 'sobitb22@gmail.com',
    role: 'ADMIN',
    joining_date: '2024-01-01',
    whatsapp_number: '9779841000001',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-002',
    full_name: 'Aayush Wasti',
    designation: 'Vice Director',
    department: 'Jay Nepal NGO',
    email: 'wastiaayush789@gmail.com',
    role: 'STAFF', // Strictly STAFF role (no approver/admin access)
    joining_date: '2024-01-01',
    whatsapp_number: '9779841000002',
    monthly_paid_leave: 2.0,
  },

  // School of Social Development (SOSD) & IT Education
  {
    employee_id: 'JAV-003',
    full_name: 'Sajan Majhi',
    designation: 'Coordinator',
    department: 'School of Social Development (SOSD)',
    email: 'info.sobit@gmail.com',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000003',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-004',
    full_name: 'Aavash Poudel',
    designation: 'IT Teacher',
    department: 'IT Education Program',
    email: 'aavash@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-02-01',
    whatsapp_number: '9779841000004',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-005',
    full_name: 'Sarita Majhi',
    designation: 'Cleaner',
    department: 'School of Social Development (SOSD)',
    email: 'sarita.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000005',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-006',
    full_name: 'Tarachandra Majhi',
    designation: 'Security Guard / Facility Support',
    department: 'School of Social Development (SOSD)',
    email: 'tarachandra@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000006',
    monthly_paid_leave: 2.0,
  },

  // Bodgaun Primary Hospital Team
  {
    employee_id: 'JAV-007',
    full_name: 'Dr. Bikesh Shrestha',
    designation: 'Medical Superintendent',
    department: 'Bodgaun Primary Hospital',
    email: 'bikesh@jaynepal.org',
    role: 'STAFF',
    joining_date: '2024-06-01',
    whatsapp_number: '9779841000007',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-008',
    full_name: 'Aastha Parajuli',
    designation: 'Lab Technician',
    department: 'Bodgaun Primary Hospital',
    email: 'aastha@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000008',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-009',
    full_name: 'Sudip Moktan',
    designation: 'Pharmacist',
    department: 'Bodgaun Primary Hospital',
    email: 'sudip.moktan@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000009',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-010',
    full_name: 'Sudip Basnet',
    designation: 'Health Assistant (HA)',
    department: 'Bodgaun Primary Hospital',
    email: 'sudip.basnet@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000010',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-011',
    full_name: 'Rakshya Pandeya',
    designation: 'Staff Nurse',
    department: 'Bodgaun Primary Hospital',
    email: 'rakshya@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000011',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-012',
    full_name: 'Sarita Majhi (A)',
    designation: 'Cashier & Administrative Reporting Assistant',
    department: 'Bodgaun Primary Hospital',
    email: 'sarita.admin@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000012',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-013',
    full_name: 'Bimal Majhi',
    designation: 'Area Lead',
    department: 'Bodgaun Primary Hospital',
    email: 'bimal@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000013',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-014',
    full_name: 'Insaan Majhi',
    designation: 'Maintenance Lead',
    department: 'Bodgaun Primary Hospital',
    email: 'insaan@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000014',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-015',
    full_name: 'Sarita Danuwar',
    designation: 'AHW',
    department: 'Bodgaun Primary Hospital',
    email: 'sarita.danuwar@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-03-01',
    whatsapp_number: '9779841000015',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-016',
    full_name: 'Sabina Rai Danuwar',
    designation: 'ANM',
    department: 'Bodgaun Primary Hospital',
    email: 'sabina@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-03-01',
    whatsapp_number: '9779841000016',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-017',
    full_name: 'Gorakh Gurdhami',
    designation: 'AHW',
    department: 'Bodgaun Primary Hospital',
    email: 'gorakh@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-03-01',
    whatsapp_number: '9779841000017',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-018',
    full_name: 'Maiya Neupane',
    designation: 'OH',
    department: 'Bodgaun Primary Hospital',
    email: 'maiya@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-04-01',
    whatsapp_number: '9779841000018',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-019',
    full_name: 'Datta Singh Karki',
    designation: 'Senior HA / Anesthesia Assistant',
    department: 'Bodgaun Primary Hospital',
    email: 'datta@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000019',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-020',
    full_name: 'Birag Acharya',
    designation: 'IT Teacher / Instructor',
    department: 'IT Education Program',
    email: 'birag@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000020',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-021',
    full_name: 'Subash Majhi',
    designation: 'IT Assistant',
    department: 'IT Education Program',
    email: 'subash@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-01-01',
    whatsapp_number: '9779841000021',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-022',
    full_name: 'Anita Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'anita.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2023-06-01',
    whatsapp_number: '9779841000022',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-023',
    full_name: 'Sundari Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'sundari.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2023-06-01',
    whatsapp_number: '9779841000023',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-024',
    full_name: 'Januka Majhi',
    designation: 'Senior Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'januka.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2022-01-16',
    whatsapp_number: '9779841000024',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-025',
    full_name: 'Sangita Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'sangita.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2025-02-02',
    whatsapp_number: '9779841000025',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-026',
    full_name: 'Kabita Parajuli',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'kabita.parajuli@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-02-08',
    whatsapp_number: '9779841000026',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-027',
    full_name: 'Ramila Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'ramila.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-05-19',
    whatsapp_number: '9779841000027',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-028',
    full_name: 'Alisha Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'alisha.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-04-28',
    whatsapp_number: '9779841000028',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-029',
    full_name: 'Badri Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'badri.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-05-01',
    whatsapp_number: '9779841000029',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-030',
    full_name: 'Sarjib Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'sarjib.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-04-01',
    whatsapp_number: '9779841000030',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-031',
    full_name: 'Sharmila Majhi',
    designation: 'Teacher / Staff',
    department: 'School of Social Development (SOSD)',
    email: 'sharmila.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-07-14',
    whatsapp_number: '9779841000031',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-032',
    full_name: 'Ujjwal Shrestha',
    designation: 'Coordinator / Teacher',
    department: 'School of Social Development (SOSD)',
    email: 'ujjwal.shrestha@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-03-10',
    whatsapp_number: '9779841000032',
    monthly_paid_leave: 2.0,
  },
  {
    employee_id: 'JAV-033',
    full_name: 'Yuwarani Majhi',
    designation: 'Support Staff / Assistant',
    department: 'School of Social Development (SOSD)',
    email: 'yuwarani.majhi@jaynepal.org',
    role: 'STAFF',
    joining_date: '2026-06-07',
    whatsapp_number: '9779841000033',
    monthly_paid_leave: 2.0,
  },
];

const validEmployeeIds = new Set([
  'JAV-ADM-000',
  ...officialRoster.map((r) => r.employee_id),
]);
const validEmails = new Set([
  'admin@jaynepal.org',
  ...officialRoster.map((r) => r.email.toLowerCase()),
]);

async function main() {
  console.log('=== Cleaning Dummy Staff and Resetting Leave Balances to Zero ===\n');

  // 1. Identify and delete all dummy / test profiles
  const allProfiles = await prisma.profile.findMany();
  const dummyProfiles = allProfiles.filter(
    (p) => !validEmployeeIds.has(p.employee_id) && !validEmails.has(p.email.toLowerCase())
  );

  console.log(`Found ${dummyProfiles.length} dummy/test profiles to remove:`);
  for (const d of dummyProfiles) {
    console.log(`  - Removing: ${d.employee_id} | ${d.full_name} (${d.email})`);
    const dummyId = d.id;

    // Delete associated logs, requests, ledgers
    await prisma.notificationLog.deleteMany({
      where: {
        OR: [
          { leave_request: { employee_id: dummyId } },
          { recipient: { contains: d.email } },
        ],
      },
    });

    await prisma.leaveLedger.deleteMany({
      where: {
        OR: [
          { employee_id: dummyId },
          { created_by: dummyId },
        ],
      },
    });

    await prisma.leaveRequest.deleteMany({
      where: {
        OR: [
          { employee_id: dummyId },
          { handover_employee_id: dummyId },
          { approved_by: dummyId },
        ],
      },
    });

    await prisma.profile.delete({
      where: { id: dummyId },
    });
  }
  console.log(`✓ Cleaned up all ${dummyProfiles.length} dummy/test profiles.\n`);

  // 2. Hash passwords
  const defaultPasswordHash = await bcrypt.hash('Bodgaun123', 10);
  const rootAdminPasswordHash = await bcrypt.hash('admin', 10);

  // 3. Upsert Root Admin
  const rootAdmin = await prisma.profile.upsert({
    where: { email: 'admin@jaynepal.org' },
    update: {
      employee_id: 'JAV-ADM-000',
      role: 'ADMIN',
      full_name: 'Jay Nepal Central Admin',
      department: 'Jay Nepal NGO',
      designation: 'System Administrator',
      status: 'ACTIVE',
      monthly_paid_leave: 2.0,
      password_hash: rootAdminPasswordHash,
    },
    create: {
      employee_id: 'JAV-ADM-000',
      email: 'admin@jaynepal.org',
      password_hash: rootAdminPasswordHash,
      full_name: 'Jay Nepal Central Admin',
      phone: '+977 9851000000',
      whatsapp_number: '9779851000000',
      department: 'Jay Nepal NGO',
      designation: 'System Administrator',
      joining_date: '2024-01-01',
      role: 'ADMIN',
      status: 'ACTIVE',
      monthly_paid_leave: 2.0,
    },
  });

  // 4. Upsert Director Sobit Basnet (Approver & Admin)
  const directorSobit = await prisma.profile.upsert({
    where: { email: 'sobit@jaynepal.org' },
    update: {
      employee_id: 'JAV-001',
      full_name: 'Sobit Basnet',
      designation: 'Director',
      department: 'Jay Nepal NGO',
      role: 'ADMIN',
      status: 'ACTIVE',
      monthly_paid_leave: 2.0,
      whatsapp_number: '9779841000001',
      password_hash: defaultPasswordHash,
    },
    create: {
      employee_id: 'JAV-001',
      email: 'sobit@jaynepal.org',
      password_hash: defaultPasswordHash,
      full_name: 'Sobit Basnet',
      phone: '+977 9841000001',
      whatsapp_number: '9779841000001',
      department: 'Jay Nepal NGO',
      designation: 'Director',
      joining_date: '2024-01-01',
      role: 'ADMIN',
      status: 'ACTIVE',
      monthly_paid_leave: 2.0,
    },
  });

  // 5. Upsert all 18 other personnel in the official roster
  const officialProfiles = [directorSobit];

  for (const emp of officialRoster) {
    if (emp.employee_id === 'JAV-001') continue;

    const profile = await prisma.profile.upsert({
      where: { employee_id: emp.employee_id },
      update: {
        email: emp.email,
        full_name: emp.full_name,
        designation: emp.designation,
        department: emp.department,
        role: emp.role,
        status: 'ACTIVE',
        approver_id: directorSobit.id,
        monthly_paid_leave: emp.monthly_paid_leave || 2.0,
        whatsapp_number: emp.whatsapp_number,
      },
      create: {
        employee_id: emp.employee_id,
        email: emp.email,
        password_hash: defaultPasswordHash,
        full_name: emp.full_name,
        phone: `+977 ${emp.whatsapp_number.slice(3)}`,
        whatsapp_number: emp.whatsapp_number,
        department: emp.department,
        designation: emp.designation,
        joining_date: emp.joining_date,
        role: emp.role,
        status: 'ACTIVE',
        approver_id: directorSobit.id,
        monthly_paid_leave: emp.monthly_paid_leave || 2.0,
      },
    });

    officialProfiles.push(profile);
  }
  console.log(`✓ Confirmed ${officialProfiles.length} official staff members in database.\n`);

  // 6. RESET ALL LEAVE BALANCES TO ZERO (0.0 Days)
  // Delete all existing leaveLedger records and dummy leave requests for clean state
  console.log('Resetting all leave requests and ledger entries...');
  await prisma.notificationLog.deleteMany({});
  await prisma.leaveLedger.deleteMany({});
  await prisma.leaveRequest.deleteMany({});

  // Seed baseline OPENING_BALANCE of 0.0 Days for each official staff member
  for (const p of officialProfiles) {
    await prisma.leaveLedger.create({
      data: {
        employee_id: p.id,
        transaction_type: 'OPENING_BALANCE',
        amount: 0.0,
        notes: 'Initial zero leave balance baseline setup',
        dedup_key: `OPENING_${p.id}`,
        created_by: directorSobit.id,
        created_at: new Date('2026-09-25T00:00:00.000Z'),
      },
    });
  }

  // Also seed for Central Admin
  await prisma.leaveLedger.create({
    data: {
      employee_id: rootAdmin.id,
      transaction_type: 'OPENING_BALANCE',
      amount: 0.0,
      notes: 'Initial zero leave balance baseline setup',
      dedup_key: `OPENING_${rootAdmin.id}`,
      created_by: rootAdmin.id,
      created_at: new Date('2026-09-25T00:00:00.000Z'),
    },
  });

  console.log(`✓ Seeded clean 0.0 Days opening balance for all ${officialProfiles.length + 1} personnel.`);
  console.log('\n=== Cleanup & Zero-Balance Reset Complete ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
