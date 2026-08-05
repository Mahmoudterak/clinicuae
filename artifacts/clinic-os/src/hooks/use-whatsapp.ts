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

// ── Types ──────────────────────────────────────────────────────────────────
export interface WaTemplate {
  id: number;
  name: string;
  nameAr: string;
  body: string;
  bodyAr: string;
  type: string;
  variables: string[];
  active: string;
  createdAt: string;
}

export interface WaMessage {
  id: number;
  patientId: number | null;
  patientPhone: string;
  patientName: string;
  templateId: number | null;
  body: string;
  status: string;
  waMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  simulated?: boolean;
}

// ── Templates ──────────────────────────────────────────────────────────────
export function useListWaTemplates() {
  return useQuery<WaTemplate[]>({ queryKey: ["wa-templates"], queryFn: () => apiFetch("/whatsapp/templates") });
}

export function useCreateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<WaTemplate, "id" | "createdAt">) =>
      apiFetch("/whatsapp/templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });
}

export function useUpdateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WaTemplate> & { id: number }) =>
      apiFetch(`/whatsapp/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });
}

export function useDeleteWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/whatsapp/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });
}

// ── Messages ───────────────────────────────────────────────────────────────
export function useListWaMessages() {
  return useQuery<WaMessage[]>({ queryKey: ["wa-messages"], queryFn: () => apiFetch("/whatsapp/messages"), refetchInterval: 10000 });
}

export function useSendWaMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { patientId?: number | null; patientPhone: string; patientName: string; templateId?: number | null; body: string }) =>
      apiFetch("/whatsapp/messages/send", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-messages"] }),
  });
}

export function useBulkSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { templateId: number; lang: "en" | "ar" }) =>
      apiFetch("/whatsapp/messages/bulk", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-messages"] }),
  });
}
