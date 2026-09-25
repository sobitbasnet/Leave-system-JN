'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function ApproverLoginPage() {
  const router = useRouter();
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId, password, portal: 'approver' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push(data.redirect || '/approver/dashboard');
      router.refresh();
    } catch {
      setError('A network or server error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-2xl border border-slate-200/90 p-2">
            <img
              src="/logo.png"
              alt="Jaynepal Action Volunteers"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xs font-bold uppercase tracking-wider text-blue-400">
          Jaynepal Action Volunteers
        </h2>
        <h1 className="text-center text-2xl font-extrabold text-white tracking-tight">
          Approver & Executive Portal
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Management console for leave approvals, rosters, policy, and audit trails
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl border border-slate-700 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="approverId"
                className="block text-sm font-semibold text-slate-200 mb-1"
              >
                Approver Name (नाम), ID or Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="approverId"
                  name="emailOrId"
                  type="text"
                  required
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="e.g. Sobit Basnet, Aayush, or admin@jaynepal.org"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                तपाईंको पूरा नाम वा पहिलो नाम टाइप गर्नुहोस् (e.g. Sobit, Aayush, Dr. Bikesh)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Password (पासवर्ड)
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-60 transition"
            >
              {loading ? (
                <span>Verifying Authorization...</span>
              ) : (
                <>
                  <span>Sign In to Executive Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separation to Staff Portal */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <div className="text-center">
              <span className="text-xs text-slate-400">
                Looking for the regular Staff Portal?
              </span>
              <div className="mt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Switch to Staff Member Login &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
