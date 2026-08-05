import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export interface OnlineBooking {
  id: number;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  patientAge: number | null;
  patientGender: string | null;
  doctorId: number | null;
  doctorName: string | null;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  notes: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

export interface PublicDoctor {
  id: number;
  firstName: string;
  lastName: string;
  specialty: string;
  available: string;
}

// ── Admin hooks ────────────────────────────────────────────────────────────
export function useListBookings(status?: string) {
  return useQuery<OnlineBooking[]>({
    queryKey: ["bookings", status],
    queryFn: () => apiFetch(`/bookings${status ? `?status=${status}` : ""}`),
    refetchInterval: 15000,
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; adminNotes?: string }) =>
      apiFetch(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

// ── Public hooks (no auth) ─────────────────────────────────────────────────
export function usePublicDoctors() {
  return useQuery<PublicDoctor[]>({
    queryKey: ["public-doctors"],
    queryFn: () => apiFetch("/public/doctors"),
  });
}

export function useBookedSlots(doctorId: number | null, date: string) {
  return useQuery<string[]>({
    queryKey: ["booked-slots", doctorId, date],
    queryFn: () => apiFetch(`/public/booked-slots?doctorId=${doctorId}&date=${date}`),
    enabled: !!doctorId && !!date,
  });
}

export function useCreatePublicBooking() {
  return useMutation({
    mutationFn: (data: {
      patientName: string; patientPhone: string; patientEmail?: string;
      patientAge?: number; patientGender?: string;
      doctorId?: number; preferredDate: string; preferredTime: string; reason: string; notes?: string;
    }) => apiFetch("/public/bookings", { method: "POST", body: JSON.stringify(data) }),
  });
}
