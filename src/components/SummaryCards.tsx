import React from 'react';
import { Sparkles, TrendingUp, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { EmployeeBalanceSummary } from '@/lib/types';

interface SummaryCardsProps {
  balance: EmployeeBalanceSummary;
  className?: string;
}

export function SummaryCards({ balance, className = '' }: SummaryCardsProps) {
  const isNegative = balance.currentBalance < 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {/* 1. Remaining Paid Leave (Primary Highlight) */}
      <div
        className={`bg-white rounded-xl p-5 shadow-sm relative overflow-hidden border-2 ${
          isNegative ? 'border-rose-500' : 'border-blue-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isNegative ? 'text-rose-700' : 'text-blue-700'
            }`}
          >
            Current Balance {isNegative && '(Advance)'}
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isNegative ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-3xl font-extrabold font-mono ${
              isNegative ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {balance.currentBalance} <span className="text-sm font-semibold text-slate-500">Days</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {isNegative
              ? 'Negative balance (Advance leave used)'
              : 'Total verified paid leave'}
          </p>
        </div>
      </div>

      {/* 2. Earned Leave */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Earned Leave
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900">
            {balance.totalAccrued} <span className="text-sm font-semibold text-slate-500">Days</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Total credited to date</p>
        </div>
      </div>

      {/* 3. Used Leave */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Used Leave
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900">
            {balance.totalUsed} <span className="text-sm font-semibold text-slate-500">Days</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Approved leave consumed</p>
        </div>
      </div>

      {/* 4. Pending Leave */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending Leave
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-amber-800">
            {balance.pendingDays} <span className="text-sm font-semibold text-slate-500">Days</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Under approver review</p>
        </div>
      </div>

      {/* 5. Available for New Requests */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Available to Apply
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-3xl font-extrabold font-mono ${
              balance.availableForNewRequests < 0 ? 'text-rose-600' : 'text-blue-700'
            }`}
          >
            {balance.availableForNewRequests}{' '}
            <span className="text-sm font-semibold text-slate-500">Days</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {balance.availableForNewRequests < 0
              ? 'Advance leave can be requested'
              : 'Current balance minus pending'}
          </p>
        </div>
      </div>
    </div>
  );
}
