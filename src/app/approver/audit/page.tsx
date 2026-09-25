'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { ShieldAlert, ArrowLeft, Search, RotateCw, User, Shield } from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function AuditLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

    fetchLogs();
  }, [router]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const actionMatch = l.action.toLowerCase().includes(q);
    const entityMatch = l.entity_type.toLowerCase().includes(q);
    const userMatch = l.user?.full_name?.toLowerCase().includes(q);
    return actionMatch || entityMatch || userMatch;
  });

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
                System Audit Log
              </h1>
              <p className="text-sm text-slate-500">
                Immutable, timestamped record of administrative and organizational operations
              </p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by action, actor, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length} of {logs.length} audit event(s)</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading audit log...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Target Entity</th>
                    <th className="py-3.5 px-4">Delta / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-xs text-blue-900">
                        {log.action}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-700">
                        {log.user ? (
                          <div>
                            <span className="font-semibold">{log.user.full_name}</span>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {log.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">System Automation</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 font-mono">
                        {log.entity_type}
                      </td>
                      <td className="py-4 px-4 text-xs max-w-sm">
                        {log.new_value && (
                          <div className="bg-slate-50 p-2 rounded text-[11px] font-mono text-slate-700 truncate" title={log.new_value}>
                            {log.new_value}
                          </div>
                        )}
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
