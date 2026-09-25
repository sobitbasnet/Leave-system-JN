'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Menu, X, Shield, Calendar } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface NavbarProps {
  user: UserSession;
  portalType?: 'staff' | 'approver';
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Navbar({
  user,
  portalType = 'staff',
  onMobileMenuToggle,
  isMobileMenuOpen,
}: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (portalType === 'approver') {
        router.push('/approver/login');
      } else {
        router.push('/login');
      }
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  }

  const isApprover = portalType === 'approver';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left Brand Identity */}
          <div className="flex items-center gap-3">
            {onMobileMenuToggle && (
              <button
                type="button"
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link
              href={isApprover ? '/approver/dashboard' : '/dashboard'}
              className="flex items-center gap-3 group"
            >
              {/* Organization Official Logo */}
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center p-1 overflow-hidden group-hover:border-blue-300 group-hover:shadow-xs transition flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="Jaynepal Action Volunteers"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Jaynepal Action Volunteers
                </span>
                <span className="block text-base font-bold text-slate-900 leading-tight">
                  JN Staff Leave Portal
                </span>
              </div>
            </Link>

            {isApprover && (
              <span className="hidden sm:inline-flex items-center gap-1.5 ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Shield className="w-3.5 h-3.5 text-blue-700" />
                Approver Console
              </span>
            )}
          </div>

          {/* Right User Navigation */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900">{user.full_name}</span>
              <span className="text-xs text-slate-500">
                {user.designation} &bull; {user.department}
              </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-semibold text-sm">
              {user.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-md border border-slate-200 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
