import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function bootstrapDatabase() {
  try {
    const count = await prisma.profile.count();
    if (count > 0) {
      return; // Already populated
    }

    console.log('🔄 Initializing empty database with official staff and admin accounts...');

    // 1. Organization Settings
    await prisma.organizationSettings.upsert({
      where: { id: 'default' },
      update: {},
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

    // 2. Nepali Public & Organization Holidays
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
        update: {},
        create: { ...h, active: true },
      });
    }

    const defaultPasswordHash = await bcrypt.hash('Bodgaun123', 10);
    const rootAdminPasswordHash = await bcrypt.hash('admin', 10);

    // Central Admin
    await prisma.profile.upsert({
      where: { email: 'admin@jaynepal.org' },
      update: {},
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

    // Director Sobit Basnet
    const director = await prisma.profile.upsert({
      where: { employee_id: 'JAV-001' },
      update: {},
      create: {
        employee_id: 'JAV-001',
        email: 'sobitb22@gmail.com',
        password_hash: defaultPasswordHash,
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

    // 32 Staff Members
    const roster = [
      { employee_id: 'JAV-002', full_name: 'Aayush Wasti', designation: 'Vice Director', department: 'Jay Nepal NGO', email: 'wastiaayush789@gmail.com', role: 'STAFF', joining_date: '2024-01-01', whatsapp_number: '9779841000002', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-003', full_name: 'Sajan Majhi', designation: 'Coordinator', department: 'School of Social Development (SOSD)', email: 'info.sobit@gmail.com', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000003', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-004', full_name: 'Aavash Paudel', designation: 'IT Teacher', department: 'IT Education Program', email: 'aavash@jaynepal.org', role: 'STAFF', joining_date: '2025-02-01', whatsapp_number: '9779841000004', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-005', full_name: 'Sarita Majhi', designation: 'Cleaner', department: 'School of Social Development (SOSD)', email: 'sarita.majhi@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000005', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-006', full_name: 'Tara Chandra Majhi', designation: 'Security Guard / Facility Support', department: 'School of Social Development (SOSD)', email: 'tarachandra@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000006', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-007', full_name: 'Dr. Bikesh Shrestha', designation: 'Medical Superintendent', department: 'Bodgaun Primary Hospital', email: 'bikesh@jaynepal.org', role: 'STAFF', joining_date: '2024-06-01', whatsapp_number: '9779841000007', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-008', full_name: 'Aastha Parajuli', designation: 'Lab Technician', department: 'Bodgaun Primary Hospital', email: 'aastha@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000008', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-009', full_name: 'Sudip Moktan', designation: 'Pharmacist', department: 'Bodgaun Primary Hospital', email: 'sudip.moktan@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000009', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-010', full_name: 'Sudip Basnet', designation: 'Health Assistant (HA)', department: 'Bodgaun Primary Hospital', email: 'sudip.basnet@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000010', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-011', full_name: 'Rakshya Pandeya', designation: 'Staff Nurse', department: 'Bodgaun Primary Hospital', email: 'rakshya@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000011', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-012', full_name: 'Sarita Majhi (A)', designation: 'Cashier & Administrative Reporting Assistant', department: 'Bodgaun Primary Hospital', email: 'sarita.admin@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000012', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-013', full_name: 'Bimal Majhi', designation: 'Area Lead', department: 'Bodgaun Primary Hospital', email: 'bimal@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000013', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-014', full_name: 'Insaan Majhi', designation: 'Maintenance Lead', department: 'Bodgaun Primary Hospital', email: 'insaan@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000014', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-015', full_name: 'Sarita Danuwar', designation: 'AHW', department: 'Bodgaun Primary Hospital', email: 'sarita.danuwar@jaynepal.org', role: 'STAFF', joining_date: '2025-03-01', whatsapp_number: '9779841000015', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-016', full_name: 'Sabina Rai Danuwar', designation: 'ANM', department: 'Bodgaun Primary Hospital', email: 'sabina@jaynepal.org', role: 'STAFF', joining_date: '2025-03-01', whatsapp_number: '9779841000016', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-017', full_name: 'Gorakh Gurdhami', designation: 'AHW', department: 'Bodgaun Primary Hospital', email: 'gorakh@jaynepal.org', role: 'STAFF', joining_date: '2025-03-01', whatsapp_number: '9779841000017', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-018', full_name: 'Maiya Neupane', designation: 'OH', department: 'Bodgaun Primary Hospital', email: 'maiya@jaynepal.org', role: 'STAFF', joining_date: '2025-04-01', whatsapp_number: '9779841000018', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-019', full_name: 'Datta Singh Karki', designation: 'Senior HA / Anesthesia Assistant', department: 'Bodgaun Primary Hospital', email: 'datta@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000019', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-020', full_name: 'Birag Acharya', designation: 'IT Teacher / Instructor', department: 'IT Education Program', email: 'birag@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000020', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-021', full_name: 'Subash Majhi', designation: 'IT Assistant', department: 'IT Education Program', email: 'subash@jaynepal.org', role: 'STAFF', joining_date: '2025-01-01', whatsapp_number: '9779841000021', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-022', full_name: 'Anita Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'anita.majhi@jaynepal.org', role: 'STAFF', joining_date: '2023-06-01', whatsapp_number: '9779841000022', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-023', full_name: 'Sundari Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'sundari.majhi@jaynepal.org', role: 'STAFF', joining_date: '2023-06-01', whatsapp_number: '9779841000023', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-024', full_name: 'Januka Majhi', designation: 'Senior Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'januka.majhi@jaynepal.org', role: 'STAFF', joining_date: '2022-01-16', whatsapp_number: '9779841000024', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-025', full_name: 'Sangita Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'sangita.majhi@jaynepal.org', role: 'STAFF', joining_date: '2025-02-02', whatsapp_number: '9779841000025', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-026', full_name: 'Kabita Parajuli', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'kabita.parajuli@jaynepal.org', role: 'STAFF', joining_date: '2026-02-08', whatsapp_number: '9779841000026', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-027', full_name: 'Ramila Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'ramila.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-05-19', whatsapp_number: '9779841000027', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-028', full_name: 'Alisha Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'alisha.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-04-28', whatsapp_number: '9779841000028', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-029', full_name: 'Badri Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'badri.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-05-01', whatsapp_number: '9779841000029', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-030', full_name: 'Sarjib Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'sarjib.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-04-01', whatsapp_number: '9779841000030', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-031', full_name: 'Sharmila Majhi', designation: 'Teacher / Staff', department: 'School of Social Development (SOSD)', email: 'sharmila.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-07-14', whatsapp_number: '9779841000031', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-032', full_name: 'Ujjwal Shrestha', designation: 'Coordinator / Teacher', department: 'School of Social Development (SOSD)', email: 'ujjwal.shrestha@jaynepal.org', role: 'STAFF', joining_date: '2026-03-10', whatsapp_number: '9779841000032', monthly_paid_leave: 2.0 },
      { employee_id: 'JAV-033', full_name: 'Yuwarani Majhi', designation: 'Support Staff / Assistant', department: 'School of Social Development (SOSD)', email: 'yuwarani.majhi@jaynepal.org', role: 'STAFF', joining_date: '2026-06-07', whatsapp_number: '9779841000033', monthly_paid_leave: 2.0 },
    ];

    for (const emp of roster) {
      await prisma.profile.upsert({
        where: { employee_id: emp.employee_id },
        update: {},
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
          approver_id: director.id,
          monthly_paid_leave: emp.monthly_paid_leave || 2.0,
        },
      });
    }

    console.log('✅ Automatic bootstrap completed: 33 profiles created with clean 0.00 balances.');
  } catch (error) {
    console.error('❌ Bootstrap error:', error);
  }
}
