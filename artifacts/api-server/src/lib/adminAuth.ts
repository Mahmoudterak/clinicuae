import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

/**
 * Verify that the incoming request carries a valid admin JWT
 * (signed with SESSION_SECRET, payload contains role:"admin").
 *
 * Returns true if authenticated; sends a 401/403 and returns false otherwise.
 * Usage: `if (!requireAdminJwt(req, res)) return;`
 */
export function requireAdminJwt(req: Request, res: Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return false;
  }
}

/**
 * Express middleware version of requireAdminJwt.
 * Calls next() only when the admin JWT is valid.
 */
export function adminJwtMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (requireAdminJwt(req, res)) next();
}
