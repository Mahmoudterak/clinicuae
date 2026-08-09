import { createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  useListAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
  getGetSettingsQueryKey,
  getListAdminUsersQueryKey,
} from "@workspace/api-client-react";
import type { ClinicSettings as ApiClinicSettings, AdminUser as ApiAdminUser } from "@workspace/api-client-react";

// Re-export types used by consumers
export type ClinicSettings = {
  clinicName: string;
  clinicNameAr: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  logoDataUrl: string | null;
};

export type AdminUser = {
  id: number;
  username: string;
  name: string;
  createdAt: string;
};

/** Input for creating a new admin — password is required */
export type AdminUserInput = {
  username: string;
  password: string;
  name: string;
};

/** Input for updating an admin — all fields optional */
export type AdminUserUpdate = {
  username?: string;
  password?: string;
  name?: string;
};

export interface SettingsState {
  clinic: ClinicSettings;
  admins: AdminUser[];
}

const DEFAULT_CLINIC: ClinicSettings = {
  clinicName: "Clinic OS",
  clinicNameAr: "كلينيك OS",
  address: "",
  phone: "",
  email: "",
  website: "",
  currency: "AED",
  timezone: "Asia/Dubai",
  logoDataUrl: null,
};

function toClinicSettings(api: ApiClinicSettings): ClinicSettings {
  return {
    clinicName: api.clinicName,
    clinicNameAr: api.clinicNameAr,
    address: api.address,
    phone: api.phone,
    email: api.email,
    website: api.website,
    currency: api.currency,
    timezone: api.timezone,
    logoDataUrl: api.logoDataUrl ?? null,
  };
}

function toAdminUser(api: ApiAdminUser): AdminUser {
  return {
    id: api.id,
    username: api.username,
    name: api.name,
    createdAt: api.createdAt,
  };
}

interface SettingsContextType {
  settings: SettingsState;
  isLoading: boolean;
  updateClinic: (data: Partial<ClinicSettings>) => Promise<void>;
  setLogo: (dataUrl: string | null) => Promise<void>;
  addAdmin: (user: AdminUserInput) => Promise<void>;
  updateAdmin: (id: number, data: AdminUserUpdate) => Promise<void>;
  deleteAdmin: (id: number) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading: settingsLoading } = useGetSettings();
  const { data: adminsData, isLoading: adminsLoading } = useListAdminUsers();

  const updateSettingsMutation = useUpdateSettings();
  const createAdminMutation = useCreateAdminUser();
  const updateAdminMutation = useUpdateAdminUser();
  const deleteAdminMutation = useDeleteAdminUser();

  const clinic: ClinicSettings = settingsData ? toClinicSettings(settingsData) : DEFAULT_CLINIC;
  const admins: AdminUser[] = adminsData ? adminsData.map(toAdminUser) : [];
  const isLoading = settingsLoading || adminsLoading;

  const settings: SettingsState = { clinic, admins };

  const invalidateSettings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
  }, [queryClient]);

  const invalidateAdmins = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
  }, [queryClient]);

  const updateClinic = useCallback(async (data: Partial<ClinicSettings>) => {
    const current = settingsData ? toClinicSettings(settingsData) : DEFAULT_CLINIC;
    await updateSettingsMutation.mutateAsync({ data: { ...current, ...data } });
    invalidateSettings();
  }, [settingsData, updateSettingsMutation, invalidateSettings]);

  const setLogo = useCallback(async (dataUrl: string | null) => {
    await updateClinic({ logoDataUrl: dataUrl });
  }, [updateClinic]);

  const addAdmin = useCallback(async (user: AdminUserInput) => {
    await createAdminMutation.mutateAsync({ data: user });
    invalidateAdmins();
  }, [createAdminMutation, invalidateAdmins]);

  const updateAdmin = useCallback(async (id: number, data: AdminUserUpdate) => {
    await updateAdminMutation.mutateAsync({ id, data });
    invalidateAdmins();
  }, [updateAdminMutation, invalidateAdmins]);

  const deleteAdmin = useCallback(async (id: number) => {
    await deleteAdminMutation.mutateAsync({ id });
    invalidateAdmins();
  }, [deleteAdminMutation, invalidateAdmins]);

  return (
    <SettingsContext.Provider
      value={{ settings, isLoading, updateClinic, setLogo, addAdmin, updateAdmin, deleteAdmin }}
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
