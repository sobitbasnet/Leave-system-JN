import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PortalLayout } from '@/components/PortalLayout';
import { CalendarDays, ArrowLeft, Shield, Users, CheckCircle } from 'lucide-react';

export default async function TeamLeaveCalendarPage() {
  const user = await requireRole(['APPROVER', 'ADMIN']);

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
      employee: {
        select: {
          id: true,
          full_name: true,
          department: true,
          designation: true,
        },
      },
      handover_employee: {
        select: { full_name: true },
      },
    },
    orderBy: { start_date: 'asc' },
  });

  // Group approved leaves by month
  const groupedLeaves: { [key: string]: typeof approvedLeaves } = {};
  for (const leave of approvedLeaves) {
    const monthKey = leave.start_date.slice(0, 7); // YYYY-MM
    if (!groupedLeaves[monthKey]) {
      groupedLeaves[monthKey] = [];
    }
    groupedLeaves[monthKey].push(leave);
  }

  const sortedMonths = Object.keys(groupedLeaves).sort();

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approver/dashboard"
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Team Leave Calendar
              </h1>
              <p className="text-sm text-slate-500">
                Operational schedule of approved leaves across all organization departments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold">
            <Shield className="w-4 h-4 text-blue-700 flex-shrink-0" />
            <span>Privacy Guard: Confidential reasons are hidden on shared calendar</span>
          </div>
        </div>

        {/* Monthly Timeline View */}
        <div className="space-y-6">
          {sortedMonths.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">No approved leaves scheduled</p>
              <p className="text-xs text-slate-500 mt-1">
                Approved leave requests will appear on this organizational timeline.
              </p>
            </div>
          ) : (
            sortedMonths.map((mKey) => {
              const [y, m] = mKey.split('-');
              const monthDate = new Date(Number(y), Number(m) - 1, 1);
              const monthTitle = monthDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              });
              const monthLeaves = groupedLeaves[mKey];

              return (
                <div
                  key={mKey}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                      <CalendarDays className="w-4 h-4 text-blue-700" />
                      <span>{monthTitle}</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      {monthLeaves.length} scheduled leave(s)
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {monthLeaves.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {item.employee.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {item.employee.full_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.employee.designation} &bull; {item.employee.department}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Handover to: {item.handover_employee.full_name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="font-semibold text-xs sm:text-sm text-slate-900">
                              {item.start_date} <span className="text-slate-400">&rarr;</span>{' '}
                              {item.end_date}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Duration: <strong>{item.calculated_days} working day(s)</strong>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                            Approved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
