'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PortalLayout } from '@/components/PortalLayout';
import {
  CalendarPlus,
  ArrowLeft,
  Calendar,
  UserCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Phone,
  Paperclip,
  Upload,
  Camera,
  Trash2,
  ExternalLink,
  Shield,
  Lock,
  FileCheck,
  Sparkles,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { UserSession, EmployeeBalanceSummary, LeaveCalculationResult } from '@/lib/types';
import { isSameDepartment } from '@/lib/departments';

interface Colleague {
  id: string;
  full_name: string;
  department: string;
  designation: string;
  employee_id: string;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const browseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserSession | null>(null);
  const [balance, setBalance] = useState<EmployeeBalanceSummary | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [leaveType, setLeaveType] = useState<'REGULAR' | 'ADVANCE'>('REGULAR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [handoverId, setHandoverId] = useState('');
  const [reason, setReason] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Live Calculation State
  const [calculation, setCalculation] = useState<LeaveCalculationResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Load initial user and colleague data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/leave/requests');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setColleagues(data.activeColleagues || []);
        setBalance(data.balance || null);

        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [router]);

  // 2. Perform live calculation whenever startDate or endDate changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setCalculation(null);
      return;
    }

    let isMounted = true;
    async function runCalc() {
      setCalcLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch('/api/leave/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok) {
            setCalculation(data.calculation);
          } else {
            setErrorMsg(data.error || 'Date calculation error.');
            setCalculation(null);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMsg('Failed to calculate working days.');
          setCalculation(null);
        }
      } finally {
        if (isMounted) setCalcLoading(false);
      }
    }

    runCalc();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  // Document Upload Handler (Supports both file browse and camera capture)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to upload document.');
      } else {
        setAttachmentUrl(data.url);
        setUploadedFileName(data.fileName || file.name);
      }
    } catch {
      setErrorMsg('A network error occurred while uploading file.');
    } finally {
      setUploadingDoc(false);
      // Reset input value so same file can be selected if needed
      e.target.value = '';
    }
  }

  // 3. Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!startDate || !endDate) {
      setErrorMsg('Please select both start and end dates.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      setErrorMsg('Please provide a reason for taking leave.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await fetch('/api/leave/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          handoverEmployeeId: handoverId === 'SUPERVISOR' || !handoverId ? undefined : handoverId,
          reason,
          leaveType,
          contactDuringLeave,
          additionalNotes,
          attachmentUrl: attachmentUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit leave request.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSuccessMsg(
        'Leave request submitted successfully! Your designated Approver has been notified via email.'
      );
      setTimeout(() => {
        router.push('/leave/requests');
      }, 2000);
    } catch {
      setErrorMsg('A network error occurred while submitting your leave request.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loadingInitial || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading leave portal...</div>
      </div>
    );
  }

  const requestedDays = calculation?.calculatedDays ?? 0;
  const currentBal = balance?.currentBalance ?? 0;
  const availableBal = balance?.availableForNewRequests ?? 0;
  const projectedBal = Math.round((currentBal - requestedDays) * 100) / 100;
  const isExceeding = requestedDays > availableBal && requestedDays > 0;

  // Filter colleagues: show ONLY colleagues strictly in the user's own department (excluding self)
  const deptColleagues = colleagues.filter(
    (col) => col.id !== user.id && isSameDepartment(col.department, user.department)
  );
  const displayColleagues = deptColleagues;

  return (
    <PortalLayout user={user} portalType="staff">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Apply for Leave / बिदा फारम
            </h1>
            <p className="text-sm text-slate-500">
              Submit your formal leave request for administrative review
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Submission Error</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Request Submitted</span>
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* PROMINENT LEAVE REMAINING HERO BANNER (बाँकी बिदा दिन - ठूलो बोल्ड र लाइभ अपडेट) */}
        <div
          className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 shadow-sm ${
            projectedBal < 0
              ? 'bg-gradient-to-br from-rose-50 via-amber-50/50 to-white border-rose-300 shadow-rose-100'
              : requestedDays > 0
              ? 'bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-emerald-50/40 border-blue-300 shadow-blue-50'
              : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-white border-slate-200'
          }`}
        >
          {/* Background decorative watermark */}
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-36 h-36 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              {/* Left Column: Big Bold Remaining Days Counter */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`p-1.5 rounded-lg ${
                      projectedBal < 0
                        ? 'bg-rose-100 text-rose-700'
                        : requestedDays > 0
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Leave Remaining / बाँकी बिदा दिन
                  </span>
                  {calcLoading && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      गणना हुँदैछ...
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <div
                    className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-all duration-200 ${
                      projectedBal < 0
                        ? 'text-rose-600 drop-shadow-2xs'
                        : projectedBal === 0
                        ? 'text-amber-600'
                        : 'text-blue-900 drop-shadow-2xs'
                    }`}
                  >
                    {requestedDays > 0 ? (
                      projectedBal > 0 ? `+${projectedBal}` : `${projectedBal}`
                    ) : (
                      currentBal
                    )}
                  </div>
                  <div>
                    <span className="text-lg sm:text-xl font-bold text-slate-800 block leading-tight">
                      Days / दिन
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {requestedDays > 0
                        ? projectedBal < 0
                          ? 'अग्रीम बिदा पछिको ब्यालेन्स (ऋणात्मक)'
                          : 'कट्टी पछिको नयाँ बाँकी बिदा'
                        : 'हाल खातामा बाँकी कुल बिदा'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Calculation Breakdown (घट्दा/बढ्दा तुरुन्तै परिवर्तन देखिने) */}
              <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs min-w-[280px]">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between gap-4">
                  <span>Live Deduction Summary / बिदा हिसाब</span>
                  {requestedDays > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-blue-600" />
                      {requestedDays} दिन कट्टा हुने
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">मिति छान्नुहोस्</span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono">
                  {/* Current Balance */}
                  <div className="text-center px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex-1">
                    <span className="text-[10px] text-slate-500 block font-sans">सुरुको बाँकी</span>
                    <span className="font-bold text-slate-800">{currentBal}d</span>
                  </div>

                  <span className="text-slate-400 font-bold text-base">&minus;</span>

                  {/* Requested Days */}
                  <div
                    className={`text-center px-2.5 py-1.5 rounded-lg border flex-1 transition ${
                      requestedDays > 0
                        ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 block font-sans">माग गरिएको</span>
                    <span>{requestedDays > 0 ? `${requestedDays}d` : '0d'}</span>
                  </div>

                  <span className="text-slate-400 font-bold text-base">=</span>

                  {/* Projected Balance */}
                  <div
                    className={`text-center px-3 py-1.5 rounded-lg border font-bold flex-1 transition ${
                      projectedBal < 0
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : requestedDays > 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 block font-sans">नयाँ बाँकी</span>
                    <span>{requestedDays > 0 ? `${projectedBal}d` : `${currentBal}d`}</span>
                  </div>
                </div>

                {/* Sub-label explaining status */}
                {requestedDays > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    {projectedBal < 0 ? (
                      <span className="text-rose-600 font-medium block">
                        ⚠️ ब्यालेन्स अपुग छ। अग्रीम बिदा (Advance Leave) अन्तर्गत <strong>{projectedBal} दिन</strong> (ऋणात्मक) हुनेछ।
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium block">
                        ✓ स्वीकृत भएपछि बाँकी बिदा <strong>{projectedBal} दिन</strong> रहनेछ।
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Form + Live Calculation Summary Box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Applicant Identity Card (Auto-filled / स्वतः भरिएको) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/90 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Applicant Staff Member (बिदा लिने कर्मचारी - स्वतः भरिएको)
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {user.full_name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {user.designation} &bull; <strong className="text-slate-800">{user.department}</strong> &bull; ID: <span className="font-mono font-semibold">{user.employee_id}</span>
                    </p>
                  </div>
                  <div className="self-start sm:self-center px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 shadow-2xs">
                    तपाईंको आफ्नै प्रोफाइलबाट स्वचालित
                  </div>
                </div>
              </div>

              {/* Leave Type Selector: Regular vs Advance Leave */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Leave Category / बिदाको प्रकार <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLeaveType('REGULAR')}
                    className={`p-3.5 rounded-xl border-2 text-left transition relative ${
                      leaveType === 'REGULAR'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Regular Leave / नियमित बिदा</span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          leaveType === 'REGULAR' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {leaveType === 'REGULAR' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      बाँकी बिदा ब्यालेन्स भित्रबाट लिइने साधारण बिदा।
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveType('ADVANCE')}
                    className={`p-3.5 rounded-xl border-2 text-left transition relative ${
                      leaveType === 'ADVANCE'
                        ? 'border-amber-600 bg-amber-50/60 text-amber-950 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">Advance Leave / अग्रीम बिदा</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          Emergency
                        </span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          leaveType === 'ADVANCE' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                        }`}
                      >
                        {leaveType === 'ADVANCE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      बिदा ब्यालेन्स अपुग वा शून्य भए पनि आकस्मिक अवस्थामा लिन पाइने बिदा।
                    </p>
                  </button>
                </div>

                {leaveType === 'ADVANCE' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Advance Leave Policy (अग्रीम बिदा नीति)</span>
                    </div>
                    <p>
                      तपाईंसँग बिदा बाँकी नभए पनि वा ब्यालेन्स अपुग भए पनि आकस्मिक अवस्थामा यो बिदा लिन पाइन्छ। यसले तपाईंको ब्यालेन्सलाई माइनस (ऋणात्मक) मा लैजानेछ। प्रत्येक महिनाको ३० गते स्वचालित रूपमा २ दिन बिदा थपिँदै जाँदा यो माइनस ब्यालेन्स क्रमशः कट्टी हुँदै जानेछ।
                    </p>
                  </div>
                )}
              </div>

              {/* Date Inputs + Live Days Badge */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-semibold text-slate-800 mb-1"
                    >
                      Leave From <span className="text-rose-500">*</span>
                      <span className="ml-1 text-[11px] font-normal text-slate-400">(start date, inclusive)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="startDate"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-semibold text-slate-800 mb-1"
                    >
                      Leave To <span className="text-rose-500">*</span>
                      <span className="ml-1 text-[11px] font-normal text-slate-400">(end date, inclusive)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="endDate"
                        type="date"
                        required
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Days Display — shown immediately after both dates are picked */}
                {(startDate || endDate) && (
                  <div className="mt-3 flex items-center gap-3">
                    {calcLoading ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        गणना हुँदैछ...
                      </span>
                    ) : calculation && startDate && endDate ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Primary big days pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black border-2 shadow-sm transition-all duration-200 ${
                            calculation.calculatedDays === 0
                              ? 'bg-slate-100 border-slate-300 text-slate-500'
                              : 'bg-blue-600 border-blue-700 text-white shadow-blue-200'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span className="font-mono text-base">{calculation.calculatedDays}</span>
                          <span>working {calculation.calculatedDays === 1 ? 'day' : 'days'}</span>
                        </span>

                        {/* Calendar days breakdown */}
                        <span className="text-xs text-slate-500">
                          ({calculation.calendarDays} calendar day{calculation.calendarDays !== 1 ? 's' : ''}
                          {calculation.saturdaysExcluded > 0 && `, ${calculation.saturdaysExcluded} Saturday${calculation.saturdaysExcluded > 1 ? 's' : ''} excluded`}
                          {calculation.holidaysExcluded > 0 && `, ${calculation.holidaysExcluded} holiday${calculation.holidaysExcluded > 1 ? 's' : ''} excluded`}
                          )
                        </span>

                        {/* Holiday names if any */}
                        {calculation.excludedHolidayNames && calculation.excludedHolidayNames.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                            🎉 {calculation.excludedHolidayNames.join(', ')}
                          </span>
                        )}

                        {/* Warning if 0 working days */}
                        {calculation.calculatedDays === 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            All selected days are rest days / holidays
                          </span>
                        )}
                      </div>
                    ) : startDate && endDate && !calculation ? (
                      <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Invalid date range — end date must be on or after start date
                      </span>
                    ) : null}
                  </div>
                )}
              </div>


              {/* Handover Colleague Dropdown (Strictly filtered by applicant's department) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="handoverSelect"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Duty Handover Colleague / कार्यभार सम्हाल्ने सहकर्मी
                  </label>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {user.department}
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="handoverSelect"
                    value={handoverId}
                    onChange={(e) => setHandoverId(e.target.value)}
                    className="block w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                  >
                    <option value="">
                      {displayColleagues.length > 0
                        ? `Select peer from ${user.department}...`
                        : `No other peer in ${user.department} (Directly assign to Supervisor)`}
                    </option>
                    <option value="SUPERVISOR">
                      Directly Handover to Supervisor / Lead (सुपरभाइजरलाई कार्यभार)
                    </option>
                    {displayColleagues.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.full_name} — {col.designation} ({col.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {displayColleagues.length > 0
                    ? `तपाईंको विभाग (${user.department}) का सहकर्मीहरू मात्र यहाँ सूचीकृत छन्। अन्य विभागका कर्मचारीहरू देखिँदैनन्। आवश्यकता नभए वा सहकर्मी उपलब्ध नभए सिधै सुपरभाइजरलाई जिम्मा दिन सक्नुहुन्छ।`
                    : `तपाईंको विभागमा हाल अन्य कर्मचारी उपलब्ध नभएकाले सिधै सुपरभाइजरलाई कार्यभार जान्छ।`}
                </p>
              </div>

              {/* Reason for Leave */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="reason"
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please state the purpose of your leave (personal, medical, family, emergency, etc.)"
                  className="block w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Supporting Document Upload (Browse + Mobile Camera) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-900">
                    Supporting Document (कागजात अपलोड - मेडिकल/प्रमाण पत्र)
                  </label>
                  <span className="text-xs text-slate-500 font-medium">वैकल्पिक / Optional</span>
                </div>

                {/* Upload action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={browseInputRef}
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => browseInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Browse File (फाइल छान्नुहोस्)</span>
                  </button>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Camera (मोबाइल क्यामेरा)</span>
                  </button>

                  {uploadingDoc && (
                    <span className="text-xs text-blue-700 animate-pulse font-medium">
                      Uploading document...
                    </span>
                  )}
                </div>

                {/* Uploaded File Preview Card */}
                {attachmentUrl && (
                  <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-xs font-semibold text-slate-800 truncate">
                          {uploadedFileName || 'Uploaded Document'}
                        </span>
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        >
                          <span>Preview Attachment</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl('');
                        setUploadedFileName('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Accepts JPG, PNG, PDF, DOC up to 10MB. On mobile phones, tap "Camera" to take a direct photo of your medical certificate or slip.
                </p>
              </div>

              {/* Contact During Leave (Optional) */}
              <div>
                <label
                  htmlFor="contact"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Contact Number During Leave (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="contact"
                    type="text"
                    value={contactDuringLeave}
                    onChange={(e) => setContactDuringLeave(e.target.value)}
                    placeholder="e.g. +977 9841000000"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Additional Notes (Optional) */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Additional Operational Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any extra instructions, handover remarks, or project context"
                  className="block w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitLoading || (isExceeding && leaveType !== 'ADVANCE') || !startDate || !endDate}
                  className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    leaveType === 'ADVANCE'
                      ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                      : 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600'
                  }`}
                >
                  {submitLoading ? (
                    <span>Submitting Leave Request...</span>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4" />
                      <span>
                        {leaveType === 'ADVANCE'
                          ? 'Submit Advance Leave Request / अग्रीम बिदा फारम बुझाउनुहोस्'
                          : 'Submit Leave Request / बिदा फारम बुझाउनुहोस्'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Calculation Box (1 Column) */}
          <div className="space-y-4">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-700" />
                <span>Calculation Preview</span>
              </h3>

              {calcLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                  Calculating working days & holidays...
                </div>
              ) : !startDate || !endDate ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Select start and end dates to see live working day calculations.
                </div>
              ) : calculation ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Total Calendar Days:</span>
                    <span className="font-semibold text-slate-800">
                      {calculation.calendarDays} {calculation.calendarDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Saturdays Excluded:</span>
                    <span className="font-semibold text-slate-600">
                      -{calculation.saturdaysExcluded} day(s)
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Holidays Deducted:</span>
                    <span className="font-semibold text-slate-600">
                      -{calculation.holidaysExcluded} day(s)
                    </span>
                  </div>

                  {calculation.excludedHolidayNames && calculation.excludedHolidayNames.length > 0 && (
                    <div className="py-1 px-2.5 rounded bg-blue-50 border border-blue-100 text-[11px] text-blue-800">
                      <span className="font-semibold">Holidays: </span>
                      {calculation.excludedHolidayNames.join(', ')}
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-t-2 border-slate-200 text-sm font-bold">
                    <span className="text-slate-900">Paid Days Deducted:</span>
                    <span className="text-blue-700 font-mono text-base">
                      {calculation.calculatedDays} {calculation.calculatedDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  {/* Balance Check */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Available Balance:</span>
                      <span className="font-semibold font-mono">{availableBal} days</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Projected After Approval:</span>
                      <span
                        className={`font-semibold font-mono ${
                          projectedBal < 0
                            ? 'text-rose-600 font-bold'
                            : isExceeding
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {projectedBal} days {projectedBal < 0 && '(ऋणात्मक/Negative)'}
                      </span>
                    </div>

                    {isExceeding && leaveType === 'REGULAR' && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                          <span>
                            नियमित बिदा अपुग छ। माग गरिएको {requestedDays} दिन बाँकी उपलब्ध {availableBal} दिन भन्दा बढी छ।
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeaveType('ADVANCE')}
                          className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] transition text-center shadow-2xs"
                        >
                          Switch to Advance Leave / अग्रीम बिदामा बदल्नुहोस् &rarr;
                        </button>
                      </div>
                    )}

                    {leaveType === 'ADVANCE' && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>Advance Leave Allowed (अग्रीम बिदा स्वीकृत)</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          ब्यालेन्स माइनस भए पनि यो बिदा लिन पाइन्छ। आगामी महिनाहरूको ३० गते स्वचालित रूपमा थपिने २ दिनबाट ब्यालेन्स मिलान हुनेछ।
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Quick Policies Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">
                Leave Policy Reminders
              </span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Leave days are counted as calendar days (inclusive of both start and end date).</li>
                <li>Official organization holidays are automatically excluded.</li>
                <li>2.0 paid leave days accrue every month.</li>
                <li>Submit medical slip if taking sick leave exceeding 2 days.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
