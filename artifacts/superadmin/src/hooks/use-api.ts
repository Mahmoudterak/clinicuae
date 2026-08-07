import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api-client"
import { Clinic, DashboardStats } from "@/lib/types"

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => fetchApi('/stats'),
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
