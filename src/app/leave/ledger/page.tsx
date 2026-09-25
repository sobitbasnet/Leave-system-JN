'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { History, ArrowLeft, ArrowUpRight, ArrowDownLeft, ShieldCheck, Download } from 'lucide-react';
import { UserSession, EmployeeBalanceSummary } from '@/lib/types';

interface LedgerItem {
  id: string;
  transaction_type: string;
  amount: number;
  accrual_year?: number;
  accrual_month?: number;
  notes: string;
  created_at: string;
}

export default function LeaveLedgerPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [balance, setBalance] = useState<EmployeeBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/leave/requests');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setLedger(data.ledger || []);
        setBalance(data.balance || null);

        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const me = await meRes.json();
          setUser(me.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading leave ledger...</div>
      </div>
    );
  }

  // Calculate cumulative running balances in chronological order
  const chronological = [...ledger].reverse();
  let running = 0;
  const withRunningBalances = chronological.map((item) => {
    running += item.amount;
    running = Math.round(running * 100) / 100;
    return {
      ...item,
      runningBalance: running,
    };
  });
  // Display newest first
  const displayLedger = [...withRunningBalances].reverse();

  return (
    <PortalLayout user={user} portalType="staff">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Leave Balance History & Ledger
              </h1>
              <p className="text-sm text-slate-500">
                Transparent and immutable accounting record of all your leave credits and debits
              </p>
            </div>
          </div>

          {/* Current Verified Balance Badge */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Verified Balance
              </div>
              <div className="text-xl font-extrabold text-blue-700">
                {balance?.currentBalance ?? 0}{' '}
                <span className="text-xs font-semibold text-slate-500">Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <h2 className="font-bold text-slate-900 text-base">Leave Ledger Entries</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total {displayLedger.length} transaction(s)
            </span>
          </div>

          {displayLedger.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No leave transactions found in your ledger.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Description / Type</th>
                    <th className="py-3.5 px-4 text-emerald-700">Credit (+)</th>
                    <th className="py-3.5 px-4 text-rose-700">Debit (-)</th>
                    <th className="py-3.5 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayLedger.map((row) => {
                    const isCredit = row.amount > 0;
                    const dateFormatted = new Date(row.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric',
                    });

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-4 font-medium text-slate-600 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900">{row.notes}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {row.transaction_type}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-700 whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              +{row.amount} d
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-rose-700 whitespace-nowrap">
                          {!isCredit ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              {Math.abs(row.amount)} d
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap text-base">
                          {row.runningBalance}{' '}
                          <span className="text-xs font-normal text-slate-400">days</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Explainability Callout */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-blue-900 block">
              How Your Balance is Calculated:
            </span>
            <p>
              The JAV leave management system calculates your balance directly from this immutable
              double-entry ledger. Every month on active duty credits 2.00 days. Approved leaves
              create an auditable debit transaction. Your balance is never an unverified mutable number.
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
