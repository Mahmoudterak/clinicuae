import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListDoctors } from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Key, Loader2, Stethoscope, ShieldCheck, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface DoctorAccount {
  id: number;
  doctorId: number;
  username: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  specialty: string | null;
}

function useDoctorAccounts() {
  return useQuery<DoctorAccount[]>({
    queryKey: ["doctor-accounts"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/doctor-accounts`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}

export default function DoctorAccountsTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useDoctorAccounts();
  const { data: doctors = [] } = useListDoctors();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<DoctorAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorAccount | null>(null);

  const [form, setForm] = useState({ doctorId: "", username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  // Doctors that don't yet have an account
  const linkedDoctorIds = new Set(accounts.map(a => a.doctorId));
  const availableDoctors = doctors.filter(d => !linkedDoctorIds.has(d.id));

  const createMutation = useMutation({
    mutationFn: async (data: { doctorId: number; username: string; password: string }) => {
      const r = await fetch(`${BASE}/api/admin/doctor-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-accounts"] });
      setCreateOpen(false);
      setForm({ doctorId: "", username: "", password: "" });
      toast({ title: isRtl ? "تم إنشاء الحساب" : "Account created" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const r = await fetch(`${BASE}/api/admin/doctor-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
    },
    onSuccess: () => {
      setResetTarget(null);
      setNewPass("");
      toast({ title: isRtl ? "تم تغيير كلمة المرور" : "Password reset" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/admin/doctor-accounts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-accounts"] });
      setDeleteTarget(null);
      toast({ title: isRtl ? "تم حذف الحساب" : "Account deleted" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {isRtl ? "حسابات بوابة الأطباء" : "Doctor Portal Accounts"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRtl
              ? "أنشئ بيانات دخول لكل طبيب للوصول لبوابته الخاصة"
              : "Create login credentials for doctors to access their portal"}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={availableDoctors.length === 0}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {isRtl ? "إضافة حساب" : "Add Account"}
        </Button>
      </div>

      {/* Info strip */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-4 flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <span>
          {isRtl
            ? "كلمات المرور مشفرة ولا يمكن استرجاعها. في حال نسيان كلمة المرور، استخدم زر \"إعادة تعيين\" لإنشاء كلمة مرور جديدة."
            : "Passwords are encrypted and cannot be recovered. Use the Reset button to set a new password if forgotten."}
        </span>
      </div>

      {/* Accounts list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <Stethoscope className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {isRtl ? "لا توجد حسابات أطباء بعد" : "No doctor accounts yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRtl ? "أضف حساباً لكل طبيب ليتمكن من تسجيل الدخول" : "Add an account for each doctor"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{isRtl ? "الطبيب" : "Doctor"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{isRtl ? "اسم المستخدم" : "Username"}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">{isRtl ? "تاريخ الإنشاء" : "Created"}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {accounts.map(acc => (
                <tr key={acc.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {acc.firstName?.[0]}{acc.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {isRtl ? "د." : "Dr."} {acc.firstName} {acc.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{acc.specialty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{acc.username}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {new Date(acc.createdAt).toLocaleDateString(isRtl ? "ar-AE" : "en-AE")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => { setResetTarget(acc); setNewPass(""); }}
                      >
                        <Key className="h-3 w-3" />
                        {isRtl ? "إعادة تعيين" : "Reset"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => setDeleteTarget(acc)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-indigo-500" />
              {isRtl ? "إنشاء حساب طبيب" : "Create Doctor Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRtl ? "الطبيب" : "Doctor"}</Label>
              <Select
                value={form.doctorId}
                onValueChange={v => setForm(p => ({ ...p, doctorId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "اختر الطبيب" : "Select a doctor"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {isRtl ? "د." : "Dr."} {d.firstName} {d.lastName} — {d.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "اسم المستخدم" : "Username"}</Label>
              <Input
                dir="ltr"
                placeholder="dr.name"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "كلمة المرور" : "Password"}</Label>
              <div className="relative">
                <Input
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{isRtl ? "6 أحرف على الأقل" : "Minimum 6 characters"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => createMutation.mutate({ doctorId: Number(form.doctorId), username: form.username, password: form.password })}
              disabled={!form.doctorId || !form.username || form.password.length < 6 || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRtl ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={o => { if (!o) { setResetTarget(null); setNewPass(""); } }}>
        <DialogContent className="sm:max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-500" />
              {isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}
            </DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? `إعادة تعيين كلمة مرور الحساب: ${resetTarget.username}`
                  : `Reset password for account: ${resetTarget.username}`}
              </p>
              <div className="space-y-1.5">
                <Label>{isRtl ? "كلمة المرور الجديدة" : "New Password"}</Label>
                <div className="relative">
                  <Input
                    dir="ltr"
                    type={showNewPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(p => !p)}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPass(""); }}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button
              onClick={() => resetTarget && resetMutation.mutate({ id: resetTarget.id, password: newPass })}
              disabled={newPass.length < 6 || resetMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف الحساب؟" : "Delete account?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? `سيُحذف حساب "${deleteTarget?.username}" ولن يتمكن الطبيب من تسجيل الدخول بعد الآن.`
                : `Account "${deleteTarget?.username}" will be deleted and the doctor will no longer be able to log in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
