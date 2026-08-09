import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api-client"
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Clock,
  Monitor, Smartphone, Globe, Key, Lock, Eye, RefreshCw,
  TrendingUp, Users, Activity, ChevronDown, Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// ─── Types ────────────────────────────────────────────────────────────────────
interface SecurityEvent {
  id: number
  clinicId: number | null
  adminId: number | null
  eventType: string
  description: string
  ipAddress: string | null
  userAgent: string | null
  device: string | null
  success: boolean
  metadata: string | null
  createdAt: string
}

interface SecurityStats {
  totalEvents: number
  failedLoginsToday: number
  successfulLoginsToday: number
  suspiciousActivityTotal: number
  topFailingIps: { ip: string; count: number }[]
  recentFailures: SecurityEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function eventIcon(type: string) {
  switch (type) {
    case "login_success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "login_failure": return <XCircle className="h-4 w-4 text-red-500" />
    case "suspicious_ip": return <AlertTriangle className="h-4 w-4 text-amber-500" />
    case "logout": return <Clock className="h-4 w-4 text-slate-400" />
    case "permission_denied": return <Lock className="h-4 w-4 text-orange-500" />
    case "impersonation_start": return <Eye className="h-4 w-4 text-violet-500" />
    default: return <Activity className="h-4 w-4 text-muted-foreground" />
  }
}

function eventBadge(type: string, success: boolean) {
  if (!success) return <Badge variant="destructive" className="text-[10px]">فشل</Badge>
  if (type === "suspicious_ip") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">مشبوه</Badge>
  if (type === "impersonation_start") return <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px]">انتحال</Badge>
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">نجاح</Badge>
}

