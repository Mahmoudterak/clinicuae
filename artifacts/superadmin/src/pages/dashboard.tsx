import * as React from "react"
import { useDashboardStats, useClinics } from "@/hooks/use-api"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, Activity, Clock, DollarSign, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const planLabels = {
  trial: "تجريبي",
  starter: "البداية",
  pro: "الاحترافية",
  medical_center: "المركز الطبي"
}

export const statusBadges = {
  trial: { label: "تجريبي", variant: "warning" as const },
  active: { label: "نشط", variant: "success" as const },
  suspended: { label: "موقوف", variant: "destructive" as const },
  cancelled: { label: "ملغي", variant: "secondary" as const }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading: isStatsLoading } = useDashboardStats()
  const { data: clinics, isLoading: isClinicsLoading } = useClinics()

  const recentClinics = clinics ? [...clinics].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) : []

  // Compute plan distribution for chart
  const planDistribution = clinics?.reduce((acc, clinic) => {
    acc[clinic.plan] = (acc[clinic.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const chartData = [
    { name: planLabels.trial, count: planDistribution.trial || 0, color: '#f59e0b' },
    { name: planLabels.starter, count: planDistribution.starter || 0, color: '#6366f1' },
    { name: planLabels.pro, count: planDistribution.pro || 0, color: '#8b5cf6' },
    { name: planLabels.medical_center, count: planDistribution.medical_center || 0, color: '#ec4899' },
  ];

  if (isStatsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">مرحباً {user?.name} 👋</h1>
        <p className="text-muted-foreground mt-2">نظرة عامة على أداء منصة Clinic OS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العيادات</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">المسجلة في المنصة</p>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate transition-all border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نشطة</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">الاشتراكات الفعالة</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فترة تجريبية</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.trial || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">في انتظار الترقية</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dir-ltr text-right">
              {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(stats?.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">MRR التقديري</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>العيادات المضافة حديثاً</CardTitle>
              <CardDescription>آخر 5 عيادات انضمت للمنصة</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/clinics">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isClinicsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : recentClinics.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">لا توجد عيادات حتى الآن</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العيادة</TableHead>
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
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{clinic.name}</span>
                            <span className="text-xs text-muted-foreground">{clinic.ownerName}</span>
                          </div>
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
                        <TableCell className="text-muted-foreground">
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

        <Card className="md:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>توزيع الباقات</CardTitle>
            <CardDescription>العيادات النشطة والتجريبية حسب نوع الباقة</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             {!clinics || clinics.length === 0 ? (
                <div className="text-muted-foreground">لا توجد بيانات كافية للرسم البياني</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
