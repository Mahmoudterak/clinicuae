import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Mail, MessageSquare, Bell, Send, Edit2, Eye,
  Clock, CheckCircle2, AlertCircle, Megaphone, Plus,
} from "lucide-react"

interface Template {
  id: string
  name: string
  trigger: string
  subject?: string
  body: string
  channel: 'email' | 'sms' | 'whatsapp' | 'push'
  status: 'active' | 'draft'
  lastSent?: string
}

const emailTemplates: Template[] = [
  { id: 'trial_expiry', name: 'انتهاء الفترة التجريبية', trigger: 'قبل 3 أيام من انتهاء التجربة', subject: '⏰ تبقى 3 أيام على انتهاء تجربتك المجانية', body: 'مرحباً {clinicName}،\n\nتجربتك المجانية في Clinic OS ستنتهي بعد 3 أيام. لا تفقد وصولك لبياناتك.\n\nاشترك الآن وحافظ على عيادتك تعمل بلا انقطاع.', channel: 'email', status: 'active', lastSent: '2026-08-07' },
  { id: 'payment_success', name: 'تأكيد الدفع', trigger: 'بعد إتمام عملية الدفع', subject: '✅ تم تأكيد اشتراكك في Clinic OS', body: 'مرحباً {clinicName}،\n\nتم تجديد اشتراكك بنجاح. يمكنك الآن الاستمرار في استخدام جميع المزايا.', channel: 'email', status: 'active', lastSent: '2026-08-08' },
  { id: 'welcome', name: 'رسالة الترحيب', trigger: 'عند التسجيل الجديد', subject: '🎉 مرحباً في Clinic OS!', body: 'مرحباً {ownerName}،\n\nشكراً لانضمامك لـ Clinic OS. لديك 14 يوماً مجاناً لاستكشاف كل المزايا.', channel: 'email', status: 'active', lastSent: '2026-08-09' },
  { id: 'account_suspended', name: 'إيقاف الحساب', trigger: 'عند إيقاف الاشتراك', subject: '⚠️ تم إيقاف حسابك مؤقتاً', body: 'عزيزي {ownerName}،\n\nتم إيقاف حسابك في Clinic OS. للعودة، يرجى تجديد اشتراكك أو التواصل مع الدعم.', channel: 'email', status: 'draft' },
]

const whatsappTemplates: Template[] = [
  { id: 'wa_trial_expiry', name: 'انتهاء التجربة', trigger: 'قبل يومين من انتهاء التجربة', body: 'مرحباً {ownerName} 👋\n\nتجربتك في Clinic OS ستنتهي بعد يومين.\n\nللاشتراك: {subscribeLink}', channel: 'whatsapp', status: 'active', lastSent: '2026-08-08' },
  { id: 'wa_payment_failed', name: 'فشل الدفع', trigger: 'عند فشل معالجة الدفع', body: 'عزيزي {ownerName}،\n\nلم يتم تجديد اشتراكك. يرجى تحديث بيانات الدفع لتجنب انقطاع الخدمة.', channel: 'whatsapp', status: 'active' },
  { id: 'wa_welcome', name: 'ترحيب جديد', trigger: 'عند التسجيل', body: 'أهلاً بك في Clinic OS! 🏥\n\nنحن سعداء بانضمامك. فريق الدعم متاح على هذا الرقم لأي مساعدة.', channel: 'whatsapp', status: 'active', lastSent: '2026-08-09' },
]

const smsTemplates: Template[] = [
  { id: 'sms_otp', name: 'رمز التحقق OTP', trigger: 'عند طلب رمز التحقق', body: 'Clinic OS: رمز التحقق الخاص بك هو {code}. صالح لمدة 5 دقائق.', channel: 'sms', status: 'active', lastSent: '2026-08-09' },
  { id: 'sms_trial_end', name: 'انتهاء التجربة', trigger: 'يوم انتهاء التجربة', body: 'Clinic OS: تجربتك المجانية انتهت اليوم. اشترك الآن: {link}', channel: 'sms', status: 'draft' },
]

const announcements = [
  { id: 1, title: 'تحديث النظام القادم', body: 'سيتم تحديث النظام الأحد القادم من 02:00 - 04:00 صباحاً.', audience: 'جميع العيادات', status: 'scheduled', date: '2026-08-11' },
  { id: 2, title: 'ميزة جديدة: تقارير AI', body: 'نعلن بفخر إطلاق تقارير الذكاء الاصطناعي لجميع عيادات باقة Pro.', audience: 'باقة Pro والمركز الطبي', status: 'sent', date: '2026-08-01' },
]

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  push: Bell,
}
const channelColors = {
  email: 'text-blue-600 bg-blue-50',
  sms: 'text-violet-600 bg-violet-50',
  whatsapp: 'text-emerald-600 bg-emerald-50',
  push: 'text-amber-600 bg-amber-50',
}

