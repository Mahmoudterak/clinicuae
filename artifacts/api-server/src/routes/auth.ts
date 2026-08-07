import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET   = process.env.SESSION_SECRET    ?? "dev-secret-change-me";
const ADMIN_USER   = process.env.ADMIN_USERNAME     ?? "admin";
const ADMIN_PASS   = process.env.ADMIN_PASSWORD     ?? "admin123";

router.post("/auth/login", (req, res): void => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, role: "admin", name: "System Admin" });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

export default router;
