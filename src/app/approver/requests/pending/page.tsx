import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PortalLayout } from '@/components/PortalLayout';
import { ApproverRequestActions } from '@/components/ApproverRequestActions';
import { Clock, ArrowLeft } from 'lucide-react';

export default async function PendingRequestsQueuePage() {
  const user = await requireRole(['APPROVER', 'ADMIN']);

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
  });

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/approver/dashboard"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pending Leave Applications ({pendingRequests.length})
            </h1>
            <p className="text-sm text-slate-500">
              Review, approve, or reject employee leave submissions with full operational context
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <ApproverRequestActions requests={pendingRequests} />
        </div>
      </div>
    </PortalLayout>
  );
}
