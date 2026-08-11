import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Plus, Trash2, Loader2, User, Phone, Mail,
  Pencil, Briefcase, UserCircle2, Calculator,
  ClipboardList, HeartPulse, ChevronDown, ChevronUp,
  ShieldCheck, KeyRound, Ban, CheckCircle2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Role config ──────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { value: "nurse",        labelAr: "ممرضة / ممرض",       labelEn: "Nurse",         icon: HeartPulse,    color: "bg-rose-50 text-rose-600 border-rose-200" },
  { value: "receptionist", labelAr: "موظف استقبال",        labelEn: "Receptionist",  icon: ClipboardList, color: "bg-sky-50 text-sky-600 border-sky-200" },
  { value: "accountant",   labelAr: "محاسب",               labelEn: "Accountant",    icon: Calculator,    color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { value: "employee",     labelAr: "موظف",                labelEn: "Employee",      icon: Briefcase,     color: "bg-slate-50 text-slate-600 border-slate-200" },
] as const;

type StaffRoleValue = typeof STAFF_ROLES[number]["value"];

function getRoleConfig(role: string) {
  return STAFF_ROLES.find(r => r.value === role) ?? {
    value: role, labelAr: role, labelEn: role,
    icon: User, color: "bg-slate-50 text-slate-600 border-slate-200",
  };
}

// ─── The full tenant role hierarchy (display only) ────────────────────────────
const HIERARCHY = [
  { role: "clinic_owner", labelAr: "مالك العيادة",   labelEn: "Clinic Owner", icon: UserCircle2, color: "bg-indigo-50 text-indigo-600 border-indigo-200", note: "وصول كامل", managed: false },
  { role: "doctor",       labelAr: "طبيب",            labelEn: "Doctor",       icon: HeartPulse,  color: "bg-violet-50 text-violet-600 border-violet-200",  note: "ملفات المرضى والمواعيد", managed: false },
  { role: "nurse",        labelAr: "ممرضة / ممرض",   labelEn: "Nurse",        icon: HeartPulse,  color: "bg-rose-50 text-rose-600 border-rose-200",        note: "المواعيد والرعاية", managed: true },
  { role: "receptionist", labelAr: "موظف استقبال",   labelEn: "Receptionist", icon: ClipboardList,color:"bg-sky-50 text-sky-600 border-sky-200",           note: "الحجوزات والمدفوعات", managed: true },
  { role: "accountant",   labelAr: "محاسب",           labelEn: "Accountant",   icon: Calculator,  color: "bg-emerald-50 text-emerald-600 border-emerald-200",note: "الفواتير والمالية", managed: true },
  { role: "employee",     labelAr: "موظف",            labelEn: "Employee",     icon: Briefcase,   color: "bg-slate-50 text-slate-600 border-slate-200",     note: "صلاحيات محدودة", managed: true },
];

// ─── Staff types ──────────────────────────────────────────────────────────────
interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  createdAt: string;
}

interface StaffForm {
  firstName: string;
  lastName: string;
  role: StaffRoleValue | "";
  phone: string;
  email: string;
}

const emptyForm: StaffForm = { firstName: "", lastName: "", role: "", phone: "", email: "" };

// ─── Admin user types ─────────────────────────────────────────────────────────
interface AdminUser {
  id: number;
  username: string;
  name: string;
  status: string;
  createdAt: string;
}

interface AdminUserForm {
  username: string;
  name: string;
  password: string;
}

const emptyAdminForm: AdminUserForm = { username: "", name: "", password: "" };

