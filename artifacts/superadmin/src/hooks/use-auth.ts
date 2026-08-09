import { useState, useContext, createContext, useCallback } from 'react';

export type SuperAdminRole = 'super_admin' | 'platform_admin' | 'support_admin' | 'billing_admin' | 'developer';

export interface AuthUser {
  token: string;
  name: string;
  username: string;
  role: SuperAdminRole;
}

// ── Shared auth context ──────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  login: (data: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const VALID_ROLES: SuperAdminRole[] = ['super_admin', 'platform_admin', 'support_admin', 'billing_admin', 'developer'];

function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem('sa-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Reject any session whose role is absent or unrecognised — forces re-login rather than silent escalation
    if (!parsed.role || !VALID_ROLES.includes(parsed.role)) {
      localStorage.removeItem('sa-auth');
      return null;
    }
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

/** Returns a stable initial value for the shared state — called once at Provider mount. */
export function createInitialAuthState(): AuthUser | null {
  return loadFromStorage();
}

/** Call this to get the shared { user, login, logout } value to pass into AuthContext.Provider. */
export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<AuthUser | null>(createInitialAuthState);

  const login = useCallback((data: AuthUser) => {
    const safeData: AuthUser = { ...data, role: data.role ?? 'super_admin' };
    localStorage.setItem('sa-auth', JSON.stringify(safeData));
    setUser(safeData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sa-auth');
    setUser(null);
  }, []);

  return { user, login, logout, isAuthenticated: !!user };
}

/** All consumers call this — reads from the shared context. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Permission matrix ────────────────────────────────────────────────────────

/** Roles that can perform a given action */
export const ROLE_PERMISSIONS = {
  /** Can view the main dashboard (stats + clinic activity) */
  readDashboard: ['super_admin', 'platform_admin', 'support_admin'] as SuperAdminRole[],
  /** Can read clinic list and detail */
  readClinics: ['super_admin', 'platform_admin', 'support_admin'] as SuperAdminRole[],
  /** Can create/edit/delete clinics */
  manageClinic: ['super_admin', 'platform_admin'] as SuperAdminRole[],
  /** Can manage subscriptions/plans */
  managePlans: ['super_admin', 'billing_admin'] as SuperAdminRole[],
  /** Can manage feature flags and platform settings */
  managePlatform: ['super_admin', 'platform_admin'] as SuperAdminRole[],
  /** Can view audit logs */
  viewAuditLogs: ['super_admin', 'platform_admin', 'support_admin'] as SuperAdminRole[],
  /** Can view developer info */
  viewDeveloper: ['super_admin', 'developer'] as SuperAdminRole[],
  /** Can view system health */
  viewSystemHealth: ['super_admin', 'platform_admin', 'developer'] as SuperAdminRole[],
  /** Can manage super admin users */
  manageUsers: ['super_admin'] as SuperAdminRole[],
  /** Can impersonate clinics */
  impersonateClinic: ['super_admin', 'platform_admin'] as SuperAdminRole[],
} as const;

export function hasPermission(role: SuperAdminRole | undefined, permission: keyof typeof ROLE_PERMISSIONS): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[permission] as SuperAdminRole[]).includes(role);
}