function deviceIcon(device: string | null) {
  if (!device) return <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
  if (device === "Mobile") return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
  return <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "الآن"
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [tab, setTab] = useState("overview")

  const { data: stats, isLoading: statsLoading } = useQuery<SecurityStats>({
    queryKey: ["security-stats"],
    queryFn: () => fetchApi("/security/stats"),
    refetchInterval: 30000,
  })

  const { data: eventsData, isLoading: eventsLoading, refetch } = useQuery<{ events: SecurityEvent[]; total: number }>({
    queryKey: ["security-events", eventTypeFilter],
    queryFn: () => fetchApi(`/security/events?limit=100${eventTypeFilter !== "all" ? `&eventType=${eventTypeFilter}` : ""}`),
    refetchInterval: 30000,
  })

  const { data: sessions = [] } = useQuery<SecurityEvent[]>({
    queryKey: ["security-sessions"],
    queryFn: () => fetchApi("/security/active-sessions"),
    refetchInterval: 30000,
  })

  const events = eventsData?.events ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            مركز الأمان
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            مراقبة الأمان، عزل العيادات، وسياسات الوصول
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          تحديث
        </Button>
      </div>

      {/* ─── Tenant Isolation Banner ─────────────────────────────────── */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">عزل العيادات مُفعَّل</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            كل مسار API محمي بـ <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">requireClinic</code> middleware.
            العيادة A لا تستطيع قراءة بيانات العيادة B ولو وصلت مباشرة للـ API — كل استعلام يُفلتر بـ
            <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded mx-1">clinic_id</code>
            من الـ JWT.
          </p>
        </div>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي الأحداث",
            value: statsLoading ? "…" : (stats?.totalEvents ?? 0).toLocaleString(),
            icon: Activity,
            color: "bg-blue-50 text-blue-600 border-blue-200",
          },
          {
            label: "تسجيلات دخول ناجحة اليوم",
            value: statsLoading ? "…" : (stats?.successfulLoginsToday ?? 0),
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600 border-emerald-200",
          },
          {
            label: "محاولات فاشلة اليوم",
            value: statsLoading ? "…" : (stats?.failedLoginsToday ?? 0),
            icon: XCircle,
            color: stats?.failedLoginsToday
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-slate-50 text-slate-600 border-slate-200",
          },
          {
            label: "نشاط مشبوه",
            value: statsLoading ? "…" : (stats?.suspiciousActivityTotal ?? 0),
            icon: AlertTriangle,
            color: stats?.suspiciousActivityTotal
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-slate-50 text-slate-600 border-slate-200",
          },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`rounded-2xl border p-4 ${card.color}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs mt-0.5 opacity-70">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="overview">الأحداث</TabsTrigger>
          <TabsTrigger value="sessions">الجلسات النشطة</TabsTrigger>
          <TabsTrigger value="ips">أعلى IPs فشلاً</TabsTrigger>
          <TabsTrigger value="policy">سياسات الأمان</TabsTrigger>
        </TabsList>

        {/* ── Events ── */}
        <TabsContent value="overview" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-48 rounded-xl h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأحداث</SelectItem>
                <SelectItem value="login_success">تسجيل دخول ناجح</SelectItem>
                <SelectItem value="login_failure">تسجيل دخول فاشل</SelectItem>
                <SelectItem value="suspicious_ip">نشاط مشبوه</SelectItem>
                <SelectItem value="logout">تسجيل خروج</SelectItem>
                <SelectItem value="impersonation_start">انتحال هوية</SelectItem>
                <SelectItem value="permission_denied">رفض صلاحية</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{eventsData?.total ?? 0} حدث</span>
          </div>

          {eventsLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">جاري التحميل…</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl">
              <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد أحداث أمنية بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
                  <div className="shrink-0">{eventIcon(ev.eventType)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {eventBadge(ev.eventType, ev.success)}
                      <span className="text-sm truncate">{ev.description}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {ev.ipAddress && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />{ev.ipAddress}
                        </span>
                      )}
                      {ev.device && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {deviceIcon(ev.device)}{ev.device}
                        </span>
                      )}
                      {ev.clinicId && (
                        <span className="text-xs text-muted-foreground">عيادة #{ev.clinicId}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{timeAgo(ev.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Active Sessions ── */}
        <TabsContent value="sessions" className="mt-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد جلسات نشطة في آخر 24 ساعة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {s.ipAddress && <span className="text-xs text-muted-foreground">{s.ipAddress}</span>}
                      {s.device && <span className="text-xs text-muted-foreground">{s.device}</span>}
                      {s.clinicId && <span className="text-xs text-muted-foreground">عيادة #{s.clinicId}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(s.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Top Failing IPs ── */}
        <TabsContent value="ips" className="mt-4">
          {!stats?.topFailingIps?.length ? (
            <div className="text-center py-12 border border-dashed rounded-2xl">
              <Globe className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد محاولات فاشلة مسجَّلة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topFailingIps.map((entry, i) => (
                <div key={entry.ip} className="bg-card border rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-50 text-slate-600 border"}`}>
                    {i + 1}
                  </div>
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-sm flex-1">{entry.ip}</span>
                  <Badge variant={entry.count > 10 ? "destructive" : "secondary"}>
                    {entry.count} محاولة فاشلة
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Policies ── */}
        <TabsContent value="policy" className="mt-4 space-y-6">
          {/* Password Policy */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">سياسة كلمة المرور</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">الحد الأدنى للأحرف</Label>
                <Input defaultValue="8" type="number" className="rounded-xl h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">أقصى مدة لكلمة المرور (يوم)</Label>
                <Input defaultValue="90" type="number" className="rounded-xl h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "يجب احتواء حروف كبيرة وصغيرة", def: true },
                { label: "يجب احتواء أرقام", def: true },
                { label: "يجب احتواء رموز خاصة (!@#$...)", def: false },
                { label: "منع إعادة استخدام آخر 5 كلمات مرور", def: true },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="text-sm">{p.label}</span>
                  <Switch defaultChecked={p.def} />
                </div>
              ))}
            </div>
          </div>

          {/* Session Policy */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">سياسة الجلسات</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">مدة انتهاء الجلسة (ساعة)</Label>
                <Input defaultValue="24" type="number" className="rounded-xl h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الحد الأقصى لعدد الجلسات المتزامنة</Label>
                <Input defaultValue="3" type="number" className="rounded-xl h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">قفل الحساب بعد (محاولة)</Label>
                <Input defaultValue="5" type="number" className="rounded-xl h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مدة القفل (دقيقة)</Label>
                <Input defaultValue="15" type="number" className="rounded-xl h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "إنهاء الجلسة عند تغيير كلمة المرور", def: true },
                { label: "إنهاء الجلسات الأخرى عند تسجيل دخول جديد", def: false },
                { label: "إرسال تنبيه عند تسجيل دخول من IP جديد", def: true },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="text-sm">{p.label}</span>
                  <Switch defaultChecked={p.def} />
                </div>
              ))}
            </div>
          </div>

          {/* 2FA */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">المصادقة الثنائية (2FA)</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "إلزامي لمسؤولي المنصة (Super Admin)", def: true },
                { label: "إلزامي لمسؤولي العيادات", def: false },
                { label: "يُسمح بتطبيقات TOTP (Google Authenticator)", def: true },
                { label: "يُسمح بالتحقق عبر SMS", def: false },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="text-sm">{p.label}</span>
                  <Switch defaultChecked={p.def} />
                </div>
              ))}
            </div>
            <Button size="sm" className="rounded-xl">حفظ سياسات الأمان</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
