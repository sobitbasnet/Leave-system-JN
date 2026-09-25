import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const settings = await prisma.organizationSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        organization_name: 'Jaynepal Action Volunteers',
        timezone: 'Asia/Kathmandu',
        monthly_paid_leave: 2.0,
        weekly_holiday_day_of_week: 6,
        carry_forward_enabled: true,
        negative_balance_allowed: false,
      },
    });

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN', 'APPROVER']);
    const body = await request.json();

    const {
      organizationName,
      monthlyPaidLeave,
      weeklyHolidayDayOfWeek,
      carryForwardEnabled,
      maxCarryForward,
      negativeBalanceAllowed,
      notificationEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
    } = body;

    const prev = await prisma.organizationSettings.findUnique({ where: { id: 'default' } });

    const updateData: any = {
      organization_name: organizationName,
      monthly_paid_leave: monthlyPaidLeave !== undefined ? Number(monthlyPaidLeave) : 2.0,
      weekly_holiday_day_of_week: weeklyHolidayDayOfWeek !== undefined ? Number(weeklyHolidayDayOfWeek) : 6,
      carry_forward_enabled: Boolean(carryForwardEnabled),
      max_carry_forward: maxCarryForward ? Number(maxCarryForward) : null,
      negative_balance_allowed: Boolean(negativeBalanceAllowed),
      notification_email: notificationEmail || 'sobitb22@gmail.com',
      smtp_host: smtpHost || 'smtp.gmail.com',
      smtp_port: smtpPort ? Number(smtpPort) : 465,
      smtp_user: smtpUser || 'sobitb22@gmail.com',
      smtp_from: smtpFrom || 'Jaynepal Action Volunteers <sobitb22@gmail.com>',
    };

    if (smtpPass !== undefined) {
      updateData.smtp_pass = smtpPass;
    }

    const updated = await prisma.organizationSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        organization_name: organizationName || 'Jaynepal Action Volunteers',
        monthly_paid_leave: monthlyPaidLeave !== undefined ? Number(monthlyPaidLeave) : 2.0,
        weekly_holiday_day_of_week: weeklyHolidayDayOfWeek !== undefined ? Number(weeklyHolidayDayOfWeek) : 6,
        carry_forward_enabled: Boolean(carryForwardEnabled),
        max_carry_forward: maxCarryForward ? Number(maxCarryForward) : null,
        negative_balance_allowed: Boolean(negativeBalanceAllowed),
        notification_email: notificationEmail || 'sobitb22@gmail.com',
        smtp_host: smtpHost || 'smtp.gmail.com',
        smtp_port: smtpPort ? Number(smtpPort) : 465,
        smtp_user: smtpUser || 'sobitb22@gmail.com',
        smtp_pass: smtpPass || null,
        smtp_from: smtpFrom || 'Jaynepal Action Volunteers <sobitb22@gmail.com>',
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'organization_settings',
      entityId: 'default',
      oldValue: prev,
      newValue: updated,
    });

    return NextResponse.json({
      success: true,
      message: 'Organization settings updated successfully.',
      settings: updated,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 });
  }
}