// ─── Staff API hooks ──────────────────────────────────────────────────────────
function useStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/staff`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<StaffForm, "role"> & { role: string }) => {
      const r = await fetch(`${BASE}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StaffForm> }) => {
      const r = await fetch(`${BASE}/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/staff/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

// ─── Admin user API hooks ─────────────────────────────────────────────────────
function useAdminUsers() {
  const { bearerHeader } = useAuth();
  return useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin-users`, { headers: bearerHeader });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

function useCreateAdminUser() {
  const { bearerHeader } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdminUserForm) => {
      const r = await fetch(`${BASE}/api/admin-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...bearerHeader },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

function useUpdateAdminUser() {
  const { bearerHeader } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AdminUserForm & { status: string }> }) => {
      const r = await fetch(`${BASE}/api/admin-users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...bearerHeader },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

function useDeleteAdminUser() {
  const { bearerHeader } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/admin-users/${id}`, {
        method: "DELETE",
        headers: bearerHeader,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const cfg = getRoleConfig(role);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.labelAr}
    </span>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────
function StaffCard({
  member, onEdit, onDelete,
}: { member: StaffMember; onEdit: (m: StaffMember) => void; onDelete: (m: StaffMember) => void }) {
  return (
    <div className="bg-card border rounded-2xl p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0 font-bold text-sm text-slate-600 dark:text-slate-200">
        {member.firstName[0]}{member.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <RoleBadge role={member.role} />
          {member.phone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />{member.phone}
            </span>
          )}
          {member.email && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />{member.email}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onEdit(member)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(member)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Admin User Card ──────────────────────────────────────────────────────────
function AdminUserCard({
  user,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling,
}: {
  user: AdminUser;
  onEdit: (u: AdminUser) => void;
  onDelete: (u: AdminUser) => void;
  onToggleStatus: (u: AdminUser) => void;
  isToggling: boolean;
}) {
  const isSuspended = user.status === "suspended";
  const initials = user.name
    .split(" ")
    .map(w => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || (user.username[0]?.toUpperCase() ?? "A");

  return (
    <div className={`bg-card border rounded-2xl p-4 flex items-center gap-3 ${isSuspended ? "opacity-60" : ""}`}>
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-200 to-indigo-300 dark:from-indigo-800 dark:to-indigo-700 flex items-center justify-center shrink-0 font-bold text-sm text-indigo-700 dark:text-indigo-200">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{user.name}</p>
          {isSuspended && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
              <Ban className="h-2.5 w-2.5" />
              معطّل
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          {user.username}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-xl"
          title={isSuspended ? "تفعيل الحساب" : "تعطيل الحساب"}
          onClick={() => onToggleStatus(user)}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSuspended ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Ban className="h-3.5 w-3.5 text-amber-500" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onEdit(user)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Admin Users Section ──────────────────────────────────────────────────────
function AdminUsersSection({ isRtl }: { isRtl: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [form, setForm] = useState<AdminUserForm>(emptyAdminForm);
  const [showPassword, setShowPassword] = useState(false);

  const { data: admins = [], isLoading } = useAdminUsers();
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyAdminForm);
    setShowPassword(true);
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditTarget(u);
    setForm({ username: u.username, name: u.name, password: "" });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.name.trim()) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: isRtl ? "اسم المستخدم والاسم الكامل مطلوبان." : "Username and full name are required.",
        variant: "destructive",
      });
      return;
    }
    if (!editTarget && !form.password.trim()) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: isRtl ? "كلمة المرور مطلوبة عند إنشاء مستخدم جديد." : "Password is required for new users.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editTarget) {
        const payload: Partial<AdminUserForm> = { username: form.username, name: form.name };
        if (form.password.trim()) payload.password = form.password;
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast({ title: isRtl ? "تم التحديث" : "Updated" });
      } else {
        await createMutation.mutateAsync(form);
        toast({
          title: isRtl ? "تم الإنشاء" : "Created",
          description: isRtl
            ? `تم إنشاء حساب "${form.username}" بنجاح. يمكنه تسجيل الدخول الآن.`
            : `Account "${form.username}" created. They can log in now.`,
        });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: msg === "Username already exists"
          ? (isRtl ? "اسم المستخدم موجود مسبقاً." : "Username already exists.")
          : (isRtl ? "حدث خطأ، حاول مرة أخرى." : "Something went wrong."),
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const next = user.status === "suspended" ? "active" : "suspended";
    setTogglingId(user.id);
    try {
      await updateMutation.mutateAsync({ id: user.id, data: { status: next } });
      toast({
        title: next === "active"
          ? (isRtl ? "تم تفعيل الحساب" : "Account activated")
          : (isRtl ? "تم تعطيل الحساب" : "Account suspended"),
      });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: (msg || undefined) ?? (isRtl ? "حدث خطأ." : "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: (msg || undefined) ?? (isRtl ? "حدث خطأ." : "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-200">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{isRtl ? "مستخدمو الإدارة" : "Admin Users"}</h3>
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "يمكنهم تسجيل الدخول إلى لوحة التحكم"
                : "Can log in to the clinic dashboard"}
            </p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {isRtl ? "إضافة مسؤول" : "Add Admin"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-card border border-dashed rounded-2xl p-8 text-center">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-medium text-sm">{isRtl ? "لا يوجد مسؤولون إضافيون" : "No additional admins"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRtl ? "أضف مسؤولين لمنحهم صلاحية الدخول إلى لوحة التحكم." : "Add admins to grant dashboard access."}
          </p>
          <Button onClick={openNew} size="sm" className="mt-3 gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            {isRtl ? "إضافة مسؤول" : "Add Admin"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map(u => (
            <AdminUserCard
              key={u.id}
              user={u}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggleStatus={handleToggleStatus}
              isToggling={togglingId === u.id}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editTarget
                ? (isRtl ? "تعديل المسؤول" : "Edit Admin")
                : (isRtl ? "إضافة مسؤول جديد" : "Add New Admin")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Full name */}
            <div className="space-y-1.5">
              <Label>{isRtl ? "الاسم الكامل *" : "Full Name *"}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={isRtl ? "أحمد محمد" : "Jane Smith"}
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label>{isRtl ? "اسم المستخدم *" : "Username *"}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="ps-9"
                  placeholder="ahmed.reception"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  {editTarget
                    ? (isRtl ? "كلمة مرور جديدة (اختيارية)" : "New Password (optional)")
                    : (isRtl ? "كلمة المرور *" : "Password *")}
                </Label>
                {editTarget && !showPassword && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="h-6 text-xs gap-1 text-primary"
                    onClick={() => setShowPassword(true)}
                  >
                    <KeyRound className="h-3 w-3" />
                    {isRtl ? "إعادة تعيين" : "Reset"}
                  </Button>
                )}
              </div>
              {(!editTarget || showPassword) && (
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={isRtl ? "••••••••" : "••••••••"}
                  dir="ltr"
                  autoComplete="new-password"
                />
              )}
            </div>

            {!editTarget && (
              <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                {isRtl
                  ? "سيتمكن المستخدم من تسجيل الدخول فور إنشاء الحساب."
                  : "The user will be able to log in immediately after creation."}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : (editTarget ? (isRtl ? "حفظ" : "Save") : (isRtl ? "إنشاء" : "Create"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف المسؤول؟" : "Delete Admin?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? `سيتم حذف حساب "${deleteTarget?.name}" نهائياً ولن يتمكن من تسجيل الدخول بعد الآن.`
                : `"${deleteTarget?.name}" will be permanently deleted and can no longer log in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRtl ? "حذف" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function StaffTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const { data: staff = [], isLoading } = useStaff();
  const createMutation  = useCreateStaff();
  const updateMutation  = useUpdateStaff();
  const deleteMutation  = useDeleteStaff();

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditTarget(m);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role as StaffRoleValue,
      phone: m.phone ?? "",
      email: m.email ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role) {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "يرجى ملء الاسم والدور." : "Name and role are required.", variant: "destructive" });
      return;
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: form });
        toast({ title: isRtl ? "تم التحديث" : "Updated" });
      } else {
        await createMutation.mutateAsync(form as Required<Pick<StaffForm, "role">> & StaffForm);
        toast({ title: isRtl ? "تم الإضافة" : "Added", description: isRtl ? "تمت إضافة الموظف بنجاح." : "Staff member added." });
      }
      setModalOpen(false);
    } catch {
      toast({ title: isRtl ? "خطأ" : "Error", description: isRtl ? "حدث خطأ، حاول مرة أخرى." : "Something went wrong.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
    } catch {
      toast({ title: isRtl ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group staff by role
  const byRole = STAFF_ROLES.map(r => ({
    ...r,
    members: staff.filter(s => s.role === r.value),
  }));

  return (
    <div className="space-y-8">
      {/* ── Admin Users Section ─────────────────────────────────────────────── */}
      <AdminUsersSection isRtl={isRtl} />

      <div className="border-t" />

      {/* ── Staff Members Section ───────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {isRtl ? `${staff.length} موظف مسجل` : `${staff.length} staff member${staff.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="gap-2 rounded-xl text-xs"
              onClick={() => setShowHierarchy(p => !p)}
            >
              {showHierarchy ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {isRtl ? "هيكل الأدوار" : "Role Hierarchy"}
            </Button>
            <Button onClick={openNew} size="sm" className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {isRtl ? "إضافة موظف" : "Add Staff"}
            </Button>
          </div>
        </div>

        {/* Role Hierarchy */}
        {showHierarchy && (
          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {isRtl ? "هيكل أدوار العيادة" : "Clinic Role Hierarchy"}
            </p>
            <div className="space-y-2">
              {HIERARCHY.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div key={h.role} className="flex items-center gap-3">
                    {/* Indent line */}
                    <div className="flex items-center gap-1 shrink-0" style={{ paddingRight: i === 0 ? 0 : `${Math.min(i, 2) * 16}px` }}>
                      {i > 0 && <div className="w-4 h-px bg-border" />}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${h.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{isRtl ? h.labelAr : h.labelEn}</span>
                      <span className="opacity-60">·</span>
                      <span className="opacity-70">{h.note}</span>
                    </div>
                    {!h.managed && (
                      <span className="text-[10px] text-muted-foreground">
                        {h.role === "clinic_owner"
                          ? (isRtl ? "← إعدادات المستخدمين" : "← Users tab")
                          : (isRtl ? "← إعدادات الأطباء" : "← Doctors tab")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              {isRtl
                ? "الموظفون المُدارون هنا: الممرضون، موظفو الاستقبال، المحاسبون، والموظفون العامون."
                : "Managed here: Nurses, Receptionists, Accountants, and general Employees."}
            </p>
          </div>
        )}

        {/* Staff grouped by role */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-card border border-dashed rounded-2xl p-10 text-center">
            <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-sm">{isRtl ? "لا يوجد موظفون بعد" : "No staff members yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRtl ? "أضف موظفيك: ممرضات، موظفي استقبال، محاسبين..." : "Add your team: nurses, receptionists, accountants..."}
            </p>
            <Button onClick={openNew} size="sm" className="mt-4 gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {isRtl ? "إضافة أول موظف" : "Add First Staff Member"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {byRole.map(group => {
              if (group.members.length === 0) return null;
              const Icon = group.icon;
              return (
                <div key={group.value}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${group.color} border`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold">{isRtl ? group.labelAr : group.labelEn}</h3>
                    <Badge variant="secondary" className="text-xs">{group.members.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.members.map(m => (
                      <StaffCard key={m.id} member={m} onEdit={openEdit} onDelete={setDeleteTarget} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Any other roles not in STAFF_ROLES */}
            {staff.filter(s => !STAFF_ROLES.some(r => r.value === s.role)).map(m => (
              <StaffCard key={m.id} member={m} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Staff Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {editTarget
                ? (isRtl ? "تعديل بيانات الموظف" : "Edit Staff Member")
                : (isRtl ? "إضافة موظف جديد" : "Add New Staff Member")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Role */}
            <div className="space-y-1.5">
              <Label>{isRtl ? "الدور الوظيفي *" : "Role *"}</Label>
              <Select
                value={form.role}
                onValueChange={v => setForm(p => ({ ...p, role: v as StaffRoleValue }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={isRtl ? "اختر الدور..." : "Select role..."} />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {isRtl ? r.labelAr : r.labelEn}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRtl ? "الاسم الأول *" : "First Name *"}</Label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  placeholder={isRtl ? "محمد" : "John"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "اسم العائلة *" : "Last Name *"}</Label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  placeholder={isRtl ? "أحمد" : "Smith"}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label>{isRtl ? "رقم الهاتف" : "Phone"}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="ps-9"
                  placeholder="+971 xx xxx xxxx"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="ps-9"
                  placeholder="staff@clinic.com"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : (editTarget ? (isRtl ? "حفظ" : "Save") : (isRtl ? "إضافة" : "Add"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف الموظف؟" : "Delete Staff Member?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? `سيتم حذف "${deleteTarget?.firstName} ${deleteTarget?.lastName}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.`
                : `"${deleteTarget?.firstName} ${deleteTarget?.lastName}" will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRtl ? "حذف" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
