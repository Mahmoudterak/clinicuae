import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Plus, Trash2, Pencil, Loader2, MapPin, Building2, Phone, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  status: "active" | "inactive";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BranchesTab() {
  const { isRtl } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { bearerHeader } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const defaultForm = {
    name: "",
    address: "",
    phone: "",
    email: "",
    managerName: "",
    status: "active" as "active" | "inactive",
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/branches`, { headers: { ...bearerHeader } });
      if (!r.ok) throw new Error("Failed to fetch branches");
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch(`${BASE}/api/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...bearerHeader },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to create branch");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setCreateOpen(false);
      setForm(defaultForm);
      toast({ title: isRtl ? "تم إضافة الفرع" : "Branch added" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof form> }) => {
      const r = await fetch(`${BASE}/api/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...bearerHeader },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to update branch");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setEditTarget(null);
      toast({ title: isRtl ? "تم التحديث" : "Branch updated" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/branches/${id}`, {
        method: "DELETE",
        headers: { ...bearerHeader },
      });
      if (!r.ok) throw new Error("Failed to delete branch");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setDeleteTarget(null);
      toast({ title: isRtl ? "تم حذف الفرع" : "Branch deleted" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: e.message }),
  });

  const openNew = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditTarget(branch);
    setForm({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      managerName: branch.managerName || "",
      status: branch.status,
      notes: branch.notes || "",
    });
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {isRtl ? "إدارة الفروع" : "Branch Management"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRtl ? "إدارة الفروع التابعة للعيادة ومواقعها" : "Manage clinic branches and locations"}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-indigo-600 hover:bg-indigo-700" size="sm">
          <Plus className="h-4 w-4" />
          {isRtl ? "إضافة فرع" : "Add Branch"}
        </Button>
      </div>

      {/* Branches List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {isRtl ? "لا توجد فروع بعد — أضف أول فرع لعيادتك" : "No branches yet — add your first branch"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    {branch.name}
                  </h4>
                  <div className="mt-1">
                    {branch.status === "active" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900">
                        {isRtl ? "نشط" : "Active"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800">
                        {isRtl ? "غير نشط" : "Inactive"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(branch)}>
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setDeleteTarget(branch)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mt-auto pt-2 border-t text-sm">
                {branch.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span dir="ltr">{branch.phone}</span>
                  </div>
                )}
                {branch.managerName && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{branch.managerName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              {editTarget ? (isRtl ? "تعديل الفرع" : "Edit Branch") : (isRtl ? "إضافة فرع جديد" : "Add New Branch")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRtl ? "اسم الفرع *" : "Branch Name *"}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={isRtl ? "الفرع الرئيسي" : "Main Branch"}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRtl ? "رقم الهاتف" : "Phone Number"}</Label>
                <Input
                  dir="ltr"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+971 5x xxx xxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  dir="ltr"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="branch@clinic.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isRtl ? "العنوان" : "Address"}</Label>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder={isRtl ? "شارع الشيخ زايد، دبي" : "Sheikh Zayed Rd, Dubai"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{isRtl ? "اسم المدير" : "Manager Name"}</Label>
                <Input
                  value={form.managerName}
                  onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))}
                  placeholder={isRtl ? "أحمد محمد" : "Ahmed Mohammed"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "الحالة" : "Status"}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: "active" | "inactive") => setForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{isRtl ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="inactive">{isRtl ? "غير نشط" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isRtl ? "ملاحظات إضافية" : "Additional Notes"}</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="resize-none h-20"
                placeholder={isRtl ? "ساعات العمل، علامات مميزة..." : "Working hours, landmarks..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? (isRtl ? "حفظ التغييرات" : "Save Changes") : (isRtl ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRtl ? "حذف الفرع؟" : "Delete Branch?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl
                ? `سيتم حذف فرع "${deleteTarget?.name}" بشكل نهائي. هل أنت متأكد؟`
                : `Branch "${deleteTarget?.name}" will be permanently deleted. Are you sure?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRtl ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
