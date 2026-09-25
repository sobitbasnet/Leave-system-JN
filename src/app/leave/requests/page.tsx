'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge, LeaveTypeBadge } from '@/components/StatusBadge';
import {
  FileText,
  CalendarPlus,
  Filter,
  XCircle,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface LeaveRequestItem {
  id: string;
  start_date: string;
  end_date: string;
  calculated_days: number;
  leave_type?: string;
  reason: string;
  contact_during_leave?: string;
  additional_notes?: string;
  attachment_url?: string;
  status: string;
  requested_at: string;
  approved_at?: string;
  approval_remarks?: string;
  rejected_at?: string;
  rejection_reason?: string;
  cancelled_at?: string;
  handover_employee: {
    id: string;
    full_name: string;
    department: string;
    designation: string;
  };
  approver?: {
    id: string;
    full_name: string;
  };
}

export default function MyRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/leave/requests');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setRequests(data.requests || []);

      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest(id: string) {
    if (!confirm('Are you sure you want to cancel this pending leave request?')) {
      return;
    }

    setCancellingId(id);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/leave/${id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to cancel leave request.' });
      } else {
        setActionFeedback({ type: 'success', message: 'Leave request cancelled successfully.' });
        setSelectedRequest(null);
        await fetchData();
      }
    } catch {
      setActionFeedback({ type: 'error', message: 'Network error cancelling leave request.' });
    } finally {
      setCancellingId(null);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading leave records...</div>
      </div>
    );
  }

  const filteredRequests =
    statusFilter === 'ALL'
      ? requests
      : requests.filter((r) => r.status.toUpperCase() === statusFilter);

  return (
    <PortalLayout user={user} portalType="staff">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Leave Requests
            </h1>
            <p className="text-sm text-slate-500">
              Complete history of your requested, approved, and cancelled leaves
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

        {/* Feedback message */}
        {actionFeedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL'
                ? `All Requests (${requests.length})`
                : `${st.charAt(0) + st.slice(1).toLowerCase()} (${
                    requests.filter((r) => r.status.toUpperCase() === st).length
                  })`}
            </button>
          ))}
        </div>

        {/* Desktop Table & Mobile Cards */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No requests found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              There are no leave requests matching your selected filter.
            </p>
            <div className="mt-5">
              <Link
                href="/leave/apply"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Submit Leave Request</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Handover Colleague</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Requested On</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {req.start_date} <span className="text-slate-400 font-normal">&rarr;</span>{' '}
                        {req.end_date}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <LeaveTypeBadge type={req.leave_type} />
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {req.calculated_days} {req.calculated_days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        <div className="font-medium">{req.handover_employee.full_name}</div>
                        <div className="text-xs text-slate-400">{req.handover_employee.designation}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(req.requested_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          View Details
                        </button>
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={cancellingId === req.id}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-md transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (360px+) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      {req.start_date} &rarr; {req.end_date}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Working Days:</span>
                      <span className="font-bold text-slate-800">{req.calculated_days} days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Handover To:</span>
                      <span className="font-medium text-slate-700">
                        {req.handover_employee.full_name}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                    <span className="font-semibold text-slate-700">Reason: </span>
                    {req.reason}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Applied:{' '}
                      {new Date(req.requested_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md"
                      >
                        Details
                      </button>
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-md"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Request Detail Inspection Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Leave Request Details</h3>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Requested Duration
                  </div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedRequest.start_date} to {selectedRequest.end_date}
                  </div>
                  <div className="text-xs text-blue-700 font-semibold">
                    {selectedRequest.calculated_days} net working leave day(s)
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Handover Colleague:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.handover_employee.full_name} ({selectedRequest.handover_employee.department})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Reason for Leave:</span>
                  <div className="p-3 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 mt-1 whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </div>
                </div>

                {selectedRequest.contact_during_leave && (
                  <div>
                    <span className="text-slate-500 font-medium block">Contact During Leave:</span>
                    <span className="font-semibold text-slate-800">{selectedRequest.contact_during_leave}</span>
                  </div>
                )}

                {selectedRequest.additional_notes && (
                  <div>
                    <span className="text-slate-500 font-medium block">Additional Notes:</span>
                    <span className="text-slate-700">{selectedRequest.additional_notes}</span>
                  </div>
                )}

                {selectedRequest.attachment_url && (
                  <div>
                    <span className="text-slate-500 font-medium block">Supporting Document:</span>
                    <a
                      href={selectedRequest.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline font-medium"
                    >
                      Open Attached Document &rarr;
                    </a>
                  </div>
                )}

                {selectedRequest.status === 'APPROVED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                    <div className="font-bold">Approved by Administrative Leadership</div>
                    {selectedRequest.approver && (
                      <div>Approver: {selectedRequest.approver.full_name}</div>
                    )}
                    {selectedRequest.approval_remarks && (
                      <div>Remarks: {selectedRequest.approval_remarks}</div>
                    )}
                    {selectedRequest.approved_at && (
                      <div className="text-[11px] text-emerald-700">
                        Date: {new Date(selectedRequest.approved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {selectedRequest.status === 'REJECTED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="font-bold">Leave Request Rejected</div>
                    {selectedRequest.rejection_reason && (
                      <div>Reason: {selectedRequest.rejection_reason}</div>
                    )}
                    {selectedRequest.rejected_at && (
                      <div className="text-[11px] text-rose-700">
                        Date: {new Date(selectedRequest.rejected_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {selectedRequest.status === 'PENDING' ? (
                  <button
                    onClick={() => handleCancelRequest(selectedRequest.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                  >
                    Cancel This Request
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedRequest(null)}
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
