'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  HeartPulse,
  Shield,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  FileCheck,
  Save,
  Lock,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface FullProfile {
  id: string;
  employee_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  whatsapp_number: string;
  department: string;
  designation: string;
  joining_date: string;
  profile_photo_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  blood_group?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  license_number?: string | null;
  bio?: string | null;
  role: string;
  status: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form editable states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);

        // Fetch full profile details
        const profRes = await fetch('/api/profile/details');
        if (profRes.ok) {
          const profData = await profRes.json();
          const p = profData.profile;
          setProfile(p);
          setEmail(p.email || '');
          setPhone(p.phone || '');
          setWhatsappNumber(p.whatsapp_number || '');
          setEmergencyContactName(p.emergency_contact_name || '');
          setEmergencyContactPhone(p.emergency_contact_phone || '');
          setAddress(p.address || '');
          setBloodGroup(p.blood_group || '');
          setDateOfBirth(p.date_of_birth || '');
          setGender(p.gender || '');
          setLicenseNumber(p.license_number || '');
          setBio(p.bio || '');
          setProfilePhotoUrl(p.profile_photo_url || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
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
        setErrorMsg(data.error || 'Failed to upload photo.');
      } else {
        setProfilePhotoUrl(data.url);
      }
    } catch {
      setErrorMsg('Network error uploading photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          whatsappNumber,
          emergencyContactName,
          emergencyContactPhone,
          address,
          bloodGroup,
          dateOfBirth,
          gender,
          licenseNumber,
          bio,
          profilePhotoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update profile.');
        setSaving(false);
        return;
      }

      setSuccessMsg('Your profile records have been saved successfully.');
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch {
      setErrorMsg('A network error occurred while updating profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading profile records...</div>
      </div>
    );
  }

  return (
    <PortalLayout user={user} portalType={user.role === 'STAFF' ? 'staff' : 'approver'}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Edit My Profile / मेरो प्रोफाइल सम्पादन
            </h1>
            <p className="text-sm text-slate-500">
              Fill and update your personal, contact, and emergency records
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Error Updating Profile</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Saved Successfully</span>
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Immutable Official Identity */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                Official Organization Identity (प्रशासनद्वारा प्रमाणित - अपरिवर्तनीय)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              तपाईंको आधिकारिक नाम, कर्मचारी आईडी, र प्रयोगकर्ता नाम (Email/Username) प्रशासनद्वारा सुरक्षित राखिएको छ र परिवर्तन गर्न मिल्दैन।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Staff Full Name
                </span>
                <span className="font-bold text-slate-900">{profile.full_name}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Username / Official Email
                </span>
                <span className="font-bold font-mono text-slate-900">{profile.email}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Employee ID
                </span>
                <span className="font-bold font-mono text-blue-700">{profile.employee_id}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Department
                </span>
                <span className="font-bold text-slate-800">{profile.department}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  Designation
                </span>
                <span className="font-bold text-slate-800">{profile.designation}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="block text-xs font-semibold text-slate-400 uppercase">
                  System Role
                </span>
                <span className="font-bold text-slate-800">{profile.role}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Profile Photo Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Profile Photo (फोटो)
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center relative flex-shrink-0">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt="Profile Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-semibold">
                    Uploading...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Photo (फाइल छान्नुहोस्)</span>
                  </button>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera (क्यामेराबाट खिच्नुहोस्)</span>
                  </button>

                  {profilePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setProfilePhotoUrl('')}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  PNG, JPG or WebP up to 5MB. Clear face photo recommended for official ID.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Contact Details (सम्पर्क विवरण)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="97798XXXXXXXX (Country code without +)"
                    className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Contacts & Health Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Emergency Contact & Medical Details (आपतकालीन सम्पर्क)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Father, Spouse or Relative Name"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Blood Group (रक्त समूह)
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">Select blood group...</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Date of Birth (जन्म मिति)
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Gender (लिङ्ग)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">Select gender...</option>
                  <option value="Male">Male (पुरुष)</option>
                  <option value="Female">Female (महिला)</option>
                  <option value="Other">Other (अन्य)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Professional / Council Reg. No
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. NMC/NNC/NHPC No."
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Medical / Nursing / Pharmacy council number
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Bio / Professional Summary (संक्षिप्त परिचय)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your professional experience and key responsibilities at Jay Nepal..."
                className="block w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/profile"
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Records...' : 'Save Profile Records'}</span>
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
