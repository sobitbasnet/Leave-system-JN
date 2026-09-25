'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { UserSession } from '@/lib/types';

interface PortalLayoutProps {
  user: UserSession;
  portalType?: 'staff' | 'approver';
  children: React.ReactNode;
}

export function PortalLayout({
  user,
  portalType = 'staff',
  children,
}: PortalLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        portalType={portalType}
        onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)}
        isMobileMenuOpen={isMobileOpen}
      />

      <div className="flex-1 flex">
        <Sidebar
          role={user.role}
          portalType={portalType}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
          <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
            <div className="flex items-center justify-center gap-2">
              <img src="/logo.png" alt="Jaynepal" className="w-4 h-4 object-contain" />
              <span>&copy; {new Date().getFullYear()} Jaynepal Action Volunteers — Staff Leave Management Portal</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
