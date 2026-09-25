import React from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { getEmployeeBalance } from '@/lib/balance';
import { prisma } from '@/lib/prisma';
import { PortalLayout } from '@/components/PortalLayout';
import { SummaryCards } from '@/components/SummaryCards';
import { StatusBadge } from '@/components/StatusBadge';
import { CalendarPlus, ArrowRight, History, Calendar, CheckCircle, Clock } from 'lucide-react';

export default async function StaffDashboardPage() {
  const user = await requireAuth();
  const balance = await getEmployeeBalance(user.id);

  const recentRequests = await prisma.leaveRequest.findMany({
    where: { employee_id: user.id },
    include: {
      handover_employee: { select: { full_name: true } },
    },
    orderBy: { requested_at: 'desc' },
    take: 5,
  });

  const recentLedger = await prisma.leaveLedger.findMany({
    where: { employee_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 4,
  });

  const upcomingApprovedLeave = await prisma.leaveRequest.findFirst({
    where: {
      employee_id: user.id,
      status: 'APPROVED',
      start_date: { gte: new Date().toISOString().slice(0, 10) },
    },
    orderBy: { start_date: 'asc' },
  });

  return (
    <PortalLayout user={user} portalType="staff">
      <div className="space-y-6">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user.full_name.split(' ')[0]}!
            </h1>
            <p className="text-sm text-slate-500">
              {user.designation} &bull; {user.department} (Staff ID: {user.employee_id})
            </p>
          </div>

          <div>
            <Link
              href="/leave/apply"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </Link>
          </div>
        </div>

        {/* Notice for Upcoming Approved Leave */}
        {upcomingApprovedLeave && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-sm">Upcoming Approved Leave</div>
              <div className="text-xs text-emerald-800 mt-0.5">
                You have approved leave scheduled from <strong>{upcomingApprovedLeave.start_date}</strong> to{' '}
                <strong>{upcomingApprovedLeave.end_date}</strong> ({upcomingApprovedLeave.calculated_days} working days).
              </div>
            </div>
          </div>
        )}

        {/* 5 Core Leave Metric Cards */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Paid Leave Summary
            </h2>
            <Link
              href="/leave/ledger"
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" />
              <span>View Leave Ledger</span>
            </Link>
          </div>
          <SummaryCards balance={balance} />
        </section>

        {/* Grid: Recent Requests & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Left Column: Recent Leave Requests (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-base">Recent Leave Requests</h3>
              </div>
              <Link
                href="/leave/requests"
                className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No leave requests found</p>
                <p className="text-xs text-slate-500 mt-1">
                  You haven&apos;t submitted any leave requests yet.
                </p>
                <Link
                  href="/leave/apply"
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Apply Now</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {req.start_date} &rarr; {req.end_date}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {req.calculated_days} {req.calculated_days === 1 ? 'day' : 'days'}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                        Reason: {req.reason}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Handover: {req.handover_employee.full_name} &bull; Applied on{' '}
                        {new Date(req.requested_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Link
                        href={`/leave/requests#req-${req.id}`}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-slate-200 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Recent Ledger Activity (1 Col) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-base">Leave Ledger</h3>
              </div>
              <Link
                href="/leave/ledger"
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                All Transactions
              </Link>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {recentLedger.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No ledger transactions recorded yet.
                </p>
              ) : (
                recentLedger.map((entry) => {
                  const isCredit = entry.amount > 0;
                  return (
                    <div key={entry.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {entry.notes}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold flex-shrink-0 ${
                          isCredit ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isCredit ? `+${entry.amount}` : entry.amount} d
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Monthly entitlement: <strong>2.00 days</strong> every active month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
