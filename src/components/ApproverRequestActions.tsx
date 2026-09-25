'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge, LeaveTypeBadge } from '@/components/StatusBadge';
import { Check, X, Eye, Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface PendingRequestProps {
  requests: any[];
  onActionComplete?: () => void;
}

export function ApproverRequestActions({ requests: initialRequests, onActionComplete }: PendingRequestProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'DETAILS' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  function openAction(req: any, type: 'APPROVE' | 'REJECT' | 'DETAILS') {
    setSelectedRequest(req);
    setActionType(type);
    setRemarks('');
    setRejectionReason('');
    setToastMsg(null);
  }

  function closeAction() {
    setSelectedRequest(null);
    setActionType(null);
  }

  async function handleConfirmApprove() {
    if (!selectedRequest) return;
    setSubmitting(true);
    setToastMsg(null);

    try {
      const res = await fetch(`/api/approver/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks }),
      });
      const data = await res.json();

      if (!res.ok) {
        setToastMsg({ type: 'error', text: data.error || 'Failed to approve leave request.' });
        setSubmitting(false);
        return;
      }

      setToastMsg({ type: 'success', text: `Leave for ${selectedRequest.employee.full_name} has been approved.` });
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      closeAction();
      router.refresh();
      if (onActionComplete) onActionComplete();
    } catch {
      setToastMsg({ type: 'error', text: 'Network error during approval.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReject() {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this leave request.');
      return;
    }

    setSubmitting(true);
    setToastMsg(null);

    try {
      const res = await fetch(`/api/approver/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setToastMsg({ type: 'error', text: data.error || 'Failed to reject leave request.' });
        setSubmitting(false);
        return;
      }

      setToastMsg({ type: 'success', text: `Leave request for ${selectedRequest.employee.full_name} rejected.` });
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      closeAction();
      router.refresh();
      if (onActionComplete) onActionComplete();
    } catch {
      setToastMsg({ type: 'error', text: 'Network error during rejection.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
        <p className="text-sm font-semibold text-slate-800">All caught up!</p>
        <p className="text-xs text-slate-500 mt-0.5">
          There are currently no pending leave requests awaiting approval.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`m-4 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Desktop Review Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Staff Member</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Leave Duration</th>
              <th className="py-3.5 px-4">Days</th>
              <th className="py-3.5 px-4">Handover Colleague</th>
              <th className="py-3.5 px-4">Reason</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/70 transition">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {req.employee.full_name
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{req.employee.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {req.employee.designation} &bull; {req.employee.department}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {req.employee.employee_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <LeaveTypeBadge type={req.leave_type} />
                </td>
                <td className="py-4 px-4 font-medium text-slate-800 whitespace-nowrap">
                  <div>
                    {req.start_date} <span className="text-slate-400">&rarr;</span> {req.end_date}
                  </div>
                </td>
                <td className="py-4 px-4 font-extrabold text-blue-700 whitespace-nowrap">
                  {req.calculated_days} d
                </td>
                <td className="py-4 px-4 text-slate-700">
                  <div className="font-medium text-xs">{req.handover_employee.full_name}</div>
                  <div className="text-[11px] text-slate-400">{req.handover_employee.department}</div>
                </td>
                <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate" title={req.reason}>
                  {req.reason}
                </td>
                <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                  {new Date(req.requested_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                  <button
                    onClick={() => openAction(req, 'DETAILS')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openAction(req, 'APPROVE')}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition inline-flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => openAction(req, 'REJECT')}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-md transition inline-flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Reject</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card Layout (360px+) */}
      <div className="lg:hidden divide-y divide-slate-100">
        {requests.map((req) => (
          <div key={req.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {req.employee.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block">
                    {req.employee.full_name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {req.employee.designation} &bull; {req.employee.department}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800">
                {req.calculated_days} days
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="font-semibold text-slate-800">
                  {req.start_date} to {req.end_date}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Handover: </span>
                <span className="font-medium text-slate-700">
                  {req.handover_employee.full_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Reason: </span>
                <span className="text-slate-700">{req.reason}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => openAction(req, 'DETAILS')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md"
              >
                Details
              </button>
              <button
                onClick={() => openAction(req, 'REJECT')}
                className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-100 rounded-md flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => openAction(req, 'APPROVE')}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-md flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation & Details Modals */}
      {selectedRequest && actionType === 'APPROVE' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-700 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Approve Leave Request</h3>
                <span className="text-xs text-slate-500">Atomic transactional balance deduction</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs sm:text-sm text-slate-700">
              <div>
                <span className="text-slate-400">Employee: </span>
                <span className="font-semibold text-slate-900">{selectedRequest.employee.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="font-semibold text-slate-900">
                  {selectedRequest.start_date} to {selectedRequest.end_date}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Working Days to Deduct: </span>
                <span className="font-extrabold text-blue-700">{selectedRequest.calculated_days} Day(s)</span>
              </div>
              <div>
                <span className="text-slate-400">Handover Person: </span>
                <span className="font-medium text-slate-800">{selectedRequest.handover_employee.full_name}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block">Reason:</span>
                <span className="text-slate-700">{selectedRequest.reason}</span>
              </div>
            </div>

            {selectedRequest.leave_type === 'ADVANCE' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">Advance Leave (अग्रीम बिदा):</span>
                  This request is for emergency advance leave. Approving will debit the leave ledger and may take the employee's balance negative, which will be recovered automatically on the 30th of future months.
                </div>
              </div>
            )}

            <div>
              <label htmlFor="remarks" className="block text-xs font-semibold text-slate-700 mb-1">
                Approval Remarks / Comments (Optional)
              </label>
              <textarea
                id="remarks"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Approved. Colleague Sobit will lead youth outreach activities."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAction}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                {submitting ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && actionType === 'REJECT' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Reject Leave Request</h3>
                <span className="text-xs text-slate-500">Zero leave balance deduction will occur</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting request for <strong>{selectedRequest.employee.full_name}</strong> (
              {selectedRequest.calculated_days} days). Please provide a mandatory reason.
            </p>

            <div>
              <label htmlFor="rejectionReason" className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this leave application cannot be approved at this time"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAction}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submitting || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Inspection Modal */}
      {selectedRequest && actionType === 'DETAILS' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Leave Request Details</h3>
              <StatusBadge status={selectedRequest.status} />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Employee
                </div>
                <div className="font-bold text-slate-900 text-base">
                  {selectedRequest.employee.full_name} ({selectedRequest.employee.employee_id})
                </div>
                <div className="text-xs text-slate-500">
                  {selectedRequest.employee.designation} &bull; {selectedRequest.employee.department}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <span className="text-slate-500 text-xs block">Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRequest.start_date} to {selectedRequest.end_date}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Working Leave Days:</span>
                  <span className="font-extrabold text-blue-700 text-base">
                    {selectedRequest.calculated_days} Days
                  </span>
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
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/approver/staff/${selectedRequest.employee.id}`}
                className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>View Full Employee Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={closeAction}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
