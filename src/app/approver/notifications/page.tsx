'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  BellRing,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Mail,
  Send,
  ExternalLink,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function NotificationLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'EMAIL'>('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test Email state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) router.push('/approver/login');
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setTestEmailAddr('sobitb22@gmail.com');
        }
      })
      .catch(() => router.push('/approver/login'));

    fetchNotifications();
  }, [router]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/approver/notifications/${id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to retry notification dispatch.' });
      } else {
        setFeedback({ type: 'success', message: 'Notification retry executed successfully.' });
        await fetchNotifications();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error executing retry.' });
    } finally {
      setRetryingId(null);
    }
  }

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmailAddr) return;
    setSendingTest(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/approver/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailAddr }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to send test email.' });
      } else {
        setFeedback({ type: 'success', message: data.message || 'Test email triggered successfully!' });
        setShowTestModal(false);
        await fetchNotifications();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error sending test email.' });
    } finally {
      setSendingTest(false);
    }
  }

  if (!user) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (channelFilter === 'ALL') return true;
    return n.channel === channelFilter;
  });

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approver/dashboard"
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Notifications & Alerts</span>
                <span className="text-xs font-normal text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Email Notifications
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Audit trail of automated email notifications dispatched to Director (sobitb22@gmail.com), Admin, and Staff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Test Email / इमेल परीक्षण</span>
            </button>

            <button
              onClick={fetchNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
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

        {/* Notifications Table with Channel Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  channelFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Email Dispatches ({notifications.length})
              </button>
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredNotifications.length} of {notifications.length} email dispatches
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No notification dispatches found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Related Leave</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Diagnostics / Provider ID</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                          <Mail className="w-3 h-3 text-blue-600" />
                          EMAIL
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{n.provider}</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-medium text-slate-800 text-xs max-w-xs truncate">
                        {n.recipient || 'Approver Broadcast'}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-700">
                        {n.leave_request ? (
                          <div>
                            <span className="font-semibold text-slate-900">
                              {n.leave_request.employee.full_name}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {n.leave_request.start_date} to {n.leave_request.end_date} ({n.leave_request.calculated_days}d)
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">System Notification</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={n.status} />
                      </td>

                      <td className="py-4 px-4 text-xs max-w-xs truncate">
                        {n.error_message ? (
                          <span className="text-rose-600 font-medium" title={n.error_message}>
                            {n.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {n.provider_message_id || 'OK'}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {n.status === 'FAILED' ? (
                          <button
                            onClick={() => handleRetry(n.id)}
                            disabled={retryingId === n.id}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                          >
                            {retryingId === n.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Sent / Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test Email Modal */}
        {showTestModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span>Send Test Email / परीक्षण इमेल</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Verify your SMTP email configuration by sending a test notification to any email address.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Destination Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={testEmailAddr}
                    onChange={(e) => setTestEmailAddr(e.target.value)}
                    placeholder="director@jaynepal.org"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Default approvers: <code>sobit@jaynepal.org</code>, <code>admin@jaynepal.org</code>
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    disabled={sendingTest}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {sendingTest ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
