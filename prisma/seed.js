const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Official Staff Seed for Jaynepal Action Volunteers ---');

  // 1. Organization Settings
  await prisma.organizationSettings.upsert({
    where: { id: 'default' },
    update: {
      organization_name: 'Jaynepal Action Volunteers',
      timezone: 'Asia/Kathmandu',
      monthly_paid_leave: 2.0,
      weekly_holiday_day_of_week: null, // Full inclusive leave calculation (e.g. 24 to 26 = 3 days)
      carry_forward_enabled: true,
      max_carry_forward: null,
      negative_balance_allowed: false,
    },
    create: {
      id: 'default',
      organization_name: 'Jaynepal Action Volunteers',
      timezone: 'Asia/Kathmandu',
      monthly_paid_leave: 2.0,
      weekly_holiday_day_of_week: null,
      carry_forward_enabled: true,
      max_carry_forward: null,
      negative_balance_allowed: false,
      whatsapp_enabled: false,
      approver_whatsapp_number: '9779800000000',
    },
  });
  console.log('✓ Organization settings updated');

  // 2. Nepali Public & Organization Holidays (2026)
  const holidays = [
    { holiday_name: "Prithvi Jayanti", holiday_date: "2026-01-11", notes: "National Unity Day" },
    { holiday_name: "Martyrs' Day", holiday_date: "2026-01-30", notes: "National Memorial" },
    { holiday_name: "Maha Shivaratri", holiday_date: "2026-02-15", notes: "Major National Festival" },
    { holiday_name: "International Women's Day", holiday_date: "2026-03-08", notes: "Public Holiday" },
    { holiday_name: "Holi Festival", holiday_date: "2026-03-24", notes: "Festival of Colors" },
    { holiday_name: "Nepali New Year 2083", holiday_date: "2026-04-14", notes: "Baisakh 1" },
    { holiday_name: "Buddha Jayanti", holiday_date: "2026-05-31", notes: "Birth of Lord Buddha" },
    { holiday_name: "Constitution Day", holiday_date: "2026-09-19", notes: "National Day" },
    { holiday_name: "Dashain (Phulpati)", holiday_date: "2026-10-18", notes: "Dashain Festival" },
    { holiday_name: "Dashain (Maha Ashtami)", holiday_date: "2026-10-19", notes: "Dashain Festival" },
    { holiday_name: "Dashain (Maha Navami)", holiday_date: "2026-10-20", notes: "Dashain Festival" },
    { holiday_name: "Dashain (Vijaya Dashami)", holiday_date: "2026-10-21", notes: "Main Dashain Day" },
    { holiday_name: "Tihar (Govardhan Puja)", holiday_date: "2026-11-09", notes: "Tihar Festival" },
    { holiday_name: "Tihar (Bhai Tika)", holiday_date: "2026-11-10", notes: "Tihar Festival" },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { holiday_date: h.holiday_date },
      update: { holiday_name: h.holiday_name, notes: h.notes, active: true },
      create: { ...h, active: true },
    });
  }
  console.log(`✓ Seeded ${holidays.length} Nepali holidays`);

  // 3. User Credentials Hashes
  const defaultPassword = 'Bodgaun123';
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);
  const rootAdminPasswordHash = await bcrypt.hash('admin', 10);
  const adminPasswordHash = defaultPasswordHash;
  const staffPasswordHash = defaultPasswordHash;

  // System Root Admin Account (Username: admin@jaynepal.org, Password: admin)
  const rootAdmin = await prisma.profile.upsert({
    where: { email: 'admin@jaynepal.org' },
    update: {
      role: 'ADMIN',
      full_name: 'Jay Nepal Central Admin',
      department: 'Jay Nepal NGO',
      designation: 'System Administrator',
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
    },
  });

  // Official Organization Roster (19 Staff Members)
  const officialRoster = [
    // Executive Leadership (Jay Nepal NGO)
    {
      employee_id: 'JAV-001',
      full_name: 'Sobit Basnet',
      designation: 'Director',
      department: 'Jay Nepal NGO',
      email: 'sobit@jaynepal.org',
      role: 'ADMIN',
      joining_date: '2024-01-01',
      whatsapp_number: '9779841000001',
      opening_balance: 10.0,
      is_approver: true,
    },
    {
      employee_id: 'JAV-002',
      full_name: 'Aayush Wasti',
      designation: 'Vice Director',
      department: 'Jay Nepal NGO',
      email: 'aayush@jaynepal.org',
      role: 'STAFF',
      joining_date: '2024-01-01',
      whatsapp_number: '9779841000002',
      opening_balance: 10.0,
      is_approver: false,
    },

    // School of Social Development (SOSD) & IT Education
    {
      employee_id: 'JAV-003',
      full_name: 'Sajan Majhi',
      designation: 'Coordinator',
      department: 'School of Social Development (SOSD)',
      email: 'sajan@jaynepal.org',
      role: 'STAFF',
      joining_date: '2025-01-01',
      whatsapp_number: '9779841000003',
      opening_balance: 6.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 8.0,
      is_approver: false,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 4.0,
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
      opening_balance: 2.0,
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
      opening_balance: 2.0,
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
      opening_balance: 2.0,
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
      opening_balance: 2.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
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
      opening_balance: 0.0,
      monthly_paid_leave: 2.0,
    },
  ];

  // Map to hold created profiles
  const createdProfiles = new Map();

  // First pass: upsert Director Sobit Basnet to act as default approver
  const directorSobit = await prisma.profile.upsert({
    where: { email: 'sobit@jaynepal.org' },
    update: {
      employee_id: 'JAV-001',
      full_name: 'Sobit Basnet',
      designation: 'Director',
      department: 'Jay Nepal NGO',
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: defaultPasswordHash,
    },
    create: {
      employee_id: 'JAV-001',
      email: 'sobit@jaynepal.org',
      password_hash: adminPasswordHash,
      full_name: 'Sobit Basnet',
      phone: '+977 9841000001',
      whatsapp_number: '9779841000001',
      department: 'Jay Nepal NGO',
      designation: 'Director',
      joining_date: '2024-01-01',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  createdProfiles.set('JAV-001', directorSobit);

  // Second pass: Upsert all other personnel
  for (const emp of officialRoster) {
    if (emp.employee_id === 'JAV-001') continue;

    const pwdHash = emp.role === 'ADMIN' || emp.role === 'APPROVER' ? adminPasswordHash : staffPasswordHash;

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
        password_hash: defaultPasswordHash,
      },
      create: {
        employee_id: emp.employee_id,
        email: emp.email,
        password_hash: pwdHash,
        full_name: emp.full_name,
        phone: `+977 ${emp.whatsapp_number.slice(3)}`,
        whatsapp_number: emp.whatsapp_number,
        department: emp.department,
        designation: emp.designation,
        joining_date: emp.joining_date,
        role: emp.role,
        status: 'ACTIVE',
        approver_id: directorSobit.id,
      },
    });

    createdProfiles.set(emp.employee_id, profile);
  }

  console.log(`✓ Seeded ${officialRoster.length} official organization staff profiles`);

  // 4. Seed Opening Balances & 2026 Monthly Accruals for each staff member
  for (const emp of officialRoster) {
    const p = createdProfiles.get(emp.employee_id);
    if (!p) continue;

    // Opening Balance
    await prisma.leaveLedger.upsert({
      where: { dedup_key: `OPENING_${p.id}` },
      update: { amount: emp.opening_balance },
      create: {
        employee_id: p.id,
        transaction_type: 'OPENING_BALANCE',
        amount: emp.opening_balance,
        notes: `Opening leave balance baseline on joining (${emp.joining_date})`,
        dedup_key: `OPENING_${p.id}`,
        created_by: directorSobit.id,
      },
    });

    // January 2026 Accrual (+2 days)
    if (emp.joining_date <= '2026-01-31') {
      await prisma.leaveLedger.upsert({
        where: { dedup_key: `ACCRUAL_${p.id}_2026_1` },
        update: {},
        create: {
          employee_id: p.id,
          transaction_type: 'MONTHLY_ACCRUAL',
          amount: 2.0,
          accrual_year: 2026,
          accrual_month: 1,
          notes: 'January 2026 Monthly Paid Leave Accrual',
          dedup_key: `ACCRUAL_${p.id}_2026_1`,
          created_by: directorSobit.id,
        },
      });
    }

    // February 2026 Accrual (+2 days)
    if (emp.joining_date <= '2026-02-28') {
      await prisma.leaveLedger.upsert({
        where: { dedup_key: `ACCRUAL_${p.id}_2026_2` },
        update: {},
        create: {
          employee_id: p.id,
          transaction_type: 'MONTHLY_ACCRUAL',
          amount: 2.0,
          accrual_year: 2026,
          accrual_month: 2,
          notes: 'February 2026 Monthly Paid Leave Accrual',
          dedup_key: `ACCRUAL_${p.id}_2026_2`,
          created_by: directorSobit.id,
        },
      });
    }
  }

  console.log('✓ Seeded opening balances and monthly accruals for all personnel');

  // 5. Seed a Sample Pending Request from Sajan Majhi (Handover to Aavash Poudel)
  const sajanProfile = createdProfiles.get('JAV-003');
  const aavashProfile = createdProfiles.get('JAV-004');

  if (sajanProfile && aavashProfile) {
    const existingPending = await prisma.leaveRequest.findFirst({
      where: { employee_id: sajanProfile.id, status: 'PENDING' },
    });

    if (!existingPending) {
      await prisma.leaveRequest.create({
        data: {
          employee_id: sajanProfile.id,
          start_date: '2026-10-04', // Sunday
          end_date: '2026-10-06',   // Tuesday
          calculated_days: 3.0,
          handover_employee_id: aavashProfile.id,
          reason: 'SOSD Community engagement & education program planning in Sindhupalchok',
          contact_during_leave: '+977 9841000003',
          status: 'PENDING',
        },
      });
      console.log('✓ Seeded sample pending leave request for Sajan Majhi');
    }
  }

  // 6. Seed an Approved Leave for Dr. Bikesh Shrestha (Hospital)
  const bikeshProfile = createdProfiles.get('JAV-007');
  const sudipProfile = createdProfiles.get('JAV-010');

  if (bikeshProfile && sudipProfile) {
    const existingApproved = await prisma.leaveRequest.findFirst({
      where: { employee_id: bikeshProfile.id, status: 'APPROVED' },
    });

    if (!existingApproved) {
      const appLeave = await prisma.leaveRequest.create({
        data: {
          employee_id: bikeshProfile.id,
          start_date: '2026-09-28', // Monday
          end_date: '2026-09-29',   // Tuesday
          calculated_days: 2.0,
          handover_employee_id: sudipProfile.id,
          reason: 'Medical CME conference on primary trauma care in Kathmandu',
          status: 'APPROVED',
          approved_by: directorSobit.id,
          approved_at: new Date('2026-09-20T10:00:00Z'),
          approval_remarks: 'Approved by Director Sobit Basnet. Sudip Basnet (HA) will cover clinical shifts.',
        },
      });

      await prisma.leaveLedger.create({
        data: {
          employee_id: bikeshProfile.id,
          transaction_type: 'APPROVED_LEAVE_DEBIT',
          amount: -2.0,
          leave_request_id: appLeave.id,
          notes: `Approved leave debit for CME conference (${appLeave.start_date} to ${appLeave.end_date})`,
          dedup_key: `DEBIT_${appLeave.id}`,
          created_by: directorSobit.id,
        },
      });
      console.log('✓ Seeded sample approved leave for Dr. Bikesh Shrestha');
    }
  }

  console.log('--- Official Seed Execution Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
