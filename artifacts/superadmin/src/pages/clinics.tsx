import * as React from "react"
import {
  useClinics, useCreateClinic, useUpdateClinic, useDeleteClinic,
  useClinicCredentials, useCreateClinicCredential, useResetClinicPassword, useDeleteClinicCredential,
  useImpersonateClinic,
  type ClinicCredential,
} from "@/hooks/use-api"
import { Clinic, ClinicPlan, ClinicStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Search, Pencil, Trash2, ShieldAlert, CheckCircle2, KeyRound, Eye, EyeOff, UserPlus, RotateCcw, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { planLabels, statusBadges } from "@/lib/constants"
import { useAuth, hasPermission } from "@/hooks/use-auth"

// ── Credentials Dialog ────────────────────────────────────────────────────────
function CredentialsDialog({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const { toast } = useToast()
  const { data: creds, isLoading } = useClinicCredentials(clinic.id)
  const createCred  = useCreateClinicCredential()
  const resetPass   = useResetClinicPassword()
  const deleteCred  = useDeleteClinicCredential()

  const [form, setForm]         = React.useState({ username: '', password: '', name: '' })
  const [showPw, setShowPw]     = React.useState(false)
  const [resetId, setResetId]   = React.useState<number | null>(null)
  const [resetPw, setResetPw]   = React.useState('')
  const [showResetPw, setShowResetPw] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCred.mutateAsync({ clinicId: clinic.id, data: form })
      toast({ title: "تم الإنشاء", description: `تم إنشاء حساب "${form.username}" بنجاح` })
      setForm({ username: '', password: '', name: '' })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  const handleReset = async () => {
    if (!resetId || resetPw.length < 6) return
    try {
      await resetPass.mutateAsync({ clinicId: clinic.id, userId: resetId, password: resetPw })
      toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" })
      setResetId(null); setResetPw('')
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCred.mutateAsync({ clinicId: clinic.id, userId: deleteId })
      toast({ title: "تم الحذف", description: "تم حذف الحساب" })
      setDeleteId(null)
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            بيانات الدخول — {clinic.name}
          </DialogTitle>
          <DialogDescription>إنشاء وإدارة حسابات الدخول لهذه العيادة</DialogDescription>
        </DialogHeader>

        {/* Create new credential */}
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> إنشاء حساب جديد</p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">الاسم الكامل *</label>
              <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مدير العيادة" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">اسم المستخدم *</label>
              <Input required dir="ltr" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="clinic_admin" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">كلمة المرور *</label>
              <div className="relative">
                <Input required dir="ltr" type={showPw ? "text" : "password"} minLength={6} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})} placeholder="6+ أحرف" className="pr-8" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute left-2 top-2.5 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" size="sm" disabled={createCred.isPending} className="gap-2">
                {createCred.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                إنشاء الحساب
              </Button>
            </div>
          </form>
        </div>

        {/* List of existing credentials */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">الحسابات الحالية</p>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !creds?.length ? (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-xl">لا توجد حسابات بعد — أنشئ أول حساب أعلاه</div>
          ) : (
            <div className="space-y-2">
              {creds.map(cred => (
                <div key={cred.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cred.name}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{cred.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cred.lastLoginAt
                        ? `آخر دخول: ${new Date(cred.lastLoginAt).toLocaleDateString('ar-SA')}`
                        : 'لم يسجّل دخولاً بعد'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                      onClick={() => { setResetId(cred.id); setResetPw(''); setShowResetPw(false) }}>
                      <RotateCcw className="w-3.5 h-3.5" /> تغيير كلمة المرور
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(cred.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reset password inline dialog */}
        {resetId !== null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              تغيير كلمة المرور لـ: {creds?.find(c => c.id === resetId)?.username}
            </p>
            <div className="relative">
              <Input dir="ltr" type={showResetPw ? "text" : "password"} minLength={6}
                value={resetPw} onChange={e => setResetPw(e.target.value)}
                placeholder="كلمة المرور الجديدة (6+ أحرف)" className="pr-8" />
              <button type="button" onClick={() => setShowResetPw(p => !p)} className="absolute left-2 top-2.5 text-muted-foreground">
                {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setResetId(null); setResetPw('') }}>إلغاء</Button>
              <Button size="sm" disabled={resetPw.length < 6 || resetPass.isPending} onClick={handleReset} className="gap-1.5">
                {resetPass.isPending && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
              </Button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId !== null && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">
              هل تريد حذف حساب "{creds?.find(c => c.id === deleteId)?.username}"؟
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>إلغاء</Button>
              <Button variant="destructive" size="sm" disabled={deleteCred.isPending} onClick={handleDelete} className="gap-1.5">
                {deleteCred.isPending && <Loader2 className="w-4 h-4 animate-spin" />} حذف
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Clinics() {
  const { data: clinics, isLoading } = useClinics()
  const { toast } = useToast()
  const { user } = useAuth()
  const canManage = hasPermission(user?.role, "manageClinic")
  
  const createClinic    = useCreateClinic()
  const updateClinic    = useUpdateClinic()
  const deleteClinic    = useDeleteClinic()
  const impersonateMut  = useImpersonateClinic()

  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState<string>("all")
  
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [editingClinic, setEditingClinic] = React.useState<Clinic | null>(null)
  const [credClinic, setCredClinic] = React.useState<Clinic | null>(null)
  const [impersonating, setImpersonating] = React.useState<number | null>(null)

  const handleImpersonate = async (clinic: Clinic) => {
    setImpersonating(clinic.id)
    try {
      const { token, clinicName } = await impersonateMut.mutateAsync(clinic.id)
      // Write clinic-os auth into shared localStorage (same origin) then open clinic in new tab
      localStorage.setItem("clinic-os-auth", JSON.stringify({
        role: "admin",
        token,
        name: clinicName,
        clinicId: clinic.id,
      }))
      window.open("/", "_blank")
      toast({ title: "تم الدخول", description: `تم الدخول إلى عيادة "${clinicName}" بنجاح في تبويب جديد` })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    } finally {
      setImpersonating(null)
    }
  }

  // Form State
  const [formData, setFormData] = React.useState<Partial<Clinic>>({
    name: "", ownerName: "", phone: "", email: "", specialty: "", plan: "trial", status: "trial", notes: ""
  })

  const resetForm = () => {
    setFormData({ name: "", ownerName: "", phone: "", email: "", specialty: "", plan: "trial", status: "trial", notes: "" })
    setEditingClinic(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleOpenEdit = (clinic: Clinic) => {
    setFormData({
      name: clinic.name,
      ownerName: clinic.ownerName,
      phone: clinic.phone,
      email: clinic.email || "",
      specialty: clinic.specialty || "",
      plan: clinic.plan,
      status: clinic.status,
      notes: clinic.notes || ""
    })
    setEditingClinic(clinic)
    setIsFormOpen(true)
  }

  const handleOpenDelete = (clinic: Clinic) => {
    setEditingClinic(clinic)
    setIsDeleteOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingClinic) {
        await updateClinic.mutateAsync({ id: editingClinic.id, data: formData })
        toast({ title: "تم التحديث", description: "تم تحديث بيانات العيادة بنجاح" })
      } else {
        await createClinic.mutateAsync(formData)
        toast({ title: "تمت الإضافة", description: "تمت إضافة العيادة بنجاح" })
      }
      setIsFormOpen(false)
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  const handleDeleteSubmit = async () => {
    if (!editingClinic) return
    try {
      await deleteClinic.mutateAsync(editingClinic.id)
      toast({ title: "تم الحذف", description: "تم حذف العيادة نهائياً" })
      setIsDeleteOpen(false)
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  const handleToggleStatus = async (clinic: Clinic) => {
    const newStatus = clinic.status === 'active' ? 'suspended' : 'active';
    try {
      await updateClinic.mutateAsync({ id: clinic.id, data: { status: newStatus } })
      toast({ title: "تم التحديث", description: `تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} العيادة` })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    }
  }

  const filteredClinics = clinics?.filter(clinic => {
    if (filterStatus !== 'all' && clinic.status !== filterStatus) return false;
    
    if (search) {
      const q = search.toLowerCase();
      return (
        clinic.name.toLowerCase().includes(q) ||
        clinic.ownerName.toLowerCase().includes(q) ||
        clinic.phone.includes(q)
      )
    }
    return true;
  }) || []

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة العيادات</h1>
          <p className="text-muted-foreground mt-1">عرض وإدارة جميع العيادات المشتركة في المنصة</p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            إضافة عيادة
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between gap-4 items-center">
          <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="active">نشط</TabsTrigger>
              <TabsTrigger value="trial">تجريبي</TabsTrigger>
              <TabsTrigger value="suspended">موقوف</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم، المسؤول، الجوال..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              لا توجد عيادات مطابقة للبحث
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>اسم العيادة</TableHead>
                  <TableHead>المسؤول / الجوال</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>الباقة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                  <TableHead className="w-[150px] text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map((clinic) => {
                  const statusInfo = statusBadges[clinic.status]
                  return (
                    <TableRow key={clinic.id} className="group">
                      <TableCell className="font-medium">
                        {clinic.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{clinic.ownerName}</span>
                          <span className="text-xs text-muted-foreground" dir="ltr" style={{textAlign: 'right'}}>{clinic.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {clinic.specialty || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">
                          {planLabels[clinic.plan]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(clinic.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="دخول مباشر للعيادة"
                              onClick={() => handleImpersonate(clinic)}
                              disabled={impersonating === clinic.id}
                            >
                              {impersonating === clinic.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <LogIn className="h-4 w-4 text-emerald-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="بيانات الدخول"
                              onClick={() => setCredClinic(clinic)}
                            >
                              <KeyRound className="h-4 w-4 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              title={clinic.status === 'active' ? 'إيقاف' : 'تفعيل'}
                              onClick={() => handleToggleStatus(clinic)}
                              disabled={updateClinic.isPending}
                            >
                              {clinic.status === 'active' ? (
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              title="تعديل"
                              onClick={() => handleOpenEdit(clinic)}
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" 
                              title="حذف"
                              onClick={() => handleOpenDelete(clinic)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClinic ? "تعديل عيادة" : "إضافة عيادة جديدة"}</DialogTitle>
            <DialogDescription>
              {editingClinic ? "تعديل بيانات العيادة المحددة" : "أدخل بيانات العيادة الجديدة لإضافتها إلى المنصة"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم العيادة *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المسؤول *</label>
                <Input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الجوال *</label>
                <Input required type="tel" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">البريد الإلكتروني</label>
                <Input type="email" dir="ltr" className="text-right" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">التخصص</label>
                <Input value={formData.specialty || ""} onChange={e => setFormData({...formData, specialty: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الباقة</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.plan}
                  onChange={e => setFormData({...formData, plan: e.target.value as ClinicPlan})}
                >
                  <option value="trial">تجريبي</option>
                  <option value="starter">البداية (299 د.إ)</option>
                  <option value="pro">الاحترافية (699 د.إ)</option>
                  <option value="medical_center">المركز الطبي (1799 د.إ)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as ClinicStatus})}
                >
                  <option value="trial">تجريبي</option>
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات إضافية</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.notes || ""}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createClinic.isPending || updateClinic.isPending}>
                {(createClinic.isPending || updateClinic.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClinic ? "حفظ التغييرات" : "إضافة العيادة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف عيادة "{editingClinic?.name}"؟ هذا الإجراء لا يمكن التراجع عنه وسيحذف جميع بيانات العيادة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={deleteClinic.isPending}>
              {deleteClinic.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      {credClinic && (
        <CredentialsDialog clinic={credClinic} onClose={() => setCredClinic(null)} />
      )}
    </div>
  )
}
