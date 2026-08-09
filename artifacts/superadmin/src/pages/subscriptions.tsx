import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Zap, Star, Building2, Crown } from 'lucide-react'

interface Plan {
  id: number
  slug: string
  name: string
  nameAr: string
  description: string | null
  monthlyPrice: string
  annualPrice: string
  currency: string
  trialDays: number
  maxDoctors: number
  maxStaff: number
  maxPatients: number
  maxBranches: number
  storageGb: number
  features: string[]
  isActive: boolean
  isPopular: boolean
  sortOrder: number
}

const PLAN_ICONS: Record<string, any> = {
  starter: Zap,
  pro: Star,
  medical_center: Building2,
  enterprise: Crown,
}

const ALL_FEATURES = [
  { key: 'patients', label: 'المرضى' },
  { key: 'appointments', label: 'المواعيد' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'prescriptions', label: 'الروشتات' },
  { key: 'medical_records', label: 'السجلات الطبية' },
  { key: 'laboratory', label: 'المختبر' },
  { key: 'radiology', label: 'الأشعة' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'pharmacy', label: 'الصيدلية' },
  { key: 'reports', label: 'التقارير' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'zapier', label: 'Zapier' },
  { key: 'api_access', label: 'API' },
  { key: 'ai_assistant', label: 'مساعد الذكاء الاصطناعي' },
  { key: 'online_booking', label: 'الحجز الإلكتروني' },
  { key: 'branches', label: 'الفروع المتعددة' },
]

const emptyPlan: Omit<Plan, 'id'> = {
  slug: '', name: '', nameAr: '', description: '', monthlyPrice: '0', annualPrice: '0',
  currency: 'AED', trialDays: 14, maxDoctors: 1, maxStaff: 5, maxPatients: 500,
  maxBranches: 1, storageGb: 5, features: ['patients', 'appointments', 'invoices'],
  isActive: true, isPopular: false, sortOrder: 0,
}

export default function Subscriptions() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<Omit<Plan, 'id'>>(emptyPlan)

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['sa-plans'],
    queryFn: () => fetchApi('/plans'),
  })

  const save = useMutation({
    mutationFn: (data: Omit<Plan, 'id'> & { id?: number }) =>
      data.id ? fetchApi(`/plans/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) })
              : fetchApi('/plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-plans'] })
      toast({ title: 'تم الحفظ', description: 'تم حفظ الباقة بنجاح' })
      setDialogOpen(false)
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ الباقة' }),
  })

  const toggleActive = useMutation({
    mutationFn: (plan: Plan) => fetchApi(`/plans/${plan.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-plans'] }),
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث الباقة' }),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyPlan)
    setDialogOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    setForm({ ...plan })
    setDialogOpen(true)
  }

  function toggleFeature(key: string) {
    setForm(f => ({
      ...f,
      features: f.features.includes(key) ? f.features.filter(x => x !== key) : [...f.features, key],
    }))
  }

  function handleSubmit() {
    const payload = editing ? { ...form, id: editing.id } : form
    save.mutate(payload as any)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الباقات والاشتراكات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة خطط الاشتراك وميزات كل باقة</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          باقة جديدة
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-20 text-center text-muted-foreground">لا توجد باقات — أضف أول باقة</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map(plan => {
            const Icon = PLAN_ICONS[plan.slug] ?? Star
            return (
              <Card key={plan.id} className={`relative overflow-hidden border-2 transition-all ${plan.isPopular ? 'border-primary shadow-lg' : 'border-border'} ${!plan.isActive ? 'opacity-60' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-primary text-primary-foreground text-xs">الأكثر شيوعاً</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.nameAr}</CardTitle>
                        <div className="text-xs text-muted-foreground">{plan.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={plan.isActive} onCheckedChange={() => toggleActive.mutate(plan)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-2xl font-bold">{Number(plan.monthlyPrice).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{plan.currency}/شهر</div>
                    </div>
                    <div className="border-r border-border pr-4">
                      <div className="text-xl font-semibold text-muted-foreground">{Number(plan.annualPrice).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{plan.currency}/شهر (سنوي)</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted rounded-lg p-2"><span className="text-muted-foreground">أطباء: </span><strong>{plan.maxDoctors === -1 ? '∞' : plan.maxDoctors}</strong></div>
                    <div className="bg-muted rounded-lg p-2"><span className="text-muted-foreground">فروع: </span><strong>{plan.maxBranches === -1 ? '∞' : plan.maxBranches}</strong></div>
                    <div className="bg-muted rounded-lg p-2"><span className="text-muted-foreground">مرضى: </span><strong>{plan.maxPatients === -1 ? '∞' : plan.maxPatients}</strong></div>
                    <div className="bg-muted rounded-lg p-2"><span className="text-muted-foreground">تخزين: </span><strong>{plan.storageGb === -1 ? '∞' : plan.storageGb} GB</strong></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(plan.features || []).slice(0, 5).map(f => (
                      <Badge key={f} variant="secondary" className="text-xs">{ALL_FEATURES.find(x => x.key === f)?.label ?? f}</Badge>
                    ))}
                    {(plan.features || []).length > 5 && <Badge variant="outline" className="text-xs">+{plan.features.length - 5}</Badge>}
                  </div>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => openEdit(plan)}>
                    <Pencil className="w-3 h-3" />
                    تعديل
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>المعرف (slug)</Label>
              <Input placeholder="starter" value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>الاسم (EN)</Label>
              <Input placeholder="Starter" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>الاسم (AR)</Label>
              <Input placeholder="البداية" value={form.nameAr} onChange={e => setForm(f => ({...f, nameAr: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>تجربة مجانية (يوم)</Label>
              <Input type="number" value={form.trialDays} onChange={e => setForm(f => ({...f, trialDays: +e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>السعر الشهري (AED)</Label>
              <Input type="number" value={form.monthlyPrice} onChange={e => setForm(f => ({...f, monthlyPrice: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>السعر السنوي /شهر (AED)</Label>
              <Input type="number" value={form.annualPrice} onChange={e => setForm(f => ({...f, annualPrice: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>الحد الأقصى للأطباء (-1 = غير محدود)</Label>
              <Input type="number" value={form.maxDoctors} onChange={e => setForm(f => ({...f, maxDoctors: +e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>الحد الأقصى للفروع</Label>
              <Input type="number" value={form.maxBranches} onChange={e => setForm(f => ({...f, maxBranches: +e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>الحد الأقصى للمرضى</Label>
              <Input type="number" value={form.maxPatients} onChange={e => setForm(f => ({...f, maxPatients: +e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>التخزين (GB)</Label>
              <Input type="number" value={form.storageGb} onChange={e => setForm(f => ({...f, storageGb: +e.target.value}))} />
            </div>
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({...f, isActive: v}))} />
                <span className="text-sm">نشطة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={form.isPopular} onCheckedChange={v => setForm(f => ({...f, isPopular: v}))} />
                <span className="text-sm">الأكثر شيوعاً</span>
              </label>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>الميزات المتاحة</Label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_FEATURES.map(feat => (
                  <label key={feat.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${form.features.includes(feat.key) ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-muted'}`}>
                    <input type="checkbox" checked={form.features.includes(feat.key)} onChange={() => toggleFeature(feat.key)} className="hidden" />
                    <div className={`w-3 h-3 rounded border-2 flex-shrink-0 ${form.features.includes(feat.key) ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                    {feat.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={save.isPending}>
              {save.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
