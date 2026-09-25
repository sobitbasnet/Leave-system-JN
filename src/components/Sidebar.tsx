'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarPlus,
  FileText,
  History,
  User,
  KeyRound,
  Users,
  CalendarDays,
  UserPlus,
  Palmtree,
  BellRing,
  Mail,
  ShieldAlert,
  Settings,
  Clock,
  ListTodo,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface SidebarProps {
  role: UserRole;
  portalType?: 'staff' | 'approver';
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  role,
  portalType = 'staff',
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const isApproverPortal = portalType === 'approver';

  const staffNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Apply Leave', href: '/leave/apply', icon: CalendarPlus },
    { label: 'My Requests', href: '/leave/requests', icon: FileText },
    { label: 'Leave Balance History', href: '/leave/ledger', icon: History },
    { label: 'My Profile', href: '/profile', icon: User },
    { label: 'Edit Profile', href: '/profile/edit', icon: UserPlus },
    { label: 'Change Password', href: '/profile/password', icon: KeyRound },
  ];

  const approverNavItems = [
    { label: 'Dashboard', href: '/approver/dashboard', icon: LayoutDashboard },
    { label: 'Pending Requests', href: '/approver/requests/pending', icon: Clock },
    { label: 'All Leave Requests', href: '/approver/requests', icon: ListTodo },
    { label: 'Staff & Leave Balances', href: '/approver/staff', icon: Users },
    { label: 'Leave Calendar', href: '/approver/calendar', icon: CalendarDays },
    { label: 'Employees', href: '/approver/employees', icon: UserPlus },
    { label: 'Holidays', href: '/approver/settings/holidays', icon: Palmtree },
    { label: 'Email Notifications', href: '/approver/notifications', icon: Mail },
    { label: 'System Audit Log', href: '/approver/audit', icon: ShieldAlert },
    { label: 'Organization Settings', href: '/approver/settings', icon: Settings },
    { label: 'My Profile', href: '/profile', icon: User },
    { label: 'Edit Profile', href: '/profile/edit', icon: UserPlus },
    { label: 'Change Password', href: '/profile/password', icon: KeyRound },
  ];

  const navItems = isApproverPortal ? approverNavItems : staffNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6">

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              {isApproverPortal ? 'Management' : 'Staff Navigation'}
            </span>
            <div className="pt-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Organization Brand Footer in Sidebar */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
              <img
                src="/logo.png"
                alt="Jaynepal Action Volunteers"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <span className="block text-[11px] font-bold text-slate-800 truncate">
                Jaynepal Action Volunteers
              </span>
              <span className="block text-[10px] text-slate-400">
                Staff Leave Portal
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
