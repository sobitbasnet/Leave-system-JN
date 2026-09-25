import { prisma } from './prisma';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        user_id: options.userId ?? null,
        action: options.action,
        entity_type: options.entityType,
        entity_id: options.entityId,
        old_value: options.oldValue ? JSON.stringify(options.oldValue) : null,
        new_value: options.newValue ? JSON.stringify(options.newValue) : null,
        ip_address: options.ipAddress ?? null,
        user_agent: options.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
    return null;
  }
}
