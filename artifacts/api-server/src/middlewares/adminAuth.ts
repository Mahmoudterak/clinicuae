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

export interface DoctorJwtPayload {
  role: "doctor";
  doctorId: number;
  clinicId: number;
}

export type ClinicJwtPayload = AdminJwtPayload | DoctorJwtPayload;

declare global {
  namespace Express {
    interface Request {
      clinicId?: number;
      adminId?: number;
      doctorId?: number;
      adminJwt?: AdminJwtPayload;
    }
  }
}

/**
 * General admin guard: verifies JWT, enforces role === "admin",
 * and extracts clinicId/adminId onto the request object.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — admin token required" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Forbidden — admin role required" });
      return;
    }
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
 * Accepts both admin and doctor JWTs.
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
    const payload = jwt.verify(token, JWT_SECRET) as ClinicJwtPayload;
    if (payload.role === "admin") {
      req.adminJwt = payload as AdminJwtPayload;
      if (!payload.clinicId) {
        res.status(403).json({ error: "Forbidden — no clinic scope in token" });
        return;
      }
      req.clinicId = payload.clinicId;
      if ((payload as AdminJwtPayload).adminId) req.adminId = (payload as AdminJwtPayload).adminId;
    } else if (payload.role === "doctor") {
      const dp = payload as DoctorJwtPayload;
      req.clinicId = dp.clinicId;
      req.doctorId = dp.doctorId;
    } else {
      res.status(403).json({ error: "Forbidden — invalid role" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
