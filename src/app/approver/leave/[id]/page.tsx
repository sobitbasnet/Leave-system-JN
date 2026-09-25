import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ApproverRequestActions } from '@/components/ApproverRequestActions';
import { ArrowLeft, ShieldCheck, UserCheck, Calendar, Info, Phone } from 'lucide-react';

export default async function LeaveReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(['APPROVER', 'ADMIN']);

  const req = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: {
      employee: true,
      handover_employee: true,
      approver: true,
    },
  });

  if (!req) {
    notFound();
  }

  const balance = await getEmployeeBalance(req.employee_id);
  const projectedBalance = Math.round((balance.currentBalance - req.calculated_days) * 100) / 100;

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/approver/dashboard"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Review Leave Application
            </h1>
            <p className="text-sm text-slate-500">
              Direct review portal for leave request
            </p>
          </div>
        </div>

        {/* Request Inspection & Decision Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                {req.employee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{req.employee.full_name}</h2>
                <p className="text-xs text-slate-500">
                  {req.employee.designation} &bull; {req.employee.department}
                </p>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Staff ID: {req.employee.employee_id}
                </div>
              </div>
            </div>

            <div>
              <StatusBadge status={req.status} size="md" />
            </div>
          </div>

          {/* Leave Dates & Balance Impact Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                Leave Dates
              </span>
              <span className="font-bold text-slate-900">
                {req.start_date} &rarr; {req.end_date}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                Requested Days
              </span>
              <span className="font-extrabold text-blue-700 text-base">
                {req.calculated_days} Working Day(s)
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                Current Balance
              </span>
              <span className="font-bold text-slate-900">
                {balance.currentBalance} Days{' '}
                <span className="text-slate-500 font-normal">
                  (&rarr; {projectedBalance} if approved)
                </span>
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Responsibility Handover Colleague
              </span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span className="font-medium text-slate-800">
                  {req.handover_employee.full_name} ({req.handover_employee.department})
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Reason for Leave
              </span>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap">
                {req.reason}
              </div>
            </div>

            {req.contact_during_leave && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Contact During Leave
                </span>
                <span className="font-semibold text-slate-800">{req.contact_during_leave}</span>
              </div>
            )}

            {req.additional_notes && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Additional Notes
                </span>
                <span className="text-slate-700">{req.additional_notes}</span>
              </div>
            )}
          </div>

          {/* Action Area if Still Pending */}
          {req.status === 'PENDING' ? (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Executive Action
              </h3>
              <ApproverRequestActions requests={[req]} />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              This request was previously finalized as <strong>{req.status}</strong>.
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
