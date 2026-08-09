import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Shield, RefreshCw } from 'lucide-react'

interface AuditLog {
  id: number
  actorUsername: string | null
  actorName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  resourceLabel: string | null
  tenantName: string | null
  ip: string | null
  previousValue: any
  newValue: any
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  'login': 'bg-green-100 text-green-800',
  'logout': 'bg-slate-100 text-slate-700',
  'clinic.create': 'bg-blue-100 text-blue-800',
  'clinic.update': 'bg-yellow-100 text-yellow-800',
  'clinic.suspend': 'bg-red-100 text-red-800',
  'clinic.delete': 'bg-red-200 text-red-900',
  'clinic.restore': 'bg-green-100 text-green-800',
  'plan.change': 'bg-violet-100 text-violet-800',
  'impersonate': 'bg-orange-100 text-orange-800',
  'feature_flag.toggle': 'bg-cyan-100 text-cyan-800',
  'settings.update': 'bg-indigo-100 text-indigo-800',
  'plan.create': 'bg-blue-100 text-blue-800',
  'plan.update': 'bg-yellow-100 text-yellow-800',
}

const ACTION_LABELS: Record<string, string> = {
  'login': 'تسجيل دخول',
  'logout': 'تسجيل خروج',
  'clinic.create': 'إنشاء عيادة',
  'clinic.update': 'تعديل عيادة',
  'clinic.suspend': 'تعليق عيادة',
  'clinic.delete': 'حذف عيادة',
  'clinic.restore': 'استعادة عيادة',
  'plan.change': 'تغيير الباقة',
  'impersonate': 'انتحال هوية',
  'feature_flag.toggle': 'تبديل ميزة',
  'settings.update': 'تحديث الإعدادات',
  'plan.create': 'إنشاء باقة',
  'plan.update': 'تعديل باقة',
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const { data, isLoading, refetch, isFetching } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ['sa-audit-logs', page],
    queryFn: () => fetchApi(`/audit-logs?page=${page}&limit=${PAGE_SIZE}`),
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.actorUsername?.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceLabel?.toLowerCase().includes(search.toLowerCase()) ||
      l.action.includes(search.toLowerCase()) ||
      l.ip?.includes(search)
    const matchAction = actionFilter === 'all' || l.action === actionFilter
    return matchSearch && matchAction
  })

  const uniqueActions = [...new Set(logs.map(l => l.action))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            سجل المراجعة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تتبع كل العمليات الحساسة في المنصة</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالمستخدم، IP، أو العملية..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="نوع العملية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العمليات</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        إجمالي {total} سجل — عرض {filtered.length} من الصفحة الحالية
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-20 text-center text-muted-foreground">لا توجد سجلات</CardContent></Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">التوقيت</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المستخدم</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">العملية</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المورد</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString('ar-EG', { timeZone: 'Asia/Dubai', hour12: false })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.actorName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{log.actorUsername ?? ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-muted text-foreground'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {log.resourceLabel ? (
                      <div>
                        <div className="font-medium text-xs">{log.resourceLabel}</div>
                        <div className="text-xs text-muted-foreground">{log.resourceType} #{log.resourceId}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
