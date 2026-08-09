import { useState, useRef } from "react";
import { useSettings, AdminUser } from "@/contexts/settings-context";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, ImageIcon, Eye, EyeOff, Plus, Trash2,
  ShieldCheck, Save, Upload, X, Key, Globe, Phone, Mail,
  MapPin, Clock, Lock, Pencil, Loader2, Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import logoUrl from "@/assets/clinic-os-logo.png";

import DoctorAccountsTab from "./DoctorAccountsTab";
import BranchesTab from "./BranchesTab";
import StaffTab from "./StaffTab";
import { getLogoSrc } from "@/lib/logo-utils";

type Tab = "clinic" | "users" | "logo" | "doctors" | "branches" | "staff";

// ─── helpers ────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
      <Label className="sm:text-end text-sm text-muted-foreground pt-2">{label}</Label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

// ─── Clinic Info Tab ─────────────────────────────────────────────────────────
function ClinicTab() {
  const { settings, updateClinic } = useSettings();
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...settings.clinic });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await updateClinic(form);
      toast({ title: isRtl ? "تم الحفظ" : "Settings saved", description: isRtl ? "تم تحديث بيانات العيادة بنجاح." : "Clinic information updated." });
    } catch {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "فشل حفظ الإعدادات." : "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Clinic Identity */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          {isRtl ? "هوية العيادة" : "Clinic Identity"}
        </h3>
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <FieldRow label={isRtl ? "اسم العيادة (إنجليزي)" : "Clinic Name (English)"}>
            <Input value={form.clinicName} onChange={set("clinicName")} placeholder="Clinic OS" />
          </FieldRow>
          <FieldRow label={isRtl ? "اسم العيادة (عربي)" : "Clinic Name (Arabic)"}>
            <Input value={form.clinicNameAr} onChange={set("clinicNameAr")} placeholder="كلينيك OS" dir="rtl" />
          </FieldRow>
          <FieldRow label={isRtl ? "العنوان" : "Address"}>
            <Input value={form.address} onChange={set("address")} placeholder={isRtl ? "المدينة، الدولة" : "City, Country"} />
          </FieldRow>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          {isRtl ? "معلومات التواصل" : "Contact Information"}
        </h3>
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <FieldRow label={isRtl ? "رقم الهاتف" : "Phone"}>
            <div className="relative">
              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.phone} onChange={set("phone")} className="ps-9" placeholder="+971 xx xxx xxxx" dir="ltr" />
            </div>
          </FieldRow>
          <FieldRow label={isRtl ? "البريد الإلكتروني" : "Email"}>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.email} onChange={set("email")} className="ps-9" placeholder="info@clinic.com" dir="ltr" />
            </div>
          </FieldRow>
          <FieldRow label={isRtl ? "الموقع الإلكتروني" : "Website"}>
            <div className="relative">
              <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.website} onChange={set("website")} className="ps-9" placeholder="https://clinic.com" dir="ltr" />
            </div>
          </FieldRow>
        </div>
      </section>

      {/* Regional */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          {isRtl ? "الإعدادات الإقليمية" : "Regional Settings"}
        </h3>
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <FieldRow label={isRtl ? "العملة" : "Currency"}>
            <Input value={form.currency} onChange={set("currency")} placeholder="AED" />
          </FieldRow>
          <FieldRow label={isRtl ? "المنطقة الزمنية" : "Timezone"}>
            <div className="relative">
              <Clock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.timezone} onChange={set("timezone")} className="ps-9" placeholder="Asia/Dubai" dir="ltr" />
            </div>
          </FieldRow>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2 rounded-xl px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? "حفظ التغييرات" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const { settings, addAdmin, updateAdmin, deleteAdmin } = useSettings();
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [showFormPass, setShowFormPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditTarget(null);
    setForm({ username: "", password: "", name: "" });
    setShowFormPass(false);
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditTarget(u);
    setForm({ username: u.username, password: u.password, name: u.name });
    setShowFormPass(false);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "يرجى ملء جميع الحقول." : "Please fill all fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateAdmin(editTarget.id, form);
        toast({ title: isRtl ? "تم التحديث" : "Updated", description: isRtl ? "تم تحديث بيانات المستخدم." : "User updated successfully." });
      } else {
        await addAdmin(form);
        toast({ title: isRtl ? "تم الإضافة" : "Added", description: isRtl ? "تم إضافة المستخدم." : "User added successfully." });
      }
      setModalOpen(false);
    } catch (err: any) {
      const msg = err?.message?.includes("already exists")
        ? (isRtl ? "اسم المستخدم موجود مسبقاً." : "Username already exists.")
        : (isRtl ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
      toast({ title: isRtl ? "خطأ" : "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    if (settings.admins.length === 1) {
      toast({ title: isRtl ? "خطأ" : "Cannot delete", description: isRtl ? "يجب أن يكون هناك مدير واحد على الأقل." : "At least one admin must remain.", variant: "destructive" });
      setDeleteId(null);
      return;
    }
    try {
      await deleteAdmin(deleteId);
      toast({ title: isRtl ? "تم الحذف" : "Deleted", description: isRtl ? "تم حذف المستخدم." : "User deleted." });
    } catch {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "فشل حذف المستخدم." : "Failed to delete user.", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isRtl ? `${settings.admins.length} حسابات إدارية` : `${settings.admins.length} admin account${settings.admins.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {isRtl ? "إضافة مدير" : "Add Admin"}
        </Button>
      </div>

      <div className="space-y-3">
        {settings.admins.map(u => (
          <div key={u.id} className="bg-card border rounded-2xl p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{u.name}</p>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  <span dir="ltr">{u.username}</span>
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span dir="ltr" className="font-mono">
                    {showPasswords[u.id] ? u.password : "•".repeat(Math.min(u.password.length, 10))}
                  </span>
                  <button
                    onClick={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords[u.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(u)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(u.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editTarget ? (isRtl ? "تعديل المدير" : "Edit Admin") : (isRtl ? "إضافة مدير جديد" : "Add New Admin")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRtl ? "الاسم الكامل" : "Full Name"}</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={isRtl ? "د. محمد أحمد" : "Dr. John Smith"} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "اسم المستخدم" : "Username"}</Label>
              <Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="admin" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "كلمة المرور" : "Password"}</Label>
              <div className="relative">
                <Input
                  type={showFormPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pe-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPass(p => !p)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showFormPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editTarget ? (isRtl ? "حفظ" : "Save") : (isRtl ? "إضافة" : "Add"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف المستخدم؟" : "Delete User?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? "لن تتمكن من التراجع عن هذا الإجراء." : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Logo Tab ─────────────────────────────────────────────────────────────────
function LogoTab() {
  const { settings, setLogo } = useSettings();
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const { bearerHeader } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "يرجى اختيار ملف صورة." : "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: isRtl ? "الملف كبير جداً" : "File too large", description: isRtl ? "الحجم الأقصى هو 2 ميغابايت." : "Maximum file size is 2 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Upload the raw file bytes directly to the API (server validates MIME/size before writing to GCS)
      const uploadRes = await fetch("/api/storage/uploads/logo", {
        method: "POST",
        headers: { "Content-Type": file.type, ...bearerHeader },
        body: file,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Failed to upload logo");
      }
      const { objectPath } = await uploadRes.json();

      // Save the object path in settings (replaces old base64 approach)
      await setLogo(objectPath);
      toast({ title: isRtl ? "تم رفع الشعار" : "Logo updated", description: isRtl ? "تم تحديث الشعار بنجاح." : "Your logo is now live across the app." });
    } catch {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "فشل تحديث الشعار." : "Failed to update logo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const currentLogo = getLogoSrc(settings.clinic.logoDataUrl, logoUrl);

  return (
    <div className="space-y-8 max-w-lg">
      {/* Preview */}
      <div className="bg-card border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-5">
          {isRtl ? "الشعار الحالي" : "Current Logo"}
        </h3>
        <div className="flex items-center gap-6">
          {/* Sidebar preview */}
          <div className="bg-gradient-to-b from-[#312E81] to-[#4338CA] rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <img src={currentLogo} alt="Logo" className="h-8 w-8 object-contain brightness-0 invert" />
            <span className="font-bold text-white text-sm">{settings.clinic.clinicName}</span>
          </div>
          {/* Light preview */}
          <div className="bg-white border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <img src={currentLogo} alt="Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-slate-800 text-sm">{settings.clinic.clinicName}</span>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {isRtl ? "رفع شعار جديد" : "Upload New Logo"}
        </h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">{isRtl ? "اسحب الشعار هنا أو انقر للاختيار" : "Drag & drop or click to select"}</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — {isRtl ? "حتى 2 ميغابايت" : "up to 2 MB"}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
          />
        </div>

        {settings.clinic.logoDataUrl && (
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={async () => {
              try {
                await setLogo(null);
                toast({ title: isRtl ? "تمت الإعادة" : "Reset", description: isRtl ? "تمت استعادة الشعار الافتراضي." : "Default logo restored." });
              } catch {
                toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "فشل إعادة الشعار." : "Failed to reset logo.", variant: "destructive" });
              }
            }}
          >
            <X className="h-4 w-4" />
            {isRtl ? "إعادة الشعار الافتراضي" : "Restore Default Logo"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { role } = useAuth();
  const { isRtl } = useTranslation();
  const [tab, setTab] = useState<Tab>("clinic");

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold mb-2">{isRtl ? "غير مصرح" : "Admin Only"}</h2>
        <p className="text-muted-foreground text-sm">{isRtl ? "هذه الصفحة مخصصة للمديرين فقط." : "This page is only accessible to administrators."}</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; labelAr: string; icon: React.ElementType }[] = [
    { id: "clinic",   label: "Clinic Info",       labelAr: "بيانات العيادة",     icon: Building2 },
    { id: "branches", label: "Branches",          labelAr: "الفروع",             icon: MapPin },
    { id: "users",    label: "Admins",            labelAr: "المديرون",           icon: Users },
    { id: "doctors",  label: "Doctors",           labelAr: "الأطباء",            icon: Stethoscope },
    { id: "staff",    label: "Staff",             labelAr: "الموظفون",           icon: Users },
    { id: "logo",     label: "Logo",              labelAr: "الشعار",             icon: ImageIcon },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "الإعدادات" : "Settings"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{isRtl ? "إدارة بيانات المنصة والمستخدمين والشعار." : "Manage platform data, users, and branding."}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl w-fit border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-card text-primary shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {isRtl ? t.labelAr : t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "clinic"   && <ClinicTab />}
      {tab === "branches" && <BranchesTab />}
      {tab === "users"    && <UsersTab />}
      {tab === "doctors"  && <DoctorAccountsTab />}
      {tab === "staff"    && <StaffTab />}
      {tab === "logo"     && <LogoTab />}
    </div>
  );
}
