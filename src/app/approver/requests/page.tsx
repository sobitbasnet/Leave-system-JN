'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge, LeaveTypeBadge } from '@/components/StatusBadge';
import {
  ListTodo,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function AllLeaveRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) router.push('/approver/login');
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => router.push('/approver/login'));

    fetchRequests();
  }, [router]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);

        const deps = Array.from(
          new Set((data.requests || []).map((r: any) => r.employee.department))
        ) as string[];
        setDepartments(deps.sort());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status.toUpperCase() !== statusFilter) return false;
    if (departmentFilter !== 'ALL' && r.employee.department !== departmentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.employee.full_name.toLowerCase().includes(q);
      const matchId = r.employee.employee_id.toLowerCase().includes(q);
      const matchReason = r.reason.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchReason) return false;
    }
    return true;
  });

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              All Organization Leave Requests
            </h1>
            <p className="text-sm text-slate-500">
              Master repository of all leave submissions, approvals, rejections, and cancellations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export/csv?type=requests"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff name, ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Master Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length} of {requests.length} total request(s)</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading leave requests...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No leave requests match your search filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Leave Period</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Handover</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{r.employee.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{r.employee.employee_id}</div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <LeaveTypeBadge type={r.leave_type} />
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-xs">{r.employee.department}</td>
                      <td className="py-4 px-4 font-medium text-slate-800 whitespace-nowrap text-xs">
                        {r.start_date} <span className="text-slate-400">&rarr;</span> {r.end_date}
                      </td>
                      <td className="py-4 px-4 font-bold text-blue-700 whitespace-nowrap">
                        {r.calculated_days} d
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600">
                        {r.handover_employee.full_name}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(r.requested_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReq(r)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedReq && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Leave Request Details</h3>
                <StatusBadge status={selectedReq.status} />
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Staff Member
                  </div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedReq.employee.full_name} ({selectedReq.employee.employee_id})
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedReq.employee.designation} &bull; {selectedReq.employee.department}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <div>
                    <span className="text-slate-500 text-xs block">Duration:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedReq.start_date} to {selectedReq.end_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Working Leave Days:</span>
                    <span className="font-extrabold text-blue-700 text-base">
                      {selectedReq.calculated_days} Days
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Handover Colleague:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReq.handover_employee.full_name} ({selectedReq.handover_employee.department})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Reason for Leave:</span>
                  <div className="p-3 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 mt-1 whitespace-pre-wrap">
                    {selectedReq.reason}
                  </div>
                </div>

                {selectedReq.contact_during_leave && (
                  <div>
                    <span className="text-slate-500 font-medium block">Contact During Leave:</span>
                    <span className="font-semibold text-slate-800">{selectedReq.contact_during_leave}</span>
                  </div>
                )}

                {selectedReq.additional_notes && (
                  <div>
                    <span className="text-slate-500 font-medium block">Additional Notes:</span>
                    <span className="text-slate-700">{selectedReq.additional_notes}</span>
                  </div>
                )}

                {selectedReq.status === 'APPROVED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                    <div className="font-bold">Approved</div>
                    {selectedReq.approver && <div>By: {selectedReq.approver.full_name}</div>}
                    {selectedReq.approval_remarks && <div>Remarks: {selectedReq.approval_remarks}</div>}
                    {selectedReq.approved_at && (
                      <div className="text-[11px] text-emerald-700">
                        Date: {new Date(selectedReq.approved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {selectedReq.status === 'REJECTED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="font-bold">Rejected</div>
                    {selectedReq.rejection_reason && <div>Reason: {selectedReq.rejection_reason}</div>}
                    {selectedReq.rejected_at && (
                      <div className="text-[11px] text-rose-700">
                        Date: {new Date(selectedReq.rejected_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/approver/staff/${selectedReq.employee.id}`}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  View Staff Leave Profile &rarr;
                </Link>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
