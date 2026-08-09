import * as React from "react"
import { useDashboardStats, useClinics } from "@/hooks/use-api"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2, Activity, Clock, TrendingUp, Loader2,
  Users, CalendarDays, AlertTriangle, Stethoscope,
  DollarSign, ArrowUpRight, CheckCircle2, XCircle,
} from "lucide-react"
import { Link } from "wouter"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'

import { planLabels, statusBadges } from "@/lib/constants"

// Mock monthly growth data for the sparkline
const growthData = [
  { month: 'يناير', clinics: 180, revenue: 195000 },
  { month: 'فبراير', clinics: 196, revenue: 210000 },
  { month: 'مارس', clinics: 208, revenue: 225000 },
  { month: 'أبريل', clinics: 215, revenue: 238000 },
  { month: 'مايو', clinics: 228, revenue: 255000 },
  { month: 'يونيو', clinics: 237, revenue: 268000 },
  { month: 'يوليو', clinics: 248, revenue: 284500 },
]

function StatCard({
  title, value, subtitle, icon: Icon, color, trend
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: { value: string; positive: boolean }
}) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                <ArrowUpRight className={`h-3 w-3 ${!trend.positive ? 'rotate-90' : ''}`} />
                {trend.value}
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats()
  const { data: clinics, isLoading: isClinicsLoading } = useClinics()

  const recentClinics = clinics
    ? [...clinics].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6)
    : []

  const planDistribution = clinics?.reduce((acc, clinic) => {
    acc[clinic.plan] = (acc[clinic.plan] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const planChartData = [
    { name: 'تجريبي', count: planDistribution.trial || 0, color: '#f59e0b' },
    { name: 'البداية', count: planDistribution.starter || 0, color: '#6366f1' },
    { name: 'الاحترافية', count: planDistribution.pro || 0, color: '#8b5cf6' },
    { name: 'المركز', count: planDistribution.medical_center || 0, color: '#ec4899' },
  ]

  const arrFormatted = stats?.arr
    ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(stats.arr)
    : '—'

  const mrrFormatted = stats?.mrr
    ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(stats.mrr)
    : '—'

  if (isStatsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مرحباً {user?.name} 👋</h1>
          <p className="text-muted-foreground mt-1 text-sm">نظرة عامة على أداء منصة Clinic OS</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 py-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          كل الأنظمة تعمل بشكل طبيعي
        </Badge>
      </div>

      {/* Row 1 — Clinic stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">العيادات</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي العيادات"
            value={stats?.total || 0}
            subtitle="المسجلة في المنصة"
            icon={Building2}
            color="bg-blue-50 text-blue-600"
            trend={{ value: '+12 هذا الشهر', positive: true }}
          />
          <StatCard
            title="العيادات النشطة"
            value={stats?.active || 0}
            subtitle="اشتراك فعّال"
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="فترة تجريبية"
            value={stats?.trial || 0}
            subtitle="في انتظار الترقية"
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="موقوفة"
            value={stats?.suspended || 0}
            subtitle="تحتاج مراجعة"
            icon={XCircle}
            color="bg-red-50 text-red-500"
          />
        </div>
      </div>

      {/* Row 2 — Platform usage */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">بيانات المنصة</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي الأطباء"
            value={stats?.totalDoctors?.toLocaleString('ar-SA') || 0}
            subtitle="على المنصة"
            icon={Stethoscope}
            color="bg-violet-50 text-violet-600"
          />
          <StatCard
            title="إجمالي المرضى"
            value={stats?.totalPatients?.toLocaleString('ar-SA') || 0}
            subtitle="مسجلون"
            icon={Users}
            color="bg-sky-50 text-sky-600"
          />
          <StatCard
            title="المواعيد هذا الشهر"
            value={stats?.totalAppointments?.toLocaleString('ar-SA') || 0}
            subtitle="موعد محجوز"
            icon={CalendarDays}
            color="bg-indigo-50 text-indigo-600"
            trend={{ value: '+8.3% عن الشهر الماضي', positive: true }}
          />
          <StatCard
            title="أخطاء النظام"
            value={7}
            subtitle="خلال 24 ساعة"
            icon={AlertTriangle}
            color="bg-orange-50 text-orange-500"
          />
        </div>
      </div>

      {/* Row 3 — Revenue */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">الإيرادات</p>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الإيرادات الشهرية (MRR)</p>
                  <p className="text-3xl font-bold mt-1 dir-ltr text-right">{mrrFormatted}</p>
                  <p className="text-xs text-muted-foreground mt-1">الإيراد الشهري المتكرر</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الإيرادات السنوية (ARR)</p>
                  <p className="text-3xl font-bold mt-1 dir-ltr text-right">{arrFormatted}</p>
                  <p className="text-xs text-muted-foreground mt-1">الإيراد السنوي المتوقع</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 4 — Charts + Recent */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Revenue growth chart */}
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">نمو الإيرادات</CardTitle>
            <CardDescription>الإيرادات الشهرية خلال 7 أشهر</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => [`${v.toLocaleString()} AED`, 'الإيرادات']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع الباقات</CardTitle>
            <CardDescription>حسب نوع الاشتراك</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {!clinics || clinics.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => [v, 'عيادة']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {planChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Clinics */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">آخر العيادات المنضمة</CardTitle>
            <CardDescription>أحدث 6 عيادات سجّلت في المنصة</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/clinics">عرض الكل</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isClinicsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : recentClinics.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">لا توجد عيادات حتى الآن</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العيادة</TableHead>
                  <TableHead>المالك</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>الباقة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClinics.map((clinic) => {
                  const statusInfo = statusBadges[clinic.status]
                  return (
                    <TableRow key={clinic.id}>
                      <TableCell className="font-medium">{clinic.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{clinic.ownerName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{clinic.specialty || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-xs">
                          {planLabels[clinic.plan]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(clinic.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
