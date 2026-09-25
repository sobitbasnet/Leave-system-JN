'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import {
  Settings,
  ArrowLeft,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Palmtree,
  ShieldCheck,
  MessageSquare,
  Mail,
  Eye,
  EyeOff,
  Send,
  HelpCircle,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [organizationName, setOrganizationName] = useState('Jaynepal Action Volunteers');
  const [monthlyPaidLeave, setMonthlyPaidLeave] = useState('2.0');
  const [weeklyHolidayDayOfWeek, setWeeklyHolidayDayOfWeek] = useState('6');
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);
  const [maxCarryForward, setMaxCarryForward] = useState('');
  const [negativeBalanceAllowed, setNegativeBalanceAllowed] = useState(false);

  // Email Notification & SMTP Settings
  const [notificationEmail, setNotificationEmail] = useState('sobitb22@gmail.com');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('sobitb22@gmail.com');
  const [smtpPass, setSmtpPass] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('Jaynepal Action Volunteers <sobitb22@gmail.com>');
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);

  // Accrual Runner State
  const [isAccrualModalOpen, setIsAccrualModalOpen] = useState(false);
  const [accrualYear, setAccrualYear] = useState(new Date().getFullYear());
  const [accrualMonth, setAccrualMonth] = useState(new Date().getMonth() + 1);
  const [runningAccrual, setRunningAccrual] = useState(false);
  const [accrualResult, setAccrualResult] = useState<any | null>(null);

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

    fetchSettings();
  }, [router]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/approver/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        if (s) {
          setOrganizationName(s.organization_name || 'Jaynepal Action Volunteers');
          setMonthlyPaidLeave(String(s.monthly_paid_leave ?? 2.0));
          setWeeklyHolidayDayOfWeek(String(s.weekly_holiday_day_of_week ?? 6));
          setCarryForwardEnabled(Boolean(s.carry_forward_enabled));
          setMaxCarryForward(s.max_carry_forward ? String(s.max_carry_forward) : '');
          setNegativeBalanceAllowed(Boolean(s.negative_balance_allowed));

          setNotificationEmail(s.notification_email || 'sobitb22@gmail.com');
          setSmtpHost(s.smtp_host || 'smtp.gmail.com');
          setSmtpPort(String(s.smtp_port ?? 465));
          setSmtpUser(s.smtp_user || 'sobitb22@gmail.com');
          setSmtpPass(s.smtp_pass || '');
          setSmtpFrom(s.smtp_from || 'Jaynepal Action Volunteers <sobitb22@gmail.com>');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendDirectTestEmail() {
    setTestingEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/approver/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notificationEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestEmailStatus(`❌ ${data.error || 'Test email failed.'}`);
      } else {
        setTestEmailStatus(`✅ ${data.message || 'Test email sent!'}`);
      }
    } catch {
      setTestEmailStatus('❌ Network error sending test email.');
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/approver/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName,
          monthlyPaidLeave: Number(monthlyPaidLeave),
          weeklyHolidayDayOfWeek: Number(weeklyHolidayDayOfWeek),
          carryForwardEnabled,
          maxCarryForward: maxCarryForward ? Number(maxCarryForward) : null,
          negativeBalanceAllowed,
          notificationEmail,
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          smtpFrom,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to update settings.' });
      } else {
        setFeedback({ type: 'success', message: 'Organization settings updated successfully.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving settings.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunAccrual() {
    setRunningAccrual(true);
    setAccrualResult(null);

    try {
      const res = await fetch('/api/approver/accrual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: accrualYear, month: accrualMonth }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Accrual run failed.');
      } else {
        setAccrualResult(data.result);
      }
    } catch {
      alert('Network error executing accrual run.');
    } finally {
      setRunningAccrual(false);
    }
  }

  if (!user) return null;

  return (
    <PortalLayout user={user} portalType="approver">
      <div className="max-w-4xl mx-auto space-y-6">
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
                Organization Leave Settings
              </h1>
              <p className="text-sm text-slate-500">
                Configure accrual rules, weekly holidays, notifications, and run scheduled jobs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAccrualResult(null);
                setIsAccrualModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Monthly Accrual</span>
            </button>
            <Link
              href="/approver/settings/holidays"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>Holidays Calendar</span>
            </Link>
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

        {/* Settings Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-6 text-sm">
            {/* General Organization */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                General Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="orgName" className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Timezone
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Asia/Kathmandu (UTC+05:45)"
                    className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Leave Policy Rules */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Leave Entitlement & Working Days Policy
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="monthlyEntitlement" className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Paid Leave Entitlement (Days)
                  </label>
                  <input
                    id="monthlyEntitlement"
                    type="number"
                    step="0.5"
                    required
                    value={monthlyPaidLeave}
                    onChange={(e) => setMonthlyPaidLeave(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Standard organizational policy grants 2.00 paid leave days each calendar month.
                  </p>
                </div>

                <div>
                  <label htmlFor="weeklyHoliday" className="block text-xs font-semibold text-slate-700 mb-1">
                    Weekly Rest Day
                  </label>
                  <select
                    id="weeklyHoliday"
                    value={weeklyHolidayDayOfWeek}
                    onChange={(e) => setWeeklyHolidayDayOfWeek(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="6">Saturday (Standard Nepal Rest Day)</option>
                    <option value="0">Sunday</option>
                    <option value="5">Friday</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-xs">
                  <input
                    type="checkbox"
                    checked={carryForwardEnabled}
                    onChange={(e) => setCarryForwardEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>
                    Enable Unused Leave Carry Forward (Leave accumulates across months and years)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-xs">
                  <input
                    type="checkbox"
                    checked={negativeBalanceAllowed}
                    onChange={(e) => setNegativeBalanceAllowed(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>
                    Allow Negative Leave Balances (Permit staff to apply exceeding balance)
                  </span>
                </label>
              </div>
            </div>

            {/* Email Notifications (Gmail / SMTP) */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Email Notifications Setup (इमेल सूचना व्यवस्थापन)</span>
                </h2>
                <Link
                  href="/approver/notifications"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View Notification Logs &rarr;
                </Link>
              </div>

              {/* Highlight Note */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-slate-700 mb-4">
                <p className="font-semibold text-blue-900">
                  📢 स्वचालित बिदा सूचना प्रणाली (Automated Leave Alert):
                </p>
                <p className="text-slate-600">
                  कुनै पनि कर्मचारीले बिदा फारम भर्नासाथ <strong>{notificationEmail}</strong> मा कर्मचारीको नाम, शाखा, मिति, र बाँकी बिदा विवरणसहित तुरुन्त इमेल जान्छ।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Notification Recipient */}
                <div>
                  <label htmlFor="notifEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                    बिदा सूचना प्राप्त गर्ने इमेल (Notification Recipient Email)
                  </label>
                  <input
                    id="notifEmail"
                    type="email"
                    required
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="sobitb22@gmail.com"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    यस इमेलमा सबै नयाँ बिदा आवेदनहरूको सूचना तुरुन्त आउँछ।
                  </p>
                </div>

                {/* Sender Email / SMTP User */}
                <div>
                  <label htmlFor="smtpUser" className="block text-xs font-semibold text-slate-700 mb-1">
                    इमेल पठाउने Gmail ठेगाना (Sender Gmail)
                  </label>
                  <input
                    id="smtpUser"
                    type="email"
                    required
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="sobitb22@gmail.com"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Nodemailer मार्फत आधिकारिक इमेल पठाउने एकाउन्ट।
                  </p>
                </div>

                {/* Gmail App Password */}
                <div>
                  <label htmlFor="smtpPass" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Google App Password (१६ अक्षरको एप पासवर्ड)</span>
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {showSmtpPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSmtpPass ? 'Hide' : 'Show'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      id="smtpPass"
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="उदा. abcd efgh ijkl mnop"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Google ले सिधै नियमित पासवर्ड प्रयोग गर्न नदिने हुँदा App Password चाहिन्छ।
                  </p>
                </div>

                {/* SMTP Server & Port */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMTP सर्भर र पोर्ट (Outgoing Mail Server)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="col-span-2 py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm"
                    />
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="465"
                      className="py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Gmail का लागि: <code>smtp.gmail.com</code> र Port <code>465</code> (SSL)
                  </p>
                </div>
              </div>

              {/* Guide on How to generate Google App Password */}
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Google Account बाट १६ अक्षरको App Password कसरी निकाल्ने?</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>आफ्नो कम्प्युटर वा मोबाइलमा Google Account (<strong>{smtpUser}</strong>) खोल्नुहोस्।</li>
                  <li><strong>Security (सुरक्षा)</strong> ट्याबमा गएर <strong>2-Step Verification</strong> अन (Active) गर्नुहोस्।</li>
                  <li>खोज बाकस (Search) मा <strong>"App passwords"</strong> टाइप गर्नुहोस् वा तल स्क्रोल गरेर App Passwords मा क्लिक गर्नुहोस्।</li>
                  <li>एपको नाममा <strong>"JAV Leave System"</strong> लेखेर <strong>Create</strong> थिच्नुहोस्।</li>
                  <li>स्क्रिनमा आउने १६ अक्षरको गोप्य कोड (उदा. <code>abcd efgh ijkl mnop</code>) कपि गरेर माथिको App Password बक्समा पेस्ट गरी तल <strong>Save Organization Settings</strong> थिच्नुहोस्।</li>
                </ol>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={testingEmail}
                    onClick={handleSendDirectTestEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold text-xs transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testingEmail ? 'इमेल पठाउँदै...' : `${notificationEmail} मा Test Email पठाउनुहोस्`}</span>
                  </button>
                  {testEmailStatus && (
                    <span className="text-xs font-semibold text-slate-700">{testEmailStatus}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Organization Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Modal: Run Monthly Accrual */}
        {isAccrualModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Run Monthly Paid Leave Accrual</h3>
                  <p className="text-xs text-slate-500">
                    Idempotent batch processing engine for 2.00 days paid leave credits
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Year
                    </label>
                    <input
                      type="number"
                      value={accrualYear}
                      onChange={(e) => setAccrualYear(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Month (1 - 12)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={accrualMonth}
                      onChange={(e) => setAccrualMonth(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                  <span className="font-semibold block">Idempotency Guarantee:</span>
                  <p>
                    The database uniquely keys each monthly credit by employee and month. If an
                    employee has already been credited for this month, they will be safely skipped.
                    Staff joining after this month are also excluded automatically.
                  </p>
                </div>

                {accrualResult && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-900 block text-sm">
                      Accrual Execution Results ({accrualResult.month}/{accrualResult.year})
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                        <span className="text-emerald-700 font-bold block text-base">
                          {accrualResult.creditedCount}
                        </span>
                        <span className="text-[11px] text-emerald-800">Newly Credited</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <span className="text-blue-700 font-bold block text-base">
                          {accrualResult.alreadyCreditedCount}
                        </span>
                        <span className="text-[11px] text-blue-800">Already Credited</span>
                      </div>
                      <div className="bg-slate-100 p-2 rounded border border-slate-200">
                        <span className="text-slate-700 font-bold block text-base">
                          {accrualResult.notYetJoinedCount}
                        </span>
                        <span className="text-[11px] text-slate-600">Joined Later</span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pt-2">
                      {accrualResult.details.map((d: any, idx: number) => (
                        <div key={idx} className="py-1.5 flex justify-between text-[11px]">
                          <span className="font-medium text-slate-800">{d.employeeName}</span>
                          <span
                            className={
                              d.status === 'CREDITED'
                                ? 'text-emerald-700 font-bold'
                                : 'text-slate-500'
                            }
                          >
                            {d.status === 'CREDITED' ? `+${d.amount} Days` : d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccrualModalOpen(false)}
                  disabled={runningAccrual}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleRunAccrual}
                  disabled={runningAccrual}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{runningAccrual ? 'Executing Accrual...' : 'Run Accrual Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
