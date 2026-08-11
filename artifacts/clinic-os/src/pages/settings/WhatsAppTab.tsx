import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, Eye, EyeOff, Save, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("clinic-os-token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface Settings {
  whatsappPhoneId?: string | null;
  whatsappAccessToken?: string | null;
}

export default function WhatsAppTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiFetch("/api/settings"),
  });

  const { data: status } = useQuery<{ connected: boolean }>({
    queryKey: ["wa-status"],
    queryFn: () => apiFetch("/api/whatsapp/status"),
    staleTime: 0,
  });

  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form once settings load
  if (settings && !initialized) {
    setPhoneId(settings.whatsappPhoneId ?? "");
    setToken(settings.whatsappAccessToken ?? "");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          whatsappPhoneId: phoneId.trim() || null,
          whatsappAccessToken: token.trim() || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["wa-status"] });
      toast({ title: isRtl ? "تم الحفظ ✓" : "Saved ✓" });
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ whatsappPhoneId: null, whatsappAccessToken: null }),
      }),
    onSuccess: () => {
      setPhoneId("");
      setToken("");
      setInitialized(false);
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["wa-status"] });
      toast({ title: isRtl ? "تم مسح بيانات واتساب" : "WhatsApp credentials cleared" });
    },
  });

  const connected = status?.connected ?? false;

  return (
    <div className="space-y-6 max-w-xl">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
        connected
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800"
          : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
      }`}>
        {connected
          ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          : <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />}
        <div>
          <p className={`font-semibold text-sm ${connected ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
            {connected
              ? (isRtl ? "متصل بـ WhatsApp Business API" : "Connected to WhatsApp Business API")
              : (isRtl ? "وضع المحاكاة — الرسائل لا تُرسَل فعلياً" : "Simulation mode — messages are not sent for real")}
          </p>
          <p className={`text-xs mt-0.5 ${connected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {connected
              ? (isRtl ? "الرسائل تُرسَل عبر WhatsApp API الحقيقي" : "Messages are sent via the real WhatsApp API")
              : (isRtl ? "أدخل بياناتك أدناه لتفعيل الإرسال الحقيقي" : "Enter your credentials below to enable real sending")}
          </p>
        </div>
      </div>

      {/* How to get credentials */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h4 className="font-semibold text-sm">{isRtl ? "كيفية الحصول على بيانات API" : "How to get your API credentials"}</h4>
        <ol className={`text-sm text-muted-foreground space-y-1.5 list-decimal ${isRtl ? "me-4" : "ms-4"}`}>
          <li>{isRtl ? "اذهب إلى" : "Go to"} <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="h-3 w-3" /></a></li>
          <li>{isRtl ? "أنشئ تطبيقاً من نوع Business وأضف منتج WhatsApp" : "Create a Business app and add the WhatsApp product"}</li>
          <li>{isRtl ? "من WhatsApp → API Setup انسخ Phone Number ID وAccess Token" : "From WhatsApp → API Setup, copy the Phone Number ID and Access Token"}</li>
          <li>{isRtl ? "ألصقهما أدناه واضغط حفظ" : "Paste them below and click Save"}</li>
        </ol>
      </div>

      {/* Credentials form */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h4 className="font-semibold text-sm">{isRtl ? "بيانات الاتصال" : "API Credentials"}</h4>

        <div className="space-y-1.5">
          <Label>{isRtl ? "Phone Number ID" : "Phone Number ID"}</Label>
          <Input
            dir="ltr"
            placeholder="1234567890"
            value={phoneId}
            onChange={e => setPhoneId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {isRtl ? "تجده في WhatsApp → API Setup في Meta for Developers" : "Found in WhatsApp → API Setup on Meta for Developers"}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>{isRtl ? "Access Token" : "Access Token"}</Label>
          <div className="relative">
            <Input
              dir="ltr"
              type={showToken ? "text" : "password"}
              placeholder="EAAxxxxxxxx..."
              value={token}
              onChange={e => setToken(e.target.value)}
              className="pe-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowToken(p => !p)}
              className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isRtl ? "يُخزَّن بشكل آمن ومشفر في قاعدة البيانات" : "Stored securely encrypted in the database"}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!phoneId.trim() && !token.trim())}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {saveMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
            {isRtl ? "حفظ" : "Save"}
          </Button>
          {connected && (
            <Button
              variant="outline"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
            >
              {isRtl ? "قطع الاتصال" : "Disconnect"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
