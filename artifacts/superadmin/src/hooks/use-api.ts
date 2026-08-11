import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api-client"
import { Clinic, DashboardStats } from "@/lib/types"

export interface ClinicCredential {
  id: number
  username: string
  name: string
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => fetchApi('/stats'),
  })
}

export interface GrowthPoint { month: string; clinics: number }

export function useGrowthData() {
  return useQuery<GrowthPoint[]>({
    queryKey: ['superadmin', 'growth'],
    queryFn: () => fetchApi('/growth'),
  })
}

export function useClinics() {
  return useQuery<Clinic[]>({
    queryKey: ['superadmin', 'clinics'],
    queryFn: () => fetchApi('/clinics'),
  })
}

export function useCreateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Clinic>) => 
      fetchApi('/clinics', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'clinics'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stats'] });
    }
  })
}

export function useUpdateClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Clinic> }) => 
      fetchApi(`/clinics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'clinics'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stats'] });
    }
  })
}

export function useDeleteClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => 
      fetchApi(`/clinics/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'clinics'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'stats'] });
    }
  })
}

// ── Clinic Credentials ────────────────────────────────────────────────────────

export function useClinicCredentials(clinicId: number | null) {
  return useQuery<ClinicCredential[]>({
    queryKey: ['superadmin', 'credentials', clinicId],
    queryFn: () => fetchApi(`/clinics/${clinicId}/credentials`),
    enabled: clinicId !== null,
  })
}

export function useCreateClinicCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clinicId, data }: { clinicId: number; data: { username: string; password: string; name: string } }) =>
      fetchApi(`/clinics/${clinicId}/credentials`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'credentials', vars.clinicId] });
    },
  })
}

export function useResetClinicPassword() {
  return useMutation({
    mutationFn: ({ clinicId, userId, password }: { clinicId: number; userId: number; password: string }) =>
      fetchApi(`/clinics/${clinicId}/credentials/${userId}/reset-password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
  })
}

export function useImpersonateClinic() {
  return useMutation({
    mutationFn: (clinicId: number) =>
      fetchApi(`/clinics/${clinicId}/impersonate`, { method: 'POST' }) as Promise<{ token: string; clinicName: string; expiresIn: number }>,
  })
}

export function useDeleteClinicCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clinicId, userId }: { clinicId: number; userId: number }) =>
      fetchApi(`/clinics/${clinicId}/credentials/${userId}`, { method: 'DELETE' }),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'credentials', vars.clinicId] });
    },
  })
}
