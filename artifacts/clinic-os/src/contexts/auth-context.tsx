import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type Role = "admin" | "doctor" | null;

interface AuthData {
  role: Role;
  doctorId?: number;
  name?: string;
  token?: string; // JWT admin token for server-side auth
}

interface AuthContextType extends AuthData {
  login: (data: AuthData) => void;
  logout: () => void;
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

  if (isInitializing) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ ...authData, login, logout }}>
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
