import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireRole(['APPROVER', 'ADMIN']);

    const todayIso = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthStartIso = `${currentYear}-${currentMonth}-01`;
    const monthEndIso = `${currentYear}-${currentMonth}-31`;

    // 1. Total Active Staff
    const totalActiveStaff = await prisma.profile.count({
      where: { status: 'ACTIVE' },
    });

    // 2. Pending Requests Count
    const pendingRequestsCount = await prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    });

    // 3. Staff Currently on Leave Today
    const currentlyOnLeave = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        start_date: { lte: todayIso },
        end_date: { gte: todayIso },
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            department: true,
            designation: true,
            profile_photo_url: true,
          },
        },
      },
    });

    // 4. Upcoming Leaves This Month
    const upcomingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        start_date: { gt: todayIso, lte: monthEndIso },
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { start_date: 'asc' },
      take: 10,
    });

    // 5. Leave Days Taken This Month
    const thisMonthApproved = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        start_date: { gte: monthStartIso, lte: monthEndIso },
      },
      select: { calculated_days: true },
    });
    const leaveDaysThisMonth = thisMonthApproved.reduce((sum, r) => sum + r.calculated_days, 0);

    // 6. Recent Pending Queue for quick review
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            id: true,
            employee_id: true,
            full_name: true,
            department: true,
            designation: true,
            whatsapp_number: true,
          },
        },
        handover_employee: {
          select: { id: true, full_name: true, department: true },
        },
      },
      orderBy: { requested_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalActiveStaff,
        pendingRequestsCount,
        currentlyOnLeaveCount: currentlyOnLeave.length,
        upcomingLeavesCount: upcomingLeaves.length,
        leaveDaysThisMonth,
      },
      currentlyOnLeave,
      upcomingLeaves,
      pendingRequests,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch executive stats.' }, { status: 500 });
  }
}
