import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Settings, Save, AlertTriangle } from 'lucide-react'

interface Setting {
  id: number
  key: string
  value: string
  label: string | null
  description: string | null
  category: string
}

const SETTING_DEFINITIONS: Record<string, { label: string; description: string; type: 'text' | 'boolean' | 'number' | 'email' | 'url'; category: string }> = {
  platform_name: { label: 'اسم المنصة', description: 'الاسم المعروض في التطبيق', type: 'text', category: 'general' },
  support_email: { label: 'البريد الإلكتروني للدعم', description: 'يستخدمه المستخدمون للتواصل', type: 'email', category: 'general' },
  support_phone: { label: 'رقم الدعم (واتساب)', description: 'رقم الاتصال المعروض في التطبيق', type: 'text', category: 'general' },
  default_trial_days: { label: 'أيام التجربة المجانية', description: 'عدد أيام الفترة التجريبية الافتراضية', type: 'number', category: 'general' },
  default_currency: { label: 'العملة الافتراضية', description: 'مثال: AED, SAR, USD', type: 'text', category: 'general' },
  maintenance_mode: { label: 'وضع الصيانة', description: 'عند التفعيل يُعرض على المستخدمين رسالة الصيانة', type: 'boolean', category: 'maintenance' },
  maintenance_message: { label: 'رسالة الصيانة', description: 'الرسالة المعروضة للمستخدمين في وضع الصيانة', type: 'text', category: 'maintenance' },
  allow_self_registration: { label: 'السماح بالتسجيل الذاتي', description: 'السماح للعيادات بالتسجيل من صفحة الهبوط', type: 'boolean', category: 'security' },
  session_timeout_min: { label: 'مهلة الجلسة (دقيقة)', description: 'مدة الجلسة قبل انتهاء الصلاحية', type: 'number', category: 'security' },
  max_login_attempts: { label: 'الحد الأقصى لمحاولات الدخول', description: 'بعدها يُقفل الحساب مؤقتاً', type: 'number', category: 'security' },
  smtp_host: { label: 'SMTP Host', description: 'خادم البريد الصادر', type: 'text', category: 'email' },
  smtp_port: { label: 'SMTP Port', description: 'منفذ الخادم (465, 587)', type: 'number', category: 'email' },
  smtp_from: { label: 'From Email', description: 'عنوان المرسل', type: 'email', category: 'email' },
}

const TABS = [
  { key: 'general', label: 'عام' },
  { key: 'maintenance', label: 'الصيانة' },
  { key: 'security', label: 'الأمان' },
  { key: 'email', label: 'البريد الإلكتروني' },
]

export default function SaSettings() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ['sa-settings'],
    queryFn: () => fetchApi('/platform-settings'),
  })

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {}
      settings.forEach(s => { initial[s.key] = s.value })
      setLocalValues(initial)
    }
  }, [settings])

  const save = useMutation({
    mutationFn: (updates: Record<string, string>) =>
      fetchApi('/platform-settings', { method: 'PATCH', body: JSON.stringify({ settings: updates }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-settings'] })
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' })
      setDirty(false)
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ الإعدادات' }),
  })

  function handleChange(key: string, value: string) {
    setLocalValues(v => ({ ...v, [key]: value }))
    setDirty(true)
  }

  function renderField(key: string) {
    const def = SETTING_DEFINITIONS[key]
    if (!def) return null
    const value = localValues[key] ?? ''
    if (def.type === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between py-4 border-b border-border last:border-0">
          <div>
            <div className="font-medium text-sm">{def.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{def.description}</div>
          </div>
          <Switch checked={value === 'true'} onCheckedChange={v => handleChange(key, String(v))} />
        </div>
      )
    }
    return (
      <div key={key} className="space-y-1.5 py-4 border-b border-border last:border-0">
        <Label>{def.label}</Label>
        <Input
          type={def.type === 'email' ? 'email' : def.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => handleChange(key, e.target.value)}
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">{def.description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            إعدادات المنصة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ضبط إعدادات Clinic OS العامة</p>
        </div>
        {dirty && (
          <Button onClick={() => save.mutate(localValues)} disabled={save.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {save.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        )}
      </div>

      {localValues['maintenance_mode'] === 'true' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">وضع الصيانة مفعّل</div>
            <div className="text-xs mt-0.5">المستخدمون العاديون لا يستطيعون الوصول للتطبيق الآن</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <Tabs defaultValue="general" dir="rtl">
          <TabsList className="mb-6">
            {TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(tab => {
            const keys = Object.entries(SETTING_DEFINITIONS)
              .filter(([, def]) => def.category === tab.key)
              .map(([k]) => k)
            return (
              <TabsContent key={tab.key} value={tab.key}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{tab.label}</CardTitle>
                    <CardDescription className="text-sm">إعدادات {tab.label} للمنصة</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {keys.length > 0 ? keys.map(renderField) : (
                      <p className="text-sm text-muted-foreground py-4">لا توجد إعدادات في هذا القسم</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
