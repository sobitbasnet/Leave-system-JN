import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Editable fields only - employee_id and role are strictly immutable
    const {
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
    } = body;

    let resolvedEmail: string | undefined = undefined;
    if (email) {
      const emailTrimmed = String(email).trim().toLowerCase();
      const existing = await prisma.profile.findFirst({
        where: {
          email: emailTrimmed,
          id: { not: user.id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'This email is already in use by another staff member.' }, { status: 400 });
      }
      resolvedEmail = emailTrimmed;
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        email: resolvedEmail,
        phone: phone !== undefined ? String(phone).trim() : undefined,
        whatsapp_number: whatsappNumber !== undefined ? String(whatsappNumber).trim() : undefined,
        emergency_contact_name: emergencyContactName !== undefined ? String(emergencyContactName).trim() : undefined,
        emergency_contact_phone: emergencyContactPhone !== undefined ? String(emergencyContactPhone).trim() : undefined,
        address: address !== undefined ? String(address).trim() : undefined,
        blood_group: bloodGroup !== undefined ? String(bloodGroup).trim() : undefined,
        date_of_birth: dateOfBirth !== undefined ? String(dateOfBirth).trim() : undefined,
        gender: gender !== undefined ? String(gender).trim() : undefined,
        license_number: licenseNumber !== undefined ? String(licenseNumber).trim() : undefined,
        bio: bio !== undefined ? String(bio).trim() : undefined,
        profile_photo_url: profilePhotoUrl !== undefined ? String(profilePhotoUrl).trim() : undefined,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PROFILE_UPDATED',
      entityType: 'profiles',
      entityId: user.id,
      newValue: {
        phone,
        whatsappNumber,
        emergencyContactName,
        bloodGroup,
        address,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updatedProfile,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
