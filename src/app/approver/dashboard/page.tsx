import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Users,
  Clock,
  UserCheck,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ApproverRequestActions } from '@/components/ApproverRequestActions';

export default async function ApproverDashboardPage() {
  const user = await requireRole(['APPROVER', 'ADMIN']);

  const todayIso = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const monthStartIso = `${currentYear}-${currentMonth}-01`;
  const monthEndIso = `${currentYear}-${currentMonth}-31`;

  // 1. Stats
  const totalActiveStaff = await prisma.profile.count({ where: { status: 'ACTIVE' } });
  const pendingRequestsCount = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });

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
        },
      },
      handover_employee: { select: { full_name: true } },
    },
  });

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
    take: 6,
  });

  const thisMonthApproved = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      start_date: { gte: monthStartIso, lte: monthEndIso },
    },
    select: { calculated_days: true },
  });
  const leaveDaysThisMonth = thisMonthApproved.reduce((sum, r) => sum + r.calculated_days, 0);

  // 2. Pending Requests Queue
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
    take: 8,
  });

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        {/* Welcome & Quick Management Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                Executive & Approver Console
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Organization Leave Operations
            </h1>
            <p className="text-sm text-slate-500">
              Jaynepal Action Volunteers &bull; Administrative oversight and leave approvals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/approver/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Run Monthly Accrual</span>
            </Link>
            <Link
              href="/approver/employees"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff</span>
            </Link>
          </div>
        </div>

        {/* 5 Executive Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Staff
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{totalActiveStaff}</div>
            <p className="mt-1 text-xs text-slate-500">Enrolled active personnel</p>
          </div>

          <div className="bg-white border-2 border-amber-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Requests
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-amber-800">
              {pendingRequestsCount}
            </div>
            <p className="mt-1 text-xs text-slate-600">Awaiting executive decision</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                On Leave Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-indigo-700">
              {currentlyOnLeave.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">Staff currently absent</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Upcoming Leaves
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-emerald-700">
              {upcomingLeaves.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">Scheduled this month</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leaves Taken (Month)
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {leaveDaysThisMonth} <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Organization total consumed</p>
          </div>
        </div>

        {/* Primary Review Queue: Pending Leave Requests */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-bold text-slate-900 text-base">
                Pending Leave Applications Awaiting Review ({pendingRequests.length})
              </h2>
            </div>
            <Link
              href="/approver/requests/pending"
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>Dedicated Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ApproverRequestActions requests={pendingRequests} />
        </div>

        {/* 2 Columns: Staff On Leave Today & Upcoming Leaves */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Currently on Leave */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Staff Currently on Leave</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {currentlyOnLeave.length} staff
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {currentlyOnLeave.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No staff members are on leave today. Full team is on duty!
                </div>
              ) : (
                currentlyOnLeave.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {item.employee.full_name}
                      </div>
                      <div className="text-slate-500">
                        {item.employee.designation} &bull; {item.employee.department}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Until {item.end_date} (Handover: {item.handover_employee.full_name})
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                      {item.calculated_days} days
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Leaves */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Scheduled Leaves</h3>
              </div>
              <Link
                href="/approver/calendar"
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Calendar View &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {upcomingLeaves.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No upcoming approved leaves for the remainder of this month.
                </div>
              ) : (
                upcomingLeaves.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {item.employee.full_name}
                      </div>
                      <div className="text-slate-500">{item.employee.department}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {item.start_date} to {item.end_date}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {item.calculated_days} days
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
