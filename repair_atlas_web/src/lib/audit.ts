import { db } from './db';
import { logger, auditLog } from './logger';

/**
 * Audit logging for compliance and security
 */

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  PASSKEY_CREATED = 'PASSKEY_CREATED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Data Access
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_DOWNLOADED = 'DATA_EXPORT_DOWNLOADED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  // Items & Repairs
  ITEM_CREATED = 'ITEM_CREATED',
  ITEM_VIEWED = 'ITEM_VIEWED',
  ITEM_DELETED = 'ITEM_DELETED',
  DEFECT_REPORTED = 'DEFECT_REPORTED',
  FIX_PATH_CREATED = 'FIX_PATH_CREATED',
  FIX_PATH_VIEWED = 'FIX_PATH_VIEWED',

  // Payments
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Admin Actions
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  CONTENT_MODERATED = 'CONTENT_MODERATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNSUSPENDED = 'USER_UNSUSPENDED',

  // Security Events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
}

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to Winston for immediate visibility
    auditLog(entry.action, entry.userId || 'anonymous', {
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      success: entry.success,
      ...entry.metadata,
    });

    // Store in database for persistence and querying
    // Note: You'll need to create an AuditLog model in Prisma schema
    // await db.auditLog.create({
    //   data: {
    //     action: entry.action,
    //     userId: entry.userId,
    //     resourceType: entry.resourceType,
    //     resourceId: entry.resourceId,
    //     ipAddress: entry.ipAddress,
    //     userAgent: entry.userAgent,
    //     metadata: entry.metadata || {},
    //     success: entry.success,
    //     errorMessage: entry.errorMessage,
    //   },
    // });

    // In production, also send to external audit service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to AWS CloudTrail, Azure Monitor, or similar
    }
  } catch (error) {
    logger.error('Failed to create audit log', { error, entry });
    // Don't throw - audit logging should never break the main flow
  }
}

export async function logUserAction(
  action: AuditAction,
  userId: string,
  request?: Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
    metadata,
    success: true,
  });
}

export async function logSecurityEvent(
  action: AuditAction,
  request: Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    metadata,
    success: false,
  });
}

export async function logPaymentEvent(
  action: AuditAction,
  userId: string,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId,
    resourceType: 'payment',
    metadata,
    success,
  });
}

export async function logDataAccess(
  action: AuditAction,
  userId: string,
  resourceType: string,
  resourceId: string,
  request?: Request
): Promise<void> {
  await createAuditLog({
    action,
    userId,
    resourceType,
    resourceId,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
    success: true,
  });
}

// Add audit log model to Prisma schema - will be done separately
export const AUDIT_LOG_PRISMA_SCHEMA = `
model AuditLog {
  id            String   @id @default(cuid())
  action        String
  userId        String?
  resourceType  String?
  resourceId    String?
  ipAddress     String?
  userAgent     String?
  metadata      Json?
  success       Boolean  @default(true)
  errorMessage  String?
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resourceType, resourceId])
}
`;
