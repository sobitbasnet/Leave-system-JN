import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEmployeeBalance } from '@/lib/balance';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      employee_id: true,
      email: true,
      full_name: true,
      phone: true,
      whatsapp_number: true,
      department: true,
      designation: true,
      joining_date: true,
      role: true,
      status: true,
      requires_password_change: true,
    },
  });

  const balance = await getEmployeeBalance(user.id);

  return NextResponse.json({
    user: profile,
    balance,
  });
}
