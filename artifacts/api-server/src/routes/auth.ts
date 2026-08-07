import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

router.post("/auth/login", (req, res): void => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };

  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) {
    res.status(503).json({ error: "Server not configured — ADMIN_PASSWORD not set" });
    return;
  }

  if (username === ADMIN_USER && password === adminPass) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, role: "admin", name: "System Admin" });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

export default router;

  const adminUser = process.env.ADMIN_USERNAME;
