'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import {
  Palmtree,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Info,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function HolidayManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

    fetchHolidays();
  }, [router]);

  async function fetchHolidays() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/holidays');
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/approver/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidayName, holidayDate, notes, active: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to save holiday.' });
        setSubmitting(false);
        return;
      }

      setFeedback({ type: 'success', message: 'Holiday saved successfully.' });
      setIsModalOpen(false);
      setHolidayName('');
      setHolidayDate('');
      setNotes('');
      await fetchHolidays();
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving holiday.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteHoliday(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove the holiday "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/approver/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Holiday deleted.' });
        await fetchHolidays();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete holiday.' });
    }
  }

  if (!user) return null;

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/approver/settings"
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Organization Holiday Calendar
              </h1>
              <p className="text-sm text-slate-500">
                Manage public and organizational holidays that are automatically deducted from leave requests
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
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

        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Calculation Rule:</strong> Any active holiday falling between a leave
            request&apos;s start date and end date (Sunday through Friday) is automatically excluded
            and not charged against the employee&apos;s paid leave balance.
          </div>
        </div>

        {/* Holidays Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total {holidays.length} registered organization holiday(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Holiday Name</th>
                  <th className="py-3.5 px-4">Day of Week</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.map((h) => {
                  const dateObj = new Date(h.holiday_date + 'T00:00:00+05:45');
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {h.holiday_date}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">{h.holiday_name}</td>
                      <td className="py-4 px-4 text-xs text-slate-500">{dayName}</td>
                      <td className="py-4 px-4 text-xs text-slate-600">{h.notes || '-'}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            h.active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {h.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteHoliday(h.id, h.holiday_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Holiday */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add Organization Holiday</h3>
                  <p className="text-xs text-slate-500">
                    Defines an official non-working day for leave accounting
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddHoliday} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label htmlFor="hName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Holiday Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="hName"
                    type="text"
                    required
                    placeholder="e.g. Dashain Festival"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="hDate" className="block text-xs font-semibold text-slate-700 mb-1">
                    Holiday Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="hDate"
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="hNotes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    id="hNotes"
                    rows={2}
                    placeholder="Optional details or Bikram Sambat date reference"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
                    {submitting ? 'Saving...' : 'Save Holiday'}
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
