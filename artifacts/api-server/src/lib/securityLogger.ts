import { db, securityEventsTable } from "@workspace/db";
import { Request } from "express";

/** Extract a readable device string from a User-Agent header */
function parseDevice(ua?: string): string {
  if (!ua) return "Unknown";
  if (/mobile/i.test(ua)) return "Mobile";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

export type SecurityEventType =
  | "login_success"
  | "login_failure"
  | "logout"
  | "suspicious_ip"
  | "rate_limit_hit"
  | "token_invalid"
  | "password_changed"
  | "impersonation_start"
  | "impersonation_end"
  | "permission_denied";

export interface LogSecurityEventOpts {
  req: Request;
  eventType: SecurityEventType;
  description: string;
  clinicId?: number | null;
  adminId?: number | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

export async function logSecurityEvent(opts: LogSecurityEventOpts): Promise<void> {
  try {
    const ua = opts.req.headers["user-agent"];
    const ip =
      (opts.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      opts.req.socket.remoteAddress ??
      "unknown";

    await db.insert(securityEventsTable).values({
      clinicId: opts.clinicId ?? null,
      adminId: opts.adminId ?? null,
      eventType: opts.eventType,
      description: opts.description,
      ipAddress: ip,
      userAgent: ua,
      device: parseDevice(ua),
      success: opts.success ?? true,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    // Non-fatal — never let logging crash the request
    console.error("[securityLogger] Failed to write security event:", err);
  }
}
