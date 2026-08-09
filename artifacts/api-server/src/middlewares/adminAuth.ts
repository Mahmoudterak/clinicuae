import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

export interface AdminJwtPayload {
  role: "admin";
  clinicId?: number;
  adminId?: number;
  adminName?: string;
  /** set when this is an impersonation session from Super Admin */
  impersonated?: boolean;
  impersonatedBy?: string;
}

declare global {
  namespace Express {
    interface Request {
      clinicId?: number;
      adminId?: number;
      adminJwt?: AdminJwtPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — admin token required" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    req.adminJwt = payload;
    if (payload.clinicId) req.clinicId = payload.clinicId;
    if (payload.adminId) req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

/**
 * Stricter guard: requires that the token carries a clinicId.
 * Use on all tenant-data routes to enforce hard isolation.
 */
export function requireClinic(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    req.adminJwt = payload;
    if (!payload.clinicId) {
      res.status(403).json({ error: "Forbidden — no clinic scope in token" });
      return;
    }
    req.clinicId = payload.clinicId;
    if (payload.adminId) req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
