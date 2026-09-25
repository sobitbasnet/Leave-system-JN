import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  if (norm === 'APPROVED' || norm === 'ACTIVE' || norm === 'SENT' || norm === 'CREDITED') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    label = norm === 'APPROVED' ? 'Approved' : norm === 'ACTIVE' ? 'Active' : norm === 'SENT' ? 'Sent' : 'Credited';
  } else if (norm === 'PENDING' || norm === 'QUEUED') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    label = norm === 'PENDING' ? 'Pending Approval' : 'Queued';
  } else if (norm === 'REJECTED' || norm === 'FAILED' || norm === 'SUSPENDED') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
    label = norm === 'REJECTED' ? 'Rejected' : norm === 'FAILED' ? 'Failed' : 'Suspended';
  } else if (norm === 'CANCELLED' || norm === 'INACTIVE') {
    styles = 'bg-slate-100 text-slate-600 border-slate-300';
    label = norm === 'CANCELLED' ? 'Cancelled' : 'Inactive';
  }

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${styles} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {label}
    </span>
  );
}

export function LeaveTypeBadge({ type, size = 'sm' }: { type?: string; size?: 'sm' | 'md' }) {
  const isAdvance = (type || '').toUpperCase() === 'ADVANCE';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (isAdvance) {
    return (
      <span
        className={`inline-flex items-center font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1 bg-amber-600"></span>
        Advance / अग्रीम
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 bg-slate-400"></span>
      Regular / नियमित
    </span>
  );
}
