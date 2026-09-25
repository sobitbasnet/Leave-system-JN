'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  UserPlus,
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  Search,
  UserX,
  UserCheck,
  Edit3,
  Trash2,
  Sliders,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Building2,
  Briefcase,
  ExternalLink,
  X,
  Filter,
} from 'lucide-react';
import { UserSession } from '@/lib/types';
import { STANDARD_DEPARTMENTS } from '@/lib/departments';

export default function EmployeeManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Create Form State
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [role, setRole] = useState('STAFF');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [monthlyPaidLeave, setMonthlyPaidLeave] = useState('2.0');
  const [password, setPassword] = useState('');
  const [approverId, setApproverId] = useState('');

  // Edit Form State
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editTargetBalance, setEditTargetBalance] = useState('');
  const [editMonthlyPaidLeave, setEditMonthlyPaidLeave] = useState('2.0');
  const [editAdjustmentNotes, setEditAdjustmentNotes] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');

  // Delete State
  const [deletingEmp, setDeletingEmp] = useState<any | null>(null);

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

    fetchEmployees();
  }, [router]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/approver/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          fullName,
          email,
          phone,
          whatsappNumber,
          department,
          designation,
          joiningDate,
          role,
          openingBalance: Number(openingBalance),
          monthlyPaidLeave: Number(monthlyPaidLeave) || 2.0,
          password,
          approverId: approverId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || 'Failed to create employee.');
        setFeedback({ type: 'error', message: data.error || 'Failed to create employee.' });
        setSubmitting(false);
        return;
      }

      setFeedback({ type: 'success', message: `Staff account for ${fullName} created successfully with initial leave balance of ${openingBalance} days.` });
      setIsCreateModalOpen(false);
      resetCreateForm();
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      await fetchEmployees();
    } catch {
      setModalError('Network error creating employee.');
      setFeedback({ type: 'error', message: 'Network error creating employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(emp: any) {
    setModalError(null);
    setEditingEmp(emp);
    setEditEmployeeId(emp.employee_id || '');
    setEditFullName(emp.full_name || '');
    setEditEmail(emp.email || '');
    setEditPhone(emp.phone || '');
    setEditWhatsapp(emp.whatsapp_number || '');
    setEditDepartment(emp.department || '');
    setEditDesignation(emp.designation || '');
    setEditJoiningDate(emp.joining_date || '');
    setEditRole(emp.role || 'STAFF');
    setEditStatus(emp.status || 'ACTIVE');
    setEditTargetBalance(String(emp.balance?.currentBalance ?? 0));
    setEditMonthlyPaidLeave(String(emp.monthly_paid_leave ?? 2.0));
    setEditAdjustmentNotes('');
    setEditNewPassword('');
    setIsEditModalOpen(true);
  }

  async function handleUpdateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmp) return;
    setSubmitting(true);
    setFeedback(null);
    setModalError(null);

    try {
      const res = await fetch('/api/approver/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmp.id,
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
          targetBalance: editTargetBalance !== '' ? Number(editTargetBalance) : undefined,
          monthlyPaidLeave: Number(editMonthlyPaidLeave) || 2.0,
          adjustmentNotes: editAdjustmentNotes,
          password: editNewPassword ? editNewPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || 'Failed to update employee.');
        setFeedback({ type: 'error', message: data.error || 'Failed to update employee.' });
        setSubmitting(false);
        return;
      }

      setFeedback({ type: 'success', message: `Staff details for ${editFullName} updated successfully.` });
      setIsEditModalOpen(false);
      setEditingEmp(null);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      await fetchEmployees();
    } catch {
      setModalError('Network error updating employee.');
      setFeedback({ type: 'error', message: 'Network error updating employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteModal(emp: any) {
    setModalError(null);
    setDeletingEmp(emp);
    setIsDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingEmp) return;
    setSubmitting(true);
    setFeedback(null);
    setModalError(null);

    try {
      const res = await fetch(`/api/approver/employees?id=${deletingEmp.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || 'Failed to delete employee.');
        setFeedback({ type: 'error', message: data.error || 'Failed to delete employee.' });
        setSubmitting(false);
        return;
      }

      setFeedback({ type: 'success', message: data.message || `Employee ${deletingEmp.full_name} deleted successfully.` });
      setIsDeleteModalOpen(false);
      setDeletingEmp(null);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      await fetchEmployees();
    } catch {
      setModalError('Network error deleting employee.');
      setFeedback({ type: 'error', message: 'Network error deleting employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(emp: any) {
    const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to mark ${emp.full_name} as ${nextStatus}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/approver/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, status: nextStatus }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Status updated to ${nextStatus}` });
        await fetchEmployees();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update employee status.' });
    }
  }

  function resetCreateForm() {
    setEmployeeId('');
    setFullName('');
    setEmail('');
    setPhone('');
    setWhatsappNumber('');
    setDepartment('');
    setDesignation('');
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setRole('STAFF');
    setOpeningBalance('0');
    setMonthlyPaidLeave('2.0');
    setPassword('');
    setApproverId('');
  }

  if (!user) return null;

  const filtered = employees.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.full_name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const inactiveCount = employees.filter((e) => e.status === 'INACTIVE').length;

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approver/dashboard"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Staff & Employee Governance / कर्मचारी व्यवस्थापन
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Add, edit, govern leave balances, set monthly quotas, and manage staff accounts
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setModalError(null);
                setIsCreateModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff / कर्मचारी थप्नुहोस्</span>
            </button>
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

        {/* Controls: Search, Status Filter & View Switcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by staff name, ID, department, designation, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs & View Mode Switcher */}
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              {/* Status Filter Pills */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({employees.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-white text-slate-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {/* View Switcher (Auto, Cards, Table) */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setViewMode('auto')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    viewMode === 'auto'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Auto responsive view (cards on mobile, table on desktop)"
                >
                  Auto
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 ${
                    viewMode === 'cards'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Card view (optimized for mobile/tablet)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RESPONSIVE MOBILE / TABLET CARDS VIEW (Never cuts off buttons on mobile/tablet) */}
        <div className={viewMode === 'table' ? 'hidden' : viewMode === 'cards' ? 'block' : 'block lg:hidden'}>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Showing {filtered.length} of {employees.length} personnel</span>
              <span className="text-emerald-700 font-medium">Auto-accrual on 30th</span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                No staff members match the selected criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filtered.map((emp) => {
                  const bal = emp.balance?.currentBalance ?? 0;
                  const isNegative = bal < 0;

                  return (
                    <div
                      key={emp.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition flex flex-col justify-between gap-3.5"
                    >
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                            {emp.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                              {emp.full_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {emp.employee_id}
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-500 truncate max-w-[170px] sm:max-w-none">{emp.email}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={emp.status} />
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-100">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Department</span>
                          <span className="font-medium text-slate-800 line-clamp-1">{emp.department || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Designation</span>
                          <span className="font-medium text-slate-800 line-clamp-1">{emp.designation || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Role</span>
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 inline-block text-[11px]">
                            {emp.role}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Joining Date</span>
                          <span className="text-slate-600 font-mono text-[11px]">{emp.joining_date || '—'}</span>
                        </div>
                      </div>

                      {/* WhatsApp Row */}
                      {emp.whatsapp_number && (
                        <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-500 text-[11px]">WhatsApp:</span>
                          <a
                            href={`https://wa.me/${emp.whatsapp_number.replace(/[^\d]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <span>+{emp.whatsapp_number}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                          </a>
                        </div>
                      )}

                      {/* Leave Balance Box */}
                      <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">हालको बाँकी बिदा दिन</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono mt-0.5 ${
                              isNegative
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : bal === 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {bal} Days {isNegative && '(Advance)'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">मासिक कोटा</span>
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {emp.monthly_paid_leave ?? 2.0} दिन/महिना
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons (Prominent, spacious, never cut off!) */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Link
                          href={`/approver/staff/${emp.id}`}
                          className="py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>Profile</span>
                        </Link>

                        <button
                          onClick={() => openEditModal(emp)}
                          className="py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => toggleStatus(emp)}
                          className={`py-2 px-3 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-2xs ${
                            emp.status === 'ACTIVE'
                              ? 'text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                              : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? (
                            <>
                              <UserX className="w-3.5 h-3.5 text-slate-600" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>

                        {(user.role === 'ADMIN' || user.role === 'APPROVER') && emp.id !== user.id && (
                          <button
                            onClick={() => openDeleteModal(emp)}
                            className="py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP TABLE VIEW WITH PINNED STICKY ACTIONS (Actions column never gets covered or hidden) */}
        <div className={viewMode === 'cards' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden lg:block'}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filtered.length} of {employees.length} personnel</span>
              <span className="text-slate-400">Monthly Accrual: Set per employee &bull; Credited on the 30th</span>
            </div>

            <div className="overflow-x-auto relative">
              <table className="w-full text-left border-collapse text-sm min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Staff ID</th>
                    <th className="py-3.5 px-4">Department / Designation</th>
                    <th className="py-3.5 px-4">WhatsApp Contact</th>
                    <th className="py-3.5 px-4">Leave Balance</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Joining Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right sticky right-0 bg-slate-100/95 backdrop-blur-xs z-20 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] min-w-[280px]">
                      Actions / कार्य
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs sm:text-sm">
                        No staff members match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => {
                      const bal = emp.balance?.currentBalance ?? 0;
                      const isNegative = bal < 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-900">{emp.full_name}</div>
                            <div className="text-xs text-slate-400">{emp.email}</div>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-700">
                            {emp.employee_id}
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <div className="font-medium text-slate-800">{emp.department}</div>
                            <div className="text-slate-500">{emp.designation}</div>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-700 font-mono">
                            {emp.whatsapp_number}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                                isNegative
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : bal === 0
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {bal} Days {isNegative && '(Advance)'}
                            </span>
                            <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                              मासिक: <strong>{emp.monthly_paid_leave ?? 2.0} दिन/महिना</strong>
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {emp.joining_date}
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={emp.status} />
                          </td>
                          <td className="py-4 px-4 text-right sticky right-0 bg-white/95 backdrop-blur-xs z-10 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)] min-w-[280px]">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Link
                                href={`/approver/staff/${emp.id}`}
                                className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition shadow-2xs"
                              >
                                Profile
                              </Link>
                              <button
                                onClick={() => openEditModal(emp)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                                title="Edit staff details and remaining leave"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => toggleStatus(emp)}
                                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs ${
                                  emp.status === 'ACTIVE'
                                    ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300'
                                    : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300'
                                }`}
                                title={emp.status === 'ACTIVE' ? 'Deactivate staff account' : 'Activate staff account'}
                              >
                                {emp.status === 'ACTIVE' ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                              {(user.role === 'ADMIN' || user.role === 'APPROVER') && emp.id !== user.id && (
                                <button
                                  onClick={() => openDeleteModal(emp)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                                  title="Delete staff account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 1. CREATE STAFF MODAL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Add New Staff Member / नयाँ कर्मचारी थप्नुहोस्
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register a staff member with initial leave balance. Monthly 2 days accrue on the 30th automatically.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
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

              <form onSubmit={handleCreateEmployee} className="mt-4 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="empId" className="block text-xs font-semibold text-slate-700 mb-1">
                      Staff ID (कर्मचारी नम्बर) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empId"
                      type="text"
                      required
                      placeholder="e.g. JAV-020"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="empName" className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name (पूरा नाम) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empName"
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar Thapa"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="empEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email (इमेल) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empEmail"
                      type="email"
                      required
                      placeholder="name@jaynepal.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="empPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number (सम्पर्क नम्बर)
                    </label>
                    <input
                      id="empPhone"
                      type="text"
                      placeholder="98XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="empWhatsapp" className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp Number (with country code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empWhatsapp"
                      type="text"
                      required
                      placeholder="97798XXXXXXXX"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="empDept" className="block text-xs font-semibold text-slate-700 mb-1">
                      Department (विभाग) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empDept"
                      type="text"
                      required
                      placeholder="Select below or type department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {STANDARD_DEPARTMENTS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDepartment(d)}
                          className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md border font-medium transition ${
                            department === d
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
                    <label htmlFor="empDesig" className="block text-xs font-semibold text-slate-700 mb-1">
                      Designation (पद) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empDesig"
                      type="text"
                      required
                      placeholder="e.g. Health Assistant (HA)"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="empJoin" className="block text-xs font-semibold text-slate-700 mb-1">
                      Joining Date (नियुक्ति मिति) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="empJoin"
                      type="date"
                      required
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="empRole" className="block text-xs font-semibold text-slate-700 mb-1">
                      System Role (भूमिका)
                    </label>
                    <select
                      id="empRole"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="STAFF">STAFF (Normal Employee)</option>
                      <option value="APPROVER">APPROVER (Department Lead / Manager)</option>
                      <option value="ADMIN">ADMIN (Central System Admin)</option>
                    </select>
                  </div>

                  {/* Initial Remaining Leave */}
                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                    <label htmlFor="empBal" className="block text-xs font-bold text-blue-900 mb-1">
                      Initial Remaining Leave / सुरुको बाँकी बिदा दिन
                    </label>
                    <input
                      id="empBal"
                      type="number"
                      step="0.5"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="0.0"
                      className="w-full py-2 px-3 bg-white border border-blue-300 rounded-lg focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold font-mono text-blue-800 text-xs sm:text-sm"
                    />
                    <p className="mt-1 text-[11px] text-blue-700 leading-tight">
                      कर्मचारीको हाल बाँकी रहेको बिदा दिन।
                    </p>
                  </div>
                </div>

                {/* Per-Staff Monthly Leave Entitlement (मासिक कति दिन बिदा पाउने) */}
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="empMonthlyQuota" className="block text-xs font-bold text-emerald-900">
                      Monthly Leave Quota / मासिक बिदा पाउने दिन (१ वा २ दिन) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-mono">
                      {monthlyPaidLeave} दिन / महिना
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                    {[
                      { val: '2.0', label: '२ दिन (Standard)' },
                      { val: '1.0', label: '१ दिन (Reduced)' },
                      { val: '1.5', label: '१.५ दिन' },
                      { val: '0.5', label: '०.५ दिन' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setMonthlyPaidLeave(opt.val)}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold text-center transition ${
                          monthlyPaidLeave === opt.val
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-emerald-700 leading-tight">
                    प्रत्येक महिनाको ३० गते यस कर्मचारीको खातामा स्वतः <strong>{monthlyPaidLeave} दिन</strong> बिदा थपिँदै जानेछ।
                  </p>
                </div>

                <div>
                  <label htmlFor="empPass" className="block text-xs font-semibold text-slate-700 mb-1">
                    Temporary Initial Password (अस्थायी पासवर्ड) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="empPass"
                    type="password"
                    required
                    placeholder="Min 8 characters (e.g. JaynepalStaff2026!)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Save & Register Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. EDIT STAFF MODAL */}
        {isEditModalOpen && editingEmp && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit Staff Details / कर्मचारी विवरण सम्पादन
                  </h3>
                  <p className="text-xs text-slate-500">
                    Editing profile and leave balance for {editingEmp.full_name} ({editingEmp.employee_id})
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

              <form onSubmit={handleUpdateEmployee} className="mt-4 space-y-4 text-xs sm:text-sm">
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
                      Official Email (इमेल)
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
                      Account Status
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

                {/* Per-Staff Monthly Leave Quota Update */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-900">
                      Monthly Leave Entitlement / मासिक बिदा पाउने कोटा
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-mono">
                      {editMonthlyPaidLeave} दिन / महिना
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: '2.0', label: '२ दिन (Standard)' },
                      { val: '1.0', label: '१ दिन (Reduced)' },
                      { val: '1.5', label: '१.५ दिन' },
                      { val: '0.5', label: '०.५ दिन' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setEditMonthlyPaidLeave(opt.val)}
                        className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition ${
                          editMonthlyPaidLeave === opt.val
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-tight">
                    प्रत्येक महिनाको ३० गते यस कर्मचारीले स्वतः पाउने बिदा (जस्तै: कसैको २ दिन, कसैको १ दिन)।
                  </p>
                </div>

                {/* Adjust Remaining Leave Balance */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-900">
                      Remaining Leave Balance / बाँकी बिदा दिन
                    </label>
                    <span className="text-xs text-amber-700 font-mono">
                      Current: <strong>{editingEmp.balance?.currentBalance ?? 0} Days</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        step="0.5"
                        value={editTargetBalance}
                        onChange={(e) => setEditTargetBalance(e.target.value)}
                        placeholder="Target Balance (Days)"
                        className="w-full py-2 px-3 bg-white border border-amber-300 rounded-lg font-bold font-mono text-amber-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editAdjustmentNotes}
                        onChange={(e) => setEditAdjustmentNotes(e.target.value)}
                        placeholder="Reason for balance correction"
                        className="w-full py-2 px-3 bg-white border border-amber-300 rounded-lg text-xs placeholder-slate-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    यहाँ बिदाको दिन परिवर्तन गर्दा स्वतः लेजरमा समायोजन (Adjustment) प्रविष्टि थपिनेछ।
                  </p>
                </div>

                {/* Optional Password Reset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Password / नयाँ पासवर्ड (Optional)
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
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Update Staff Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. DELETE CONFIRMATION MODAL */}
        {isDeleteModalOpen && deletingEmp && (
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
                <div className="font-bold text-slate-900 text-sm">{deletingEmp.full_name}</div>
                <div className="text-xs text-slate-500 font-mono">{deletingEmp.employee_id} &bull; {deletingEmp.email}</div>
                <div className="text-xs text-slate-600 mt-1">{deletingEmp.department}</div>
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
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
