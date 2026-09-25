import React from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmployeeBalance } from '@/lib/balance';
import { PortalLayout } from '@/components/PortalLayout';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  KeyRound,
  Shield,
  MessageSquare,
  MapPin,
  HeartPulse,
  UserCheck,
  FileBadge,
  Edit3,
  Lock,
} from 'lucide-react';

export default async function ProfilePage() {
  const sessionUser = await requireAuth();

  const profile = await prisma.profile.findUnique({
    where: { id: sessionUser.id },
    include: {
      approver: {
        select: { full_name: true, email: true },
      },
    },
  });

  const balance = await getEmployeeBalance(sessionUser.id);

  if (!profile) return null;

  return (
    <PortalLayout user={sessionUser} portalType={sessionUser.role === 'STAFF' ? 'staff' : 'approver'}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-sm text-slate-500">
              Personal identity, contact records, and organizational employment details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit My Profile / प्रोफाइल सम्पादन</span>
            </Link>
            <Link
              href="/profile/password"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </Link>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm flex-shrink-0">
                {profile.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {profile.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
                <p className="text-sm text-slate-600">
                  {profile.designation} &bull; <strong className="text-slate-800">{profile.department}</strong>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    ID: {profile.employee_id}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    {profile.status}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    Leave Balance: {balance.currentBalance} Days
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Username</span>
              <span className="text-sm font-bold font-mono text-slate-900 flex items-center gap-1 sm:justify-end">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                {profile.email}
              </span>
              <span className="text-[11px] text-slate-500">स्थायी प्रयोगकर्ता नाम</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Official Email / Username
                </span>
                <span className="font-medium text-slate-900 font-mono">{profile.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-emerald-600 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  WhatsApp Contact Number
                </span>
                <span className="font-medium text-slate-900">{profile.whatsapp_number}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Personal Phone
                </span>
                <span className="font-medium text-slate-900">{profile.phone || 'Not configured'}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Address (ठेगाना)
                </span>
                <span className="font-medium text-slate-900">{profile.address || 'Not specified'}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HeartPulse className="w-4 h-4 text-rose-500 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Blood Group (रक्त समूह)
                </span>
                <span className="font-bold text-slate-900">{profile.blood_group || 'Not recorded'}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserCheck className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Emergency Contact
                </span>
                <span className="font-medium text-slate-900">
                  {profile.emergency_contact_name
                    ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || 'No phone'})`
                    : 'Not configured'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileBadge className="w-4 h-4 text-blue-600 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Council License No.
                </span>
                <span className="font-medium text-slate-900">
                  {profile.license_number || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Joining Date
                </span>
                <span className="font-medium text-slate-900">{profile.joining_date}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Assigned Approver
                </span>
                <span className="font-medium text-slate-900">
                  {profile.approver?.full_name || 'Executive Director'}
                </span>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Bio & Experience Summary
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
