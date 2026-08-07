import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import { Zap, Plus, Trash2, Play, CheckCircle2, XCircle, ToggleLeft, ToggleRight, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";

// ── types ─────────────────────────────────────────────────────────────────────
interface ZapierWebhook {
  id: number;
  name: string;
  event: string;
  webhookUrl: string;
  active: boolean;
  description: string | null;
  lastFiredAt: string | null;
  createdAt: string;
}

interface ZapierEvent {
  value: string;
  label: string;
  labelEn: string;
}

interface ZapierLog {
  id: number;
  webhookId: number;
  event: string;
  statusCode: string;
  success: boolean;
  createdAt: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(token?: string): HeadersInit {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

// ── hooks ─────────────────────────────────────────────────────────────────────
function useZapierWebhooks(token?: string) {
  return useQuery<ZapierWebhook[]>({
    queryKey: ["zapier-webhooks", token],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/zapier/webhooks`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });
}

function useZapierEvents() {
  return useQuery<ZapierEvent[]>({
    queryKey: ["zapier-events"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/zapier/events`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

function useZapierLogs(token?: string) {
  return useQuery<ZapierLog[]>({
    queryKey: ["zapier-logs", token],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/zapier/logs`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
    refetchInterval: 10000,
  });
}

// ── event badge color ─────────────────────────────────────────────────────────
function eventColor(event: string) {
  const map: Record<string, string> = {
    new_patient:     "bg-blue-100 text-blue-700",
    new_appointment: "bg-purple-100 text-purple-700",
    new_invoice:     "bg-yellow-100 text-yellow-700",
    invoice_paid:    "bg-green-100 text-green-700",
    new_booking:     "bg-indigo-100 text-indigo-700",
  };
  return map[event] ?? "bg-gray-100 text-gray-700";
}

// ── empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-orange-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد تكاملات Zapier</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6 text-sm">
        أضف Webhook لربط Clinic OS بآلاف التطبيقات عبر Zapier بدون أي كود.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="w-4 h-4" /> إضافة أول تكامل
      </Button>
    </div>
  );
}

// ── webhook card ──────────────────────────────────────────────────────────────
function WebhookCard({
  hook,
  events,
  onToggle,
  onDelete,
  onTest,
  testing,
}: {
  hook: ZapierWebhook;
  events: ZapierEvent[];
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
  onTest: (id: number) => void;
  testing: number | null;
}) {
  const ev = events.find(e => e.value === hook.event);
  const testingThis = testing === hook.id;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${hook.active ? "border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-70"}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white truncate">{hook.name}</div>
            {hook.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{hook.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs font-medium px-2 py-1 rounded-lg border-0 ${eventColor(hook.event)}`}>
            {ev?.label ?? hook.event}
          </Badge>
          <button
            onClick={() => onToggle(hook.id, !hook.active)}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title={hook.active ? "تعطيل" : "تفعيل"}
          >
            {hook.active
              ? <ToggleRight className="w-7 h-7 text-indigo-500" />
              : <ToggleLeft className="w-7 h-7" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4 font-mono truncate">
        <ExternalLink className="w-3 h-3 shrink-0" />
        <span className="truncate">{hook.webhookUrl}</span>
      </div>

      {hook.lastFiredAt && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          آخر تشغيل: {new Date(hook.lastFiredAt).toLocaleString("ar-AE")}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onTest(hook.id)}
          disabled={testingThis}
        >
          {testingThis
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Play className="w-3 h-3" />}
          اختبار
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() => onDelete(hook.id)}
        >
          <Trash2 className="w-3 h-3" />
          حذف
        </Button>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ZapierPage() {
  const { isRtl } = useTranslation();
  const { role, token } = useAuth();
  const qc = useQueryClient();

  const { data: webhooks = [], isLoading } = useZapierWebhooks(token);
  const { data: events = [] } = useZapierEvents();
  const { data: logs = [] } = useZapierLogs(token);

  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", event: "", webhookUrl: "", description: "" });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch(`${BASE}/api/zapier/webhooks`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zapier-webhooks"] });
      setOpen(false);
      setForm({ name: "", event: "", webhookUrl: "", description: "" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const r = await fetch(`${BASE}/api/zapier/webhooks/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ active }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zapier-webhooks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/zapier/webhooks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zapier-webhooks"] }),
  });

  const handleTest = async (id: number) => {
    setTesting(id);
    setTestResult(null);
    try {
      const r = await fetch(`${BASE}/api/zapier/webhooks/${id}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await r.json();
      setTestResult({ id, success: data.success });
      setTimeout(() => setTestResult(null), 4000);
    } catch {
      setTestResult({ id, success: false });
      setTimeout(() => setTestResult(null), 4000);
    } finally {
      setTesting(null);
      qc.invalidateQueries({ queryKey: ["zapier-logs"] });
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <AlertCircle className="w-6 h-6 mr-2" /> هذه الصفحة للمديرين فقط
      </div>
    );
  }

  const recentLogs = logs.slice(0, 8);

  return (
    <div className={`p-6 max-w-6xl mx-auto ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              تكامل Zapier
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mr-13">
            ربط Clinic OS بآلاف التطبيقات تلقائياً — بدون كود
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://zapier.com/apps/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange-600 hover:text-orange-700 underline-offset-4 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح Zapier
          </a>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4" />
            إضافة Webhook
          </Button>
        </div>
      </div>

      {/* Info strip */}
      <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 p-4 mb-8 flex items-start gap-3">
        <Zap className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
        <div className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
          <strong>كيف يعمل؟</strong> انشئ Webhook في Zapier من نوع "Catch Hook" ← انسخ رابط الـ Webhook ← أضفه هنا. سيقوم Clinic OS بإرسال بيانات الحدث تلقائياً لـ Zapier الذي يحولها لأي تطبيق تختاره.
        </div>
      </div>

      {/* Webhooks grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {webhooks.map(hook => (
              <div key={hook.id} className="relative">
                <WebhookCard
                  hook={hook}
                  events={events}
                  onToggle={(id, active) => toggleMutation.mutate({ id, active })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onTest={handleTest}
                  testing={testing}
                />
                {testResult?.id === hook.id && (
                  <div className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${testResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {testResult.success
                      ? <><CheckCircle2 className="w-3 h-3" /> نجح الإرسال</>
                      : <><XCircle className="w-3 h-3" /> فشل الإرسال</>
                    }
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Logs section */}
          {recentLogs.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">آخر السجلات</h2>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الحدث</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentLogs.map(log => (
                      <tr key={log.id} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${eventColor(log.event)}`}>
                            {events.find(e => e.value === log.event)?.label ?? log.event}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {log.success
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            <span className={`text-xs font-mono ${log.success ? "text-green-600" : "text-red-500"}`}>
                              {log.statusCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString("ar-AE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              إضافة تكامل Zapier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم التكامل</Label>
              <Input
                placeholder="مثال: إشعار Slack بمريض جديد"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>الحدث</Label>
              <Select value={form.event} onValueChange={v => setForm(p => ({ ...p, event: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحدث الذي يُشغّل الـ Webhook" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.value} value={ev.value}>
                      {ev.label} — <span className="text-gray-400 text-xs">{ev.labelEn}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>رابط Zapier Webhook</Label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={form.webhookUrl}
                onChange={e => setForm(p => ({ ...p, webhookUrl: e.target.value }))}
                dir="ltr"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400">يجب أن يبدأ الرابط بـ https://hooks.zapier.com/</p>
            </div>
            <div className="space-y-1.5">
              <Label>وصف (اختياري)</Label>
              <Input
                placeholder="وصف مختصر لهذا التكامل"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            {createMutation.isError && (
              <p className="text-xs text-red-500">{(createMutation.error as Error).message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.event || !form.webhookUrl || createMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
