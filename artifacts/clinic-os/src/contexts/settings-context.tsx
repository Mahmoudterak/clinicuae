import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ClinicSettings {
  clinicName: string;
  clinicNameAr: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  logoDataUrl: string | null; // base64 or null = use default
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  createdAt: string;
}

export interface SettingsState {
  clinic: ClinicSettings;
  admins: AdminUser[];
}

const DEFAULT_SETTINGS: SettingsState = {
  clinic: {
    clinicName: "Clinic OS",
    clinicNameAr: "كلينيك OS",
    address: "",
    phone: "",
    email: "",
    website: "",
    currency: "AED",
    timezone: "Asia/Dubai",
    logoDataUrl: null,
  },
  admins: [
    {
      id: "admin-1",
      username: "admin",
      password: "admin123",
      name: "System Administrator",
      createdAt: new Date().toISOString(),
    },
  ],
};

const STORAGE_KEY = "clinic-os-settings";

interface SettingsContextType {
  settings: SettingsState;
  updateClinic: (data: Partial<ClinicSettings>) => void;
  setLogo: (dataUrl: string | null) => void;
  addAdmin: (user: Omit<AdminUser, "id" | "createdAt">) => void;
  updateAdmin: (id: string, data: Partial<AdminUser>) => void;
  deleteAdmin: (id: string) => void;
  validateAdmin: (username: string, password: string) => AdminUser | null;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields added later
        return {
          clinic: { ...DEFAULT_SETTINGS.clinic, ...parsed.clinic },
          admins: parsed.admins?.length ? parsed.admins : DEFAULT_SETTINGS.admins,
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const persist = useCallback((next: SettingsState) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateClinic = useCallback((data: Partial<ClinicSettings>) => {
    setSettings(prev => {
      const next = { ...prev, clinic: { ...prev.clinic, ...data } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setLogo = useCallback((dataUrl: string | null) => {
    updateClinic({ logoDataUrl: dataUrl });
  }, [updateClinic]);

  const addAdmin = useCallback((user: Omit<AdminUser, "id" | "createdAt">) => {
    setSettings(prev => {
      const next = {
        ...prev,
        admins: [
          ...prev.admins,
          { ...user, id: `admin-${Date.now()}`, createdAt: new Date().toISOString() },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateAdmin = useCallback((id: string, data: Partial<AdminUser>) => {
    setSettings(prev => {
      const next = {
        ...prev,
        admins: prev.admins.map(a => (a.id === id ? { ...a, ...data } : a)),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteAdmin = useCallback((id: string) => {
    setSettings(prev => {
      const next = { ...prev, admins: prev.admins.filter(a => a.id !== id) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const validateAdmin = useCallback(
    (username: string, password: string): AdminUser | null => {
      return (
        settings.admins.find(
          a => a.username === username && a.password === password
        ) ?? null
      );
    },
    [settings.admins]
  );

  return (
    <SettingsContext.Provider
      value={{ settings, updateClinic, setLogo, addAdmin, updateAdmin, deleteAdmin, validateAdmin }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
