import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { emailOrId, password, portal } = await request.json();

    if (!emailOrId || !password) {
      return NextResponse.json(
        { error: 'Staff ID/Email and password are required.' },
        { status: 400 }
      );
    }

    const rawIdentifier = String(emailOrId).trim();
    const cleanLower = rawIdentifier.toLowerCase();
    const normalizedQuery = cleanLower.replace(/[^a-z0-9]/g, '');

    // 1. Find profile by email or employee_id
    let user = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: cleanLower },
          { employee_id: rawIdentifier.toUpperCase() },
        ],
      },
    });

    // 2. If not matched by email or employee_id, search by Name
    if (!user) {
      const activeProfiles = await prisma.profile.findMany({
        where: { status: 'ACTIVE' },
      });

      // Priority a: Exact match on full_name or email prefix (e.g. 'admin' matches admin@jaynepal.org)
      user = activeProfiles.find(
        (p) =>
          p.full_name.trim().toLowerCase() === cleanLower ||
          p.email.split('@')[0].toLowerCase() === cleanLower
      ) || null;

      // Priority b: Normalized full name match (ignoring spaces, dots, e.g. "dr. bikesh" -> "drbikesh", "sobitbasnet")
      if (!user) {
        user = activeProfiles.find(
          (p) => p.full_name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedQuery
        ) || null;
      }

      // Priority c: First name or prefix match
      if (!user) {
        const matches = activeProfiles.filter((p) => {
          const firstName = p.full_name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
          const cleanName = p.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return firstName === normalizedQuery || cleanName.startsWith(normalizedQuery);
        });

        if (matches.length === 1) {
          user = matches[0];
        } else if (matches.length > 1) {
          // If ambiguous (like "Sarita" or "Sudip"), match exact first name
          const exactFirst = matches.filter(
            (p) => p.full_name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') === normalizedQuery
          );
          if (exactFirst.length === 1) {
            user = exactFirst[0];
          } else {
            user = matches[0];
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Staff member not found. Please enter your Name (e.g. Sajan Majhi), Staff ID, or Email.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Account is ${user.status.toLowerCase()}. Please contact the administrator.` },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your password.' },
        { status: 401 }
      );
    }

    // Role-based portal check (Strictly restricted to Director and Administrator)
    if (portal === 'approver') {
      if (user.email === 'aayush@jaynepal.org' || user.employee_id === 'JAV-002') {
        return NextResponse.json(
          {
            error:
              'Aayush Wasti does not have approver access. Approver privileges are strictly restricted to the Director and Administrator.',
          },
          { status: 403 }
        );
      }

      if (user.role !== 'APPROVER' && user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            error:
              'Access denied. Your account does not have Approver or Administrator permissions.',
          },
          { status: 403 }
        );
      }
    }

    const sessionPayload = {
      id: user.id,
      employee_id: user.employee_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role as any,
      department: user.department,
      designation: user.designation,
      whatsapp_number: user.whatsapp_number,
      requires_password_change: user.requires_password_change,
    };

    const token = await createSessionToken(sessionPayload);

    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'profiles',
      entityId: user.id,
      newValue: { portal: portal || 'staff' },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const destination =
      user.role === 'APPROVER' || user.role === 'ADMIN'
        ? '/approver/dashboard'
        : '/dashboard';

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirect: destination,
    });

    response.cookies.set('jav_leave_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during authentication.' },
      { status: 500 }
    );
  }
}