function TemplateCard({ template, onEdit, onPreview }: { template: Template; onEdit: (t: Template) => void; onPreview: (t: Template) => void }) {
  const Icon = channelIcons[template.channel]
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${channelColors[template.channel]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{template.name}</p>
                <Badge variant={template.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                  {template.status === 'active' ? 'نشط' : 'مسودة'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {template.trigger}
              </p>
              {template.lastSent && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  آخر إرسال: {new Date(template.lastSent).toLocaleDateString('ar-SA')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(template)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(template)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Communications() {
  const { toast } = useToast()
  const [editTemplate, setEditTemplate] = React.useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null)
  const [editBody, setEditBody] = React.useState("")
  const [editSubject, setEditSubject] = React.useState("")
  const [testEmail, setTestEmail] = React.useState("")
  const [announcementText, setAnnouncementText] = React.useState("")
  const [announcementTitle, setAnnouncementTitle] = React.useState("")

  const handleOpenEdit = (t: Template) => {
    setEditTemplate(t)
    setEditBody(t.body)
    setEditSubject(t.subject || '')
  }

  const handleSave = () => {
    toast({ title: "تم الحفظ", description: "تم تحديث القالب بنجاح" })
    setEditTemplate(null)
  }

  const handleSendTest = () => {
    if (!testEmail) return
    toast({ title: "تم إرسال الاختبار", description: `تم إرسال رسالة اختبار إلى ${testEmail}` })
    setTestEmail("")
  }

  const handleSendAnnouncement = () => {
    if (!announcementTitle || !announcementText) return
    toast({ title: "تم جدولة الإعلان", description: "سيتم إرسال الإعلان لجميع العيادات" })
    setAnnouncementTitle("")
    setAnnouncementText("")
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الاتصالات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة قوالب الرسائل والإعلانات</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'قوالب البريد', count: emailTemplates.length, icon: Mail, color: 'text-blue-600 bg-blue-50' },
          { label: 'قوالب واتساب', count: whatsappTemplates.length, icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'قوالب SMS', count: smsTemplates.length, icon: MessageSquare, color: 'text-violet-600 bg-violet-50' },
          { label: 'إعلانات النظام', count: announcements.length, icon: Megaphone, color: 'text-amber-600 bg-amber-50' },
        ].map(item => (
          <Card key={item.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-3.5 w-3.5" />البريد الإلكتروني</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2"><MessageSquare className="h-3.5 w-3.5" />واتساب</TabsTrigger>
          <TabsTrigger value="sms" className="gap-2"><MessageSquare className="h-3.5 w-3.5" />SMS</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2"><Megaphone className="h-3.5 w-3.5" />إعلانات النظام</TabsTrigger>
        </TabsList>

        {/* Email */}
        <TabsContent value="email" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{emailTemplates.length} قوالب بريد إلكتروني</p>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              قالب جديد
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {emailTemplates.map(t => (
              <TemplateCard key={t.id} template={t} onEdit={handleOpenEdit} onPreview={setPreviewTemplate} />
            ))}
          </div>
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{whatsappTemplates.length} قوالب واتساب</p>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              قالب جديد
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {whatsappTemplates.map(t => (
              <TemplateCard key={t.id} template={t} onEdit={handleOpenEdit} onPreview={setPreviewTemplate} />
            ))}
          </div>
        </TabsContent>

        {/* SMS */}
        <TabsContent value="sms" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{smsTemplates.length} قوالب SMS</p>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              قالب جديد
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {smsTemplates.map(t => (
              <TemplateCard key={t.id} template={t} onEdit={handleOpenEdit} onPreview={setPreviewTemplate} />
            ))}
          </div>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="mt-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                إرسال إعلان جديد
              </CardTitle>
              <CardDescription>سيصل الإعلان لجميع العيادات في لوحة التحكم</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>عنوان الإعلان</Label>
                <Input
                  placeholder="مثال: تحديث مهم للنظام"
                  value={announcementTitle}
                  onChange={e => setAnnouncementTitle(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>نص الإعلان</Label>
                <Textarea
                  placeholder="اكتب نص الإعلان هنا..."
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>
              <Button
                onClick={handleSendAnnouncement}
                disabled={!announcementTitle || !announcementText}
                className="gap-2 w-full sm:w-auto"
              >
                <Send className="h-4 w-4" />
                إرسال للجميع
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">الإعلانات السابقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.status === 'sent' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    {a.status === 'sent' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge variant={a.status === 'sent' ? 'success' : 'warning'} className="text-xs flex-shrink-0">
                        {a.status === 'sent' ? 'تم الإرسال' : 'مجدول'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.audience} · {new Date(a.date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="sm:max-w-lg text-right">
          <DialogHeader>
            <DialogTitle>تعديل القالب</DialogTitle>
            <DialogDescription>{editTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editTemplate?.channel === 'email' && (
              <div>
                <Label>الموضوع</Label>
                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="mt-1.5" />
              </div>
            )}
            <div>
              <Label>نص الرسالة</Label>
              <Textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={6}
                className="mt-1.5 resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                المتغيرات المتاحة: {'{clinicName}'} {'{ownerName}'} {'{trialEndDate}'} {'{subscribeLink}'}
              </p>
            </div>
            {editTemplate?.channel === 'email' && (
              <div>
                <Label>إرسال اختبار</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    placeholder="your@email.com"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleSendTest}>إرسال</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>إلغاء</Button>
            <Button onClick={handleSave} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-lg text-right">
          <DialogHeader>
            <DialogTitle>معاينة القالب</DialogTitle>
            <DialogDescription>{previewTemplate?.name}</DialogDescription>
          </DialogHeader>
          {previewTemplate?.subject && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">الموضوع</p>
              <p className="font-medium text-sm mt-0.5">{previewTemplate.subject}</p>
            </div>
          )}
          <div className="rounded-lg border p-4 whitespace-pre-wrap text-sm leading-relaxed">
            {previewTemplate?.body}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>إغلاق</Button>
            <Button onClick={() => { setPreviewTemplate(null); if (previewTemplate) handleOpenEdit(previewTemplate) }} variant="outline" className="gap-2">
              <Edit2 className="h-4 w-4" />
              تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
