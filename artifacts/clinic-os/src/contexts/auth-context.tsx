import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type Role = "admin" | "doctor" | null;

interface AuthData {
  role: Role;

  doctorId?: number;

  name?: string;
  /** Server-issued HMAC-signed token — only present for admin sessions. */

  token?: string; // JWT admin token for server-side auth

  serverToken?: string;
}

interface AuthContextType extends AuthData {
  login: (data: AuthData) => void;
  logout: () => void;
  /** Bearer token for protected API calls. Undefined until admin logs in. */
  bearerHeader: Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authData, setAuthData] = useState<AuthData>({ role: null });
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("clinic-os-auth");
      if (stored) {
        setAuthData(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse auth data", e);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const login = (data: AuthData) => {
    setAuthData(data);
    localStorage.setItem("clinic-os-auth", JSON.stringify(data));
    setLocation("/");
  };

  const logout = () => {
    setAuthData({ role: null });
    localStorage.removeItem("clinic-os-auth");
    setLocation("/login");
  };

  // Wire the admin JWT into the generated API client so all codegen'd calls also send auth.
  useEffect(() => {
    const t = authData.token ?? null;
    setAuthTokenGetter(t ? () => t : null);
    return () => setAuthTokenGetter(null);
  }, [authData.token]);

  // Use `token` (admin JWT) for bearer header — `serverToken` was a legacy unused field.
  const bearerHeader: Record<string, string> = authData.token
    ? { Authorization: `Bearer ${authData.token}` }
    : {};

  if (isInitializing) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ ...authData, login, logout, bearerHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
