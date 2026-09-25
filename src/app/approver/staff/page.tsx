'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Users,
  Search,
  Download,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function ApproverStaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [lowBalanceOnly, setLowBalanceOnly] = useState(false);

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

    fetchStaff();
  }, [router]);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/staff');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const filtered = employees.filter((emp) => {
    if (department !== 'ALL' && emp.department !== department) return false;
    if (status !== 'ALL' && emp.status !== status) return false;
    if (lowBalanceOnly && emp.balance.currentBalance > 2.0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = emp.full_name.toLowerCase().includes(q);
      const matchId = emp.employee_id.toLowerCase().includes(q);
      const matchEmail = emp.email.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail) return false;
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
              Staff & Leave Balances
            </h1>
            <p className="text-sm text-slate-500">
              Complete organizational employee roster with live ledger-backed leave balances
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export/csv?type=balances"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Balances CSV</span>
            </a>
            <Link
              href="/approver/employees"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Accounts</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff name, Staff ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Department */}
            <div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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

            {/* Status */}
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Staff</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={lowBalanceOnly}
                onChange={(e) => setLowBalanceOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Filter: Low Leave Balance (&le; 2.0 days)</span>
            </label>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              Showing <strong>{filtered.length}</strong> of <strong>{employees.length}</strong> staff
            </span>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading staff records...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No staff members found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Staff ID</th>
                    <th className="py-3.5 px-4">Department / Designation</th>
                    <th className="py-3.5 px-4">Joining Date</th>
                    <th className="py-3.5 px-4 text-emerald-700">Accrued</th>
                    <th className="py-3.5 px-4 text-rose-700">Used</th>
                    <th className="py-3.5 px-4 text-amber-700">Pending</th>
                    <th className="py-3.5 px-4 text-blue-700">Remaining</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        <Link
                          href={`/approver/staff/${emp.id}`}
                          className="hover:text-blue-700 hover:underline"
                        >
                          {emp.full_name}
                        </Link>
                        <div className="text-xs text-slate-400 font-normal">{emp.email}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-slate-700">
                        {emp.employee_id}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div className="font-medium text-slate-800">{emp.department}</div>
                        <div className="text-slate-500">{emp.designation}</div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {emp.joining_date}
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-700 whitespace-nowrap">
                        {emp.balance.totalAccrued} d
                      </td>
                      <td className="py-4 px-4 font-bold text-rose-700 whitespace-nowrap">
                        {emp.balance.totalUsed} d
                      </td>
                      <td className="py-4 px-4 font-bold text-amber-700 whitespace-nowrap">
                        {emp.balance.pendingDays} d
                      </td>
                      <td className="py-4 px-4 font-extrabold text-blue-700 whitespace-nowrap text-base">
                        {emp.balance.currentBalance} d
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/approver/staff/${emp.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
