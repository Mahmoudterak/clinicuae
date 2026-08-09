import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity, Database, Shield, Wifi, Clock } from 'lucide-react'

interface ServiceHealth {
  name: string
  nameAr: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  responseTimeMs?: number
  message?: string
  lastChecked: string
}

interface SystemHealthResponse {
  overall: 'healthy' | 'warning' | 'critical'
  checkedAt: string
  services: ServiceHealth[]
  dbStats: {
    totalClinics: number
    totalPatients: number
    totalDoctors: number
    totalAppointments: number
  }
  uptimeSec: number
}

const STATUS_CONFIG = {
  healthy: { label: 'سليم', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, iconColor: 'text-green-500', cardBorder: 'border-green-200' },
  warning: { label: 'تحذير', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500', cardBorder: 'border-yellow-200' },
  critical: { label: 'حرج', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, iconColor: 'text-red-500', cardBorder: 'border-red-200' },
  unknown: { label: 'غير معروف', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Activity, iconColor: 'text-slate-400', cardBorder: 'border-border' },
}

function formatUptime(secs: number) {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}ي ${h}س ${m}د`
  if (h > 0) return `${h}س ${m}د`
  return `${m}د`
}

export default function SystemHealth() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<SystemHealthResponse>({
    queryKey: ['sa-system-health'],
    queryFn: () => fetchApi('/system-health'),
    refetchInterval: 30_000,
  })

  const overall = data?.overall ?? 'unknown'
  const overallCfg = STATUS_CONFIG[overall]
  const OverallIcon = overallCfg.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            حالة النظام
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            مراقبة صحة الخدمات في الوقت الفعلي — يتحدث كل 30 ثانية
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('ar', { hour12: false }) : 'تحديث'}
        </Button>
      </div>

      {/* Overall Status Banner */}
      {!isLoading && data && (
        <Card className={`border-2 ${overallCfg.cardBorder}`}>
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overall === 'healthy' ? 'bg-green-100' : overall === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <OverallIcon className={`w-6 h-6 ${overallCfg.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">
                  {overall === 'healthy' ? 'جميع الخدمات تعمل بشكل سليم' : overall === 'warning' ? 'بعض الخدمات تحتاج انتباهاً' : 'هناك مشاكل حرجة في النظام'}
                </div>
                <div className="text-sm text-muted-foreground">
                  آخر فحص: {data.checkedAt ? new Date(data.checkedAt).toLocaleString('ar-EG', { timeZone: 'Asia/Dubai', hour12: false }) : '—'}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{data.uptimeSec ? formatUptime(data.uptimeSec) : '—'}</div>
                  <div className="text-muted-foreground">وقت التشغيل</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DB Quick Stats */}
      {data?.dbStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'العيادات المسجلة', value: data.dbStats.totalClinics, icon: Database },
            { label: 'المرضى', value: data.dbStats.totalPatients, icon: Shield },
            { label: 'الأطباء', value: data.dbStats.totalDoctors, icon: Wifi },
            { label: 'المواعيد', value: data.dbStats.totalAppointments, icon: Clock },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-xl">{stat.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data?.services ?? []).map(service => {
            const cfg = STATUS_CONFIG[service.status]
            const Icon = cfg.icon
            return (
              <Card key={service.name} className={`border ${cfg.cardBorder}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{service.nameAr}</CardTitle>
                    <Badge className={`text-xs ${cfg.color}`}>
                      <Icon className="w-3 h-3 ml-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {service.responseTimeMs != null ? (
                      <span className="font-mono">{service.responseTimeMs}ms</span>
                    ) : <span>—</span>}
                    <span>{service.message ?? ''}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
