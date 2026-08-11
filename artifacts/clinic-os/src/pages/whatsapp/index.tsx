import { useState } from "react";
import { useTranslation } from "@/i18n/context";
import { useListDoctors, useListPatients } from "@workspace/api-client-react";
import {
  useListWaTemplates, useListWaMessages, useSendWaMessage, useBulkSend,
  useCreateWaTemplate, useUpdateWaTemplate, useDeleteWaTemplate,
  useWaStatus,
  type WaTemplate,
} from "@/hooks/use-whatsapp";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, FileText, History, Plus, Trash2, Pencil,
  Zap, CheckCircle2, XCircle, Clock, AlertCircle, Users, Wifi, WifiOff,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";

type Tab = "send" | "templates" | "history";

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string; icon: typeof CheckCircle2 }> = {
  sent:      { label: "Sent",      labelAr: "مُرسلة",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  simulated: { label: "Simulated", labelAr: "محاكاة",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",            icon: Wifi },
  failed:    { label: "Failed",    labelAr: "فاشلة",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                icon: XCircle },
  pending:   { label: "Pending",   labelAr: "انتظار",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         icon: Clock },
};

const TEMPLATE_TYPES = [
  { value: "reminder",  label: "Appointment Reminder",  labelAr: "تذكير موعد" },
  { value: "offer",     label: "Offer / Promotion",     labelAr: "عرض / ترويج" },
  { value: "followup",  label: "Follow-up",             labelAr: "متابعة" },
  { value: "custom",    label: "Custom",                labelAr: "مخصص" },
];

// ── Send Tab ─────────────────────────────────────────────────────────────────
function SendTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const { data: templates } = useListWaTemplates();
  const { data: patients } = useListPatients();
  const sendMsg = useSendWaMessage();
  const bulkSend = useBulkSend();

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [patientId, setPatientId] = useState<string>("");
  const [customPhone, setCustomPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [body, setBody] = useState("");
  const [bulkTemplateId, setBulkTemplateId] = useState<string>("");
  const [bulkLang, setBulkLang] = useState<"ar" | "en">("ar");
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const selectedPatient = patients?.find(p => p.id === Number(patientId));
  const selectedTemplate = templates?.find(t => t.id === Number(templateId));

  const applyTemplate = (tId: string) => {
    setTemplateId(tId);
    const tpl = templates?.find(t => t.id === Number(tId));
    if (tpl) setBody(isRtl ? tpl.bodyAr : tpl.body);
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    const phone = selectedPatient?.phone || customPhone;
    const name  = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : customName;
    if (!phone || !name) { toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "أدخل رقم الهاتف والاسم." : "Phone and name required.", variant: "destructive" }); return; }
    try {
      const result = await sendMsg.mutateAsync({ patientId: selectedPatient?.id ?? null, patientPhone: phone, patientName: name, templateId: templateId ? Number(templateId) : null, body });
      if (result.simulated) {
        toast({ title: isRtl ? "تمت المحاكاة ✓" : "Simulated ✓", description: isRtl ? "الرسالة محفوظة. أضف مفاتيح WhatsApp API لإرسال حقيقي." : "Message saved. Add WhatsApp API keys to send for real." });
      } else {
        toast({ title: isRtl ? "تم الإرسال ✓" : "Sent ✓", description: isRtl ? "تم إرسال الرسالة عبر واتساب." : "Message sent via WhatsApp." });
      }
      setBody(""); setPatientId(""); setCustomPhone(""); setCustomName(""); setTemplateId("");
    } catch { toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "فشل الإرسال." : "Send failed.", variant: "destructive" }); }
  };

  const handleBulk = async () => {
    if (!bulkTemplateId) return;
    try {
      const r = await bulkSend.mutateAsync({ templateId: Number(bulkTemplateId), lang: bulkLang });
      toast({ title: isRtl ? `تم الإرسال لـ ${r.sent} مريض` : `Sent to ${r.sent} patients`, description: isRtl ? `فشل: ${r.failed}` : `Failed: ${r.failed}` });
      setBulkConfirm(false);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mode selector */}
      <div className="lg:col-span-2 flex gap-2 p-1 bg-muted/50 rounded-2xl border w-fit">
        {(["single","bulk"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === m ? "bg-white dark:bg-card shadow-sm border text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {m === "single" ? <Send className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {m === "single" ? (isRtl ? "رسالة فردية" : "Single Message") : (isRtl ? "إرسال جماعي" : "Bulk Send")}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          {/* Recipient */}
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">{isRtl ? "المستقبل" : "Recipient"}</h3>
            <div className="space-y-1.5">
              <Label>{isRtl ? "اختر مريضاً (اختياري)" : "Select Patient (optional)"}</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder={isRtl ? "اختر مريضاً..." : "Choose patient..."} /></SelectTrigger>
                <SelectContent>
                  {patients?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.firstName} {p.lastName} — {p.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!patientId && (
              <>
                <div className="space-y-1.5">
                  <Label>{isRtl ? "الاسم" : "Name"}</Label>
                  <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder={isRtl ? "اسم المستقبل" : "Recipient name"} />
                </div>
                <div className="space-y-1.5">
                  <Label>{isRtl ? "رقم الهاتف" : "Phone Number"}</Label>
                  <Input value={customPhone} onChange={e => setCustomPhone(e.target.value)} placeholder="+971500000000" dir="ltr" />
                </div>
              </>
            )}
            {selectedPatient && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 text-sm">
                <p className="font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-muted-foreground" dir="ltr">{selectedPatient.phone}</p>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">{isRtl ? "الرسالة" : "Message"}</h3>
            <div className="space-y-1.5">
              <Label>{isRtl ? "قالب (اختياري)" : "Template (optional)"}</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue placeholder={isRtl ? "اختر قالباً..." : "Choose template..."} /></SelectTrigger>
                <SelectContent>
                  {templates?.map(t => <SelectItem key={t.id} value={String(t.id)}>{isRtl ? t.nameAr : t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "نص الرسالة" : "Message Body"}</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                placeholder={isRtl ? "اكتب رسالتك هنا..." : "Type your message..."}
                className="resize-none font-mono text-sm" />
              <p className="text-xs text-muted-foreground text-end">{body.length} {isRtl ? "حرف" : "chars"}</p>
            </div>
            <Button onClick={handleSend} disabled={sendMsg.isPending || !body.trim()} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {sendMsg.isPending ? (isRtl ? "جاري الإرسال..." : "Sending...") : (isRtl ? "إرسال" : "Send")}
            </Button>
          </div>
        </>
      ) : (
        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 space-y-5 max-w-xl">
          <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
            <Zap className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <p className="text-sm text-violet-800 dark:text-violet-300">
              {isRtl ? "سيتم إرسال الرسالة لجميع المرضى النشطين الذين لديهم رقم هاتف." : "Message will be sent to all active patients who have a phone number."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "القالب" : "Template"}</Label>
            <Select value={bulkTemplateId} onValueChange={setBulkTemplateId}>
              <SelectTrigger><SelectValue placeholder={isRtl ? "اختر قالباً..." : "Choose template..."} /></SelectTrigger>
              <SelectContent>{templates?.map(t => <SelectItem key={t.id} value={String(t.id)}>{isRtl ? t.nameAr : t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "لغة الإرسال" : "Language"}</Label>
            <Select value={bulkLang} onValueChange={v => setBulkLang(v as "ar"|"en")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bulkTemplateId && (
            <div className="bg-muted/50 rounded-xl p-4 border text-sm font-mono whitespace-pre-wrap">
              {bulkLang === "ar" ? templates?.find(t => String(t.id) === bulkTemplateId)?.bodyAr : templates?.find(t => String(t.id) === bulkTemplateId)?.body}
            </div>
          )}
          <Button onClick={() => setBulkConfirm(true)} disabled={!bulkTemplateId || bulkSend.isPending} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
            <Users className="h-4 w-4" />
            {isRtl ? "إرسال للجميع" : "Send to All Patients"}
          </Button>
          <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isRtl ? "تأكيد الإرسال الجماعي" : "Confirm Bulk Send"}</AlertDialogTitle>
                <AlertDialogDescription>{isRtl ? "سيتم إرسال رسالة لجميع المرضى النشطين. هل أنت متأكد؟" : "This will send a message to all active patients. Are you sure?"}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulk} className="bg-violet-600 hover:bg-violet-700">{isRtl ? "إرسال" : "Send"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const { data: templates, isLoading } = useListWaTemplates();
  const createTpl = useCreateWaTemplate();
  const updateTpl = useUpdateWaTemplate();
  const deleteTpl = useDeleteWaTemplate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const empty: { name: string; nameAr: string; body: string; bodyAr: string; type: string; variables: string[]; active: string } = { name: "", nameAr: "", body: "", bodyAr: "", type: "custom", variables: [], active: "true" };
  const [form, setForm] = useState(empty);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t: WaTemplate) => { setEditing(t); setForm({ name: t.name, nameAr: t.nameAr, body: t.body, bodyAr: t.bodyAr, type: t.type, variables: t.variables, active: t.active }); setOpen(true); };

  const save = async () => {
    try {
      if (editing) await updateTpl.mutateAsync({ id: editing.id, ...form });
      else await createTpl.mutateAsync(form as any);
      toast({ title: isRtl ? (editing ? "تم التحديث" : "تم الإنشاء") : (editing ? "Updated" : "Created") });
      setOpen(false);
    } catch { toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" }); }
  };

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="gap-2 rounded-xl"><Plus className="h-4 w-4" />{isRtl ? "قالب جديد" : "New Template"}</Button>
      </div>
      {!templates?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>{isRtl ? "لا توجد قوالب بعد" : "No templates yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => {
            const typeInfo = TEMPLATE_TYPES.find(x => x.value === t.type);
            return (
              <div key={t.id} className="bg-card border rounded-2xl p-5 space-y-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{isRtl ? t.nameAr : t.name}</p>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                      {isRtl ? typeInfo?.labelAr : typeInfo?.label}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap text-muted-foreground max-h-24 overflow-hidden">
                  {isRtl ? t.bodyAr : t.body}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? (isRtl ? "تعديل القالب" : "Edit Template") : (isRtl ? "قالب جديد" : "New Template")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>{isRtl ? "الاسم (إنجليزي)" : "Name (English)"}</Label><Input value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1.5"><Label>{isRtl ? "الاسم (عربي)" : "Name (Arabic)"}</Label><Input value={form.nameAr} onChange={set("nameAr")} dir="rtl" /></div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{isRtl ? "النوع" : "Type"}</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isRtl ? t.labelAr : t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{isRtl ? "النص (إنجليزي)" : "Body (English)"}</Label><Textarea value={form.body} onChange={set("body")} rows={4} className="font-mono text-sm resize-none" /></div>
            <div className="space-y-1.5"><Label>{isRtl ? "النص (عربي)" : "Body (Arabic)"}</Label><Textarea value={form.bodyAr} onChange={set("bodyAr")} rows={4} className="font-mono text-sm resize-none" dir="rtl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={save} disabled={createTpl.isPending || updateTpl.isPending}>{isRtl ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف القالب؟" : "Delete Template?"}</AlertDialogTitle>
            <AlertDialogDescription>{isRtl ? "لا يمكن التراجع." : "This cannot be undone."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => { await deleteTpl.mutateAsync(deleteId!); setDeleteId(null); }}>{isRtl ? "حذف" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const { isRtl } = useTranslation();
  const { data: messages, isLoading } = useListWaMessages();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? messages : messages?.filter(m => m.status === filter);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["all","sent","simulated","failed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {f === "all" ? (isRtl ? "الكل" : "All") : (isRtl ? STATUS_CONFIG[f]?.labelAr : STATUS_CONFIG[f]?.label)}
            <span className="ms-1.5 opacity-70">{messages?.filter(m => f === "all" || m.status === f).length ?? 0}</span>
          </button>
        ))}
      </div>

      {!filtered?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>{isRtl ? "لا توجد رسائل" : "No messages"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={m.id} className="bg-card border rounded-2xl p-4 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 text-green-600 text-lg font-bold">
                  W
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{m.patientName}</p>
                    <span className="text-xs text-muted-foreground" dir="ltr">{m.patientPhone}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {isRtl ? cfg.labelAr : cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{m.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(parseISO(m.createdAt), "MMM d, h:mm a")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const { isRtl } = useTranslation();
  const [tab, setTab] = useState<Tab>("send");
  const { data: messages } = useListWaMessages();
  const { data: waStatus } = useWaStatus();
  const hasCredentials = waStatus?.connected ?? false;

  const tabs: { id: Tab; label: string; labelAr: string; icon: typeof Send }[] = [
    { id: "send",      label: "Send Message",  labelAr: "إرسال رسالة", icon: Send },
    { id: "templates", label: "Templates",     labelAr: "القوالب",     icon: FileText },
    { id: "history",   label: "History",       labelAr: "السجل",       icon: History },
  ];

  const stats = {
    total: messages?.length ?? 0,
    sent: messages?.filter(m => m.status === "sent").length ?? 0,
    simulated: messages?.filter(m => m.status === "simulated").length ?? 0,
    failed: messages?.filter(m => m.status === "failed").length ?? 0,
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-green-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-green-500/30">W</div>
            {isRtl ? "واتساب الأعمال" : "WhatsApp Business"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{isRtl ? "إرسال رسائل تلقائية وتفاعلية للمرضى." : "Send automated and interactive messages to patients."}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border ${hasCredentials ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400"}`}>
          {hasCredentials ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {hasCredentials ? (isRtl ? "متصل بـ API" : "Connected to API") : (isRtl ? "وضع المحاكاة — أضف WHATSAPP_PHONE_ID و WHATSAPP_ACCESS_TOKEN" : "Simulation mode — add WHATSAPP_PHONE_ID & WHATSAPP_ACCESS_TOKEN")}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRtl ? "إجمالي الرسائل" : "Total Sent", value: stats.total, color: "from-slate-500 to-slate-600" },
          { label: isRtl ? "مُرسلة" : "Delivered",           value: stats.sent,      color: "from-emerald-500 to-green-600" },
          { label: isRtl ? "محاكاة" : "Simulated",           value: stats.simulated, color: "from-blue-500 to-indigo-600" },
          { label: isRtl ? "فاشلة" : "Failed",               value: stats.failed,    color: "from-red-500 to-rose-600" },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-sm`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm mt-1 text-white/80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl w-fit border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-white dark:bg-card text-primary shadow-sm border" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" />
            {isRtl ? t.labelAr : t.label}
          </button>
        ))}
      </div>

      {tab === "send"      && <SendTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "history"   && <HistoryTab />}
    </div>
  );
}
