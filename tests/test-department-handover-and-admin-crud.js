const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('=====================================================');
  console.log('TEST 1: DEPARTMENT-BASED HANDOVER FILTERING');
  console.log('=====================================================');

  // Test 1A: Hospital staff login
  const hospStaff = await prisma.profile.findFirst({
    where: { department: 'Bodgaun Primary Hospital', role: 'STAFF' },
  });
  console.log(`Hospital staff: ${hospStaff.full_name} (${hospStaff.employee_id}, ${hospStaff.department})`);

  const hospLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: hospStaff.employee_id, password: 'Bodgaun123' }),
  });
  const hospCookie = hospLoginRes.headers.get('set-cookie');
  console.log(`Hospital staff login status: ${hospLoginRes.status}`);

  const hospReqRes = await fetch('http://localhost:3000/api/leave/requests', {
    headers: { Cookie: hospCookie },
  });
  const hospData = await hospReqRes.json();
  const hospColleagues = hospData.activeColleagues;
  console.log(`Hospital staff handover colleagues count: ${hospColleagues.length}`);

  const hospInvalid = hospColleagues.filter((c) => !c.department.toLowerCase().includes('hospital'));
  if (hospInvalid.length > 0) {
    throw new Error(`FAIL: Hospital staff saw non-hospital colleagues: ${JSON.stringify(hospInvalid)}`);
  }
  console.log(`✓ PASS: Hospital staff ONLY sees Hospital staff! (${hospColleagues.length} colleagues)`);
  console.log(`Sample: ${hospColleagues.map((c) => c.full_name).slice(0, 3).join(', ')}...`);

  // Test 1B: IT staff login
  const itStaff = await prisma.profile.findFirst({
    where: { department: 'IT Education Program', role: 'STAFF' },
  });
  console.log(`\nIT staff: ${itStaff.full_name} (${itStaff.employee_id}, ${itStaff.department})`);

  const itLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: itStaff.employee_id, password: 'Bodgaun123' }),
  });
  const itCookie = itLoginRes.headers.get('set-cookie');
  console.log(`IT staff login status: ${itLoginRes.status}`);

  const itReqRes = await fetch('http://localhost:3000/api/leave/requests', {
    headers: { Cookie: itCookie },
  });
  const itData = await itReqRes.json();
  const itColleagues = itData.activeColleagues;
  console.log(`IT staff handover colleagues count: ${itColleagues.length}`);

  const itInvalid = itColleagues.filter(
    (c) => !c.department.toLowerCase().includes('it')
  );
  if (itInvalid.length > 0) {
    throw new Error(`FAIL: IT staff saw non-IT colleagues: ${JSON.stringify(itInvalid)}`);
  }
  console.log(`✓ PASS: IT staff ONLY sees IT staff! (${itColleagues.length} colleagues)`);
  console.log(`List: ${itColleagues.map((c) => `${c.full_name} (${c.designation})`).join(', ')}`);

  // Test 1C: SOSD staff login
  const sosdStaff = await prisma.profile.findFirst({
    where: { department: 'School of Social Development (SOSD)', role: 'STAFF' },
  });
  console.log(`\nSOSD staff: ${sosdStaff.full_name} (${sosdStaff.employee_id}, ${sosdStaff.department})`);

  const sosdLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: sosdStaff.employee_id, password: 'Bodgaun123' }),
  });
  const sosdCookie = sosdLoginRes.headers.get('set-cookie');
  console.log(`SOSD staff login status: ${sosdLoginRes.status}`);

  const sosdReqRes = await fetch('http://localhost:3000/api/leave/requests', {
    headers: { Cookie: sosdCookie },
  });
  const sosdData = await sosdReqRes.json();
  const sosdColleagues = sosdData.activeColleagues;
  console.log(`SOSD staff handover colleagues count: ${sosdColleagues.length}`);

  const sosdInvalid = sosdColleagues.filter(
    (c) => !c.department.toLowerCase().includes('social development') && !c.department.toLowerCase().includes('sosd')
  );
  if (sosdInvalid.length > 0) {
    throw new Error(`FAIL: SOSD staff saw non-SOSD colleagues: ${JSON.stringify(sosdInvalid)}`);
  }
  console.log(`✓ PASS: SOSD staff ONLY sees SOSD staff! (${sosdColleagues.length} colleagues)`);
  console.log(`Sample: ${sosdColleagues.map((c) => c.full_name).slice(0, 4).join(', ')}...`);

  console.log('\n=====================================================');
  console.log('TEST 2: ADMIN EDIT AND DELETE (CRUD)');
  console.log('=====================================================');

  // Admin Login
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrId: 'admin@jaynepal.org', password: 'admin' }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  console.log(`Admin login status: ${adminLoginRes.status}`);

  // Create temporary staff
  const testId = `JAV-TST-${Date.now().toString().slice(-4)}`;
  const testEmail = `temp.${Date.now()}@jaynepal.org`;
  const createRes = await fetch('http://localhost:3000/api/approver/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      employeeId: testId,
      fullName: 'Temporary Verification Staff',
      email: testEmail,
      phone: '+977 9840000000',
      whatsappNumber: '9779840000000',
      department: 'IT Education Program',
      designation: 'Intern',
      joiningDate: '2026-09-01',
      role: 'STAFF',
      openingBalance: 4.5,
      monthlyPaidLeave: 1.0,
      password: 'TemporaryPass123!',
    }),
  });
  const createData = await createRes.json();
  console.log(`Staff Create status: ${createRes.status}`, createData.success);
  if (!createRes.ok || !createData.employee) {
    throw new Error(`Failed to create employee: ${JSON.stringify(createData)}`);
  }
  const createdEmpId = createData.employee.id;

  // Edit temporary staff
  const editRes = await fetch('http://localhost:3000/api/approver/employees', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      id: createdEmpId,
      employeeId: testId,
      fullName: 'Updated Temporary Staff',
      email: testEmail,
      phone: '+977 9841111111',
      whatsappNumber: '9779841111111',
      department: 'Bodgaun Primary Hospital',
      designation: 'Promoted Assistant',
      joiningDate: '2026-09-01',
      role: 'STAFF',
      status: 'ACTIVE',
      monthlyPaidLeave: 2.0,
      targetBalance: 7.0,
      adjustmentNotes: 'Verified promotion balance adjustment',
    }),
  });
  const editData = await editRes.json();
  console.log(`Staff Edit status: ${editRes.status}`, editData.success);
  if (!editRes.ok || !editData.employee) {
    throw new Error(`Failed to edit employee: ${JSON.stringify(editData)}`);
  }

  // Verify DB updated
  const updatedInDb = await prisma.profile.findUnique({
    where: { id: createdEmpId },
    include: { ledger_entries: true },
  });
  if (
    updatedInDb.full_name !== 'Updated Temporary Staff' ||
    updatedInDb.department !== 'Bodgaun Primary Hospital' ||
    updatedInDb.designation !== 'Promoted Assistant' ||
    updatedInDb.monthly_paid_leave !== 2.0
  ) {
    throw new Error(`FAIL: Employee fields were not properly updated in DB`);
  }
  console.log(`✓ PASS: Employee edit updated full_name, department, designation, and monthly_paid_leave!`);

  // Delete temporary staff
  const delRes = await fetch(`http://localhost:3000/api/approver/employees?id=${createdEmpId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const delData = await delRes.json();
  console.log(`Staff Delete status: ${delRes.status}`, delData.success);
  if (!delRes.ok || !delData.success) {
    throw new Error(`Failed to delete employee: ${JSON.stringify(delData)}`);
  }

  // Verify deleted from DB
  const deletedInDb = await prisma.profile.findUnique({ where: { id: createdEmpId } });
  if (deletedInDb !== null) {
    throw new Error(`FAIL: Employee still exists in DB after deletion!`);
  }
  console.log(`✓ PASS: Employee permanently and cleanly deleted by Admin!`);

  console.log('\n=====================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED');
  console.log('=====================================================');
}

runTests()
  .catch((err) => {
    console.error('TEST ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
