'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  SlidersHorizontal,
  History,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Briefcase,
  Mail,
  Phone,
  MessageSquare,
  Edit3,
  Trash2,
} from 'lucide-react';
import { UserSession } from '@/lib/types';
import { STANDARD_DEPARTMENTS } from '@/lib/departments';

export default function EmployeeLeaveDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [balance, setBalance] = useState<any | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState('MANUAL_CREDIT');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Staff Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editMonthlyPaidLeave, setEditMonthlyPaidLeave] = useState('2.0');
  const [editNewPassword, setEditNewPassword] = useState('');

  // Delete Staff Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) router.push('/approver/login');
        return res.json();
      })
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => router.push('/approver/login'));

    fetchData();
  }, [params.id, router]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/approver/staff/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setBalance(data.balance);
        setLeaveRequests(data.leaveRequests || []);
        setLedger(data.ledger || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustNotes.trim()) {
      alert('A mandatory reason is required for any leave balance adjustment.');
      return;
    }
    if (!adjustAmount || Number(adjustAmount) === 0) {
      alert('Please specify a non-zero adjustment amount.');
      return;
    }

    setAdjusting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/approver/staff/${params.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: adjustType,
          amount: Number(adjustAmount),
          notes: adjustNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to adjust balance.' });
        setAdjusting(false);
        return;
      }

      setFeedback({ type: 'success', message: 'Leave balance adjusted successfully and recorded in ledger.' });
      setIsAdjustModalOpen(false);
      setAdjustNotes('');
      setAdjustAmount('');
      await fetchData();
    } catch {
      setFeedback({ type: 'error', message: 'Network error during adjustment.' });
    } finally {
      setAdjusting(false);
    }
  }

  function openEditModal() {
    if (!profile) return;
    setEditFullName(profile.full_name || '');
    setEditEmployeeId(profile.employee_id || '');
    setEditEmail(profile.email || '');
    setEditPhone(profile.phone || '');
    setEditWhatsapp(profile.whatsapp_number || '');
    setEditDepartment(profile.department || '');
    setEditDesignation(profile.designation || '');
    setEditJoiningDate(profile.joining_date || '');
    setEditRole(profile.role || 'STAFF');
    setEditStatus(profile.status || 'ACTIVE');
    setEditMonthlyPaidLeave(String(profile.monthly_paid_leave ?? 2.0));
    setEditNewPassword('');
    setModalError(null);
    setIsEditModalOpen(true);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmittingModal(true);
    setModalError(null);

    try {
      const res = await fetch('/api/approver/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          employeeId: editEmployeeId,
          fullName: editFullName,
          email: editEmail,
          phone: editPhone,
          whatsappNumber: editWhatsapp,
          department: editDepartment,
          designation: editDesignation,
          joiningDate: editJoiningDate,
          role: editRole,
          status: editStatus,
          monthlyPaidLeave: Number(editMonthlyPaidLeave) || 2.0,
          password: editNewPassword ? editNewPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Failed to update employee.');
        setSubmittingModal(false);
        return;
      }

      setFeedback({ type: 'success', message: `Staff profile for ${editFullName} updated successfully.` });
      setIsEditModalOpen(false);
      await fetchData();
    } catch {
      setModalError('Network error updating employee profile.');
    } finally {
      setSubmittingModal(false);
    }
  }

  async function handleDeleteProfile() {
    if (!profile) return;
    setSubmittingModal(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/approver/employees?id=${profile.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Failed to delete employee.');
        setSubmittingModal(false);
        return;
      }

      router.push('/approver/employees');
    } catch {
      setModalError('Network error deleting employee.');
    } finally {
      setSubmittingModal(false);
    }
  }

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading employee profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <PortalLayout user={currentUser} portalType="approver">
        <div className="p-8 text-center text-slate-600">Employee not found.</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout user={currentUser} portalType="approver">
      <div className="space-y-6">
        {/* Header navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approver/staff"
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {profile.full_name}
              </h1>
              <p className="text-sm text-slate-500">
                Staff ID: {profile.employee_id} &bull; {profile.designation} ({profile.department})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shadow-2xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Staff</span>
            </button>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adjust Leave Balance</span>
            </button>

            {(currentUser.role === 'ADMIN' || currentUser.role === 'APPROVER') && profile.id !== currentUser.id && (
              <button
                onClick={() => {
                  setModalError(null);
                  setIsDeleteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Staff</span>
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 4-Card Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Current Balance
            </span>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {balance.currentBalance} <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Net ledger balance</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Accrued
            </span>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {balance.totalAccrued} <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Lifetime credited entitlement</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved Used
            </span>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {balance.totalUsed} <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Approved leave consumed</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Days
            </span>
            <div className="mt-2 text-3xl font-extrabold text-amber-800">
              {balance.pendingDays} <span className="text-xs font-semibold text-slate-500">Days</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Currently in review</p>
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">
            Employment Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 block">Official Email</span>
              <span className="font-semibold text-slate-800">{profile.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block">WhatsApp Number</span>
              <span className="font-semibold text-slate-800">{profile.whatsapp_number}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Joining Date</span>
              <span className="font-semibold text-slate-800">{profile.joining_date}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Assigned Approver</span>
              <span className="font-semibold text-slate-800">
                {profile.approver?.full_name || 'Executive Director'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">System Role</span>
              <span className="font-semibold text-slate-800">{profile.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Account Status</span>
              <StatusBadge status={profile.status} />
            </div>
          </div>
        </div>

        {/* 2 Tabs / Sections: Leave Ledger History and Leave Request History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Complete Leave Ledger */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Leave Ledger Audit Trail</h3>
              </div>
              <span className="text-xs text-slate-400">{ledger.length} entries</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {ledger.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No ledger transactions.</div>
              ) : (
                ledger.map((entry) => {
                  const isCredit = entry.amount > 0;
                  return (
                    <div key={entry.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{entry.notes}</div>
                        <div className="text-slate-400 text-[11px]">
                          {entry.transaction_type} &bull;{' '}
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div
                        className={`font-bold whitespace-nowrap text-sm ${
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
          </div>

          {/* Leave Requests History */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Leave Requests</h3>
              </div>
              <span className="text-xs text-slate-400">{leaveRequests.length} requests</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {leaveRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No leave requests.</div>
              ) : (
                leaveRequests.map((r) => (
                  <div key={r.id} className="p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {r.start_date} to {r.end_date} ({r.calculated_days} d)
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-slate-500 line-clamp-1">Reason: {r.reason}</div>
                    <div className="text-[11px] text-slate-400">
                      Handover: {r.handover_employee.full_name} &bull; Applied:{' '}
                      {new Date(r.requested_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal: Manual Leave Balance Adjustment */}
        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Adjust Leave Balance</h3>
                  <p className="text-xs text-slate-500">
                    Creates an auditable administrative transaction in leave ledger
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div>
                  <label htmlFor="txType" className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    id="txType"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="MANUAL_CREDIT">MANUAL_CREDIT (Add paid leave days)</option>
                    <option value="MANUAL_DEBIT">MANUAL_DEBIT (Deduct paid leave days)</option>
                    <option value="OPENING_BALANCE">OPENING_BALANCE (Set opening baseline)</option>
                    <option value="REVERSAL">REVERSAL (Reverse mistaken transaction)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Audit correction)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="txAmount" className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount in Days (e.g. 1.0, 2.5)
                  </label>
                  <input
                    id="txAmount"
                    type="number"
                    step="0.5"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 1.5"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="txNotes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Administrative Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="txNotes"
                    required
                    rows={3}
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="e.g. Approved compensatory credit for overtime weekend flood relief volunteering in Sindhupalchok"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Balance:</span>
                    <span className="font-semibold text-slate-800">{balance.currentBalance} days</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700">Projected Balance:</span>
                    <span className="text-blue-700">
                      {Math.round(
                        (balance.currentBalance +
                          (adjustType === 'MANUAL_DEBIT'
                            ? -Math.abs(Number(adjustAmount) || 0)
                            : Math.abs(Number(adjustAmount) || 0))) *
                          100
                      ) / 100}{' '}
                      days
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    disabled={adjusting}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting || !adjustNotes.trim() || !adjustAmount}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition disabled:opacity-50"
                  >
                    {adjusting ? 'Committing...' : 'Commit Ledger Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. EDIT STAFF MODAL */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit Staff Profile / कर्मचारी विवरण सम्पादन
                  </h3>
                  <p className="text-xs text-slate-500">
                    Updating details for {profile.full_name} ({profile.employee_id})
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  &times;
                </button>
              </div>

              {modalError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Staff ID (कर्मचारी नम्बर)
                    </label>
                    <input
                      type="text"
                      required
                      value={editEmployeeId}
                      onChange={(e) => setEditEmployeeId(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name (पूरा नाम)
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      required
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department (विभाग)
                    </label>
                    <input
                      type="text"
                      required
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {STANDARD_DEPARTMENTS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditDepartment(d)}
                          className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md border font-medium transition ${
                            editDepartment === d
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Designation (पद)
                    </label>
                    <input
                      type="text"
                      required
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editJoiningDate}
                      onChange={(e) => setEditJoiningDate(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="APPROVER">APPROVER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-900">
                      Monthly Leave Entitlement / मासिक कोटा
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-mono">
                      {editMonthlyPaidLeave} दिन / महिना
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['2.0', '1.0', '1.5', '0.5'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEditMonthlyPaidLeave(val)}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition ${
                          editMonthlyPaidLeave === val
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {val} दिन
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={submittingModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingModal}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition disabled:opacity-50"
                  >
                    {submittingModal ? 'Saving...' : 'Update Staff Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. DELETE STAFF CONFIRMATION MODAL */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-center font-bold text-slate-900 text-lg">
                Delete Staff Account / कर्मचारी हटाउनुहोस्?
              </h3>
              <p className="text-center text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete the account for:
              </p>

              <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="font-bold text-slate-900 text-sm">{profile.full_name}</div>
                <div className="text-xs text-slate-500 font-mono">{profile.employee_id} &bull; {profile.email}</div>
                <div className="text-xs text-slate-600 mt-1">{profile.department}</div>
              </div>

              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                Warning: This action will permanently remove this employee and all their associated leave requests and ledger entries from the database. This cannot be undone.
              </p>

              {modalError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={submittingModal}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={submittingModal}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
                >
                  {submittingModal ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
