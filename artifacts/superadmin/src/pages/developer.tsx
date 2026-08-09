import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code2, Database, Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DevInfo {
  nodeVersion: string
  platform: string
  uptimeSec: number
  memoryMb: { rss: number; heapUsed: number; heapTotal: number }
  tables: { name: string; rowCount: number }[]
  recentErrors: { message: string; timestamp: string }[]
  recentApiLogs: { action: string; actorUsername: string; ip: string; createdAt: string }[]
}

function formatBytes(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export default function Developer() {
  const { data, isLoading, refetch, isFetching } = useQuery<DevInfo>({
    queryKey: ['sa-dev-info'],
    queryFn: () => fetchApi('/developer-info'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" />
            Developer Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">معلومات النظام وقاعدة البيانات وسجلات العمليات</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <Tabs defaultValue="system" dir="rtl">
        <TabsList>
          <TabsTrigger value="system">معلومات النظام</TabsTrigger>
          <TabsTrigger value="database">قاعدة البيانات</TabsTrigger>
          <TabsTrigger value="logs">سجلات API</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
          ) : data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="py-4">
                  <div className="text-xs text-muted-foreground mb-1">Node.js</div>
                  <div className="font-bold font-mono text-sm">{data.nodeVersion}</div>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <div className="text-xs text-muted-foreground mb-1">المنصة</div>
                  <div className="font-bold font-mono text-sm">{data.platform}</div>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <div className="text-xs text-muted-foreground mb-1">RSS Memory</div>
                  <div className="font-bold font-mono text-sm">{formatBytes(data.memoryMb.rss)}</div>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <div className="text-xs text-muted-foreground mb-1">Heap Used</div>
                  <div className="font-bold font-mono text-sm">{formatBytes(data.memoryMb.heapUsed)} / {formatBytes(data.memoryMb.heapTotal)}</div>
                </CardContent></Card>
              </div>
              {data.recentErrors.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader><CardTitle className="text-sm text-red-700 flex items-center gap-2"><Activity className="w-4 h-4" />أخطاء أخيرة</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.recentErrors.map((e, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs">
                          <span className="text-muted-foreground whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString('ar', {hour12: false})}</span>
                          <code className="text-red-700 bg-red-50 px-2 py-1 rounded flex-1">{e.message}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="database" className="mt-4">
          {isLoading ? (
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  جداول قاعدة البيانات (للقراءة فقط)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">الجدول</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">عدد الصفوف</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.tables ?? []).map((t, i) => (
                        <tr key={t.name} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="px-4 py-2.5 font-mono text-xs">{t.name}</td>
                          <td className="px-4 py-2.5 font-bold">{t.rowCount.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <Badge className="bg-green-100 text-green-800 text-xs">سليم</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <span className="text-yellow-600">⚠</span>
                  قاعدة البيانات في وضع القراءة فقط — لا يمكن تنفيذ استعلامات من المتصفح
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">سجلات العمليات الأخيرة</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">التوقيت</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">العملية</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">المستخدم</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recentApiLogs ?? []).map((log, i) => (
                        <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('ar', {hour12: false})}</td>
                          <td className="px-3 py-2 font-medium">{log.action}</td>
                          <td className="px-3 py-2">{log.actorUsername ?? '—'}</td>
                          <td className="px-3 py-2 font-mono">{log.ip ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
