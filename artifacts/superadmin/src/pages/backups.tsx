import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  HardDrive, Download, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, Database, FileArchive, Calendar, Shield,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BackupRecord {
  id: string
  type: 'database' | 'files' | 'full'
  size: string
  status: 'success' | 'failed' | 'running'
  duration: string
  createdBy: string
  createdAt: string
  note?: string
}

const backupHistory: BackupRecord[] = [
  { id: 'bkp_001', type: 'full', size: '2.4 GB', status: 'success', duration: '4m 12s', createdBy: 'Auto (Scheduled)', createdAt: '2026-08-09T02:00:00Z' },
  { id: 'bkp_002', type: 'database', size: '890 MB', status: 'success', duration: '1m 45s', createdBy: 'superadmin', createdAt: '2026-08-08T14:30:00Z', note: 'قبل تحديث النظام' },
  { id: 'bkp_003', type: 'full', size: '2.3 GB', status: 'success', duration: '3m 58s', createdBy: 'Auto (Scheduled)', createdAt: '2026-08-08T02:00:00Z' },
  { id: 'bkp_004', type: 'files', size: '1.6 GB', status: 'success', duration: '2m 11s', createdBy: 'Auto (Scheduled)', createdAt: '2026-08-07T02:00:00Z' },
  { id: 'bkp_005', type: 'full', size: '—', status: 'failed', duration: '12m 00s', createdBy: 'Auto (Scheduled)', createdAt: '2026-08-06T02:00:00Z', note: 'انتهت مهلة الاتصال بقاعدة البيانات' },
  { id: 'bkp_006', type: 'full', size: '2.2 GB', status: 'success', duration: '4m 02s', createdBy: 'Auto (Scheduled)', createdAt: '2026-08-05T02:00:00Z' },
  { id: 'bkp_007', type: 'database', size: '860 MB', status: 'success', duration: '1m 40s', createdBy: 'superadmin', createdAt: '2026-08-04T09:15:00Z', note: 'قبل ترقية المخطط' },
]

const typeLabels = { database: 'قاعدة البيانات', files: 'الملفات', full: 'نسخة كاملة' }
const typeIcons = { database: Database, files: FileArchive, full: HardDrive }
const typeColors = {
  database: 'text-blue-600 bg-blue-50',
  files: 'text-violet-600 bg-violet-50',
  full: 'text-indigo-600 bg-indigo-50',
}

export default function Backups() {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = React.useState(false)
  const [restoreTarget, setRestoreTarget] = React.useState<BackupRecord | null>(null)

  const lastSuccess = backupHistory.find(b => b.status === 'success')

  const handleRunBackup = async (type: 'database' | 'files' | 'full') => {
    setIsRunning(true)
    toast({ title: "بدأت النسخة الاحتياطية", description: `جارٍ إنشاء ${typeLabels[type]}...` })
    await new Promise(r => setTimeout(r, 2500))
    setIsRunning(false)
    toast({ title: "✅ تمت النسخ الاحتياطي", description: "تم حفظ النسخة بنجاح" })
  }

  const handleRestore = () => {
    toast({ title: "طلب الاستعادة مُرسَل", description: "سيتواصل معك فريق الدعم الفني لتأكيد العملية" })
    setRestoreTarget(null)
  }

  const successCount = backupHistory.filter(b => b.status === 'success').length
  const totalSize = '18.2 GB'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">النسخ الاحتياطية</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة نسخ البيانات والاستعادة</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunBackup('database')}
            disabled={isRunning}
            className="gap-2"
          >
            <Database className="h-3.5 w-3.5" />
            نسخ قاعدة البيانات
          </Button>
          <Button
            size="sm"
            onClick={() => handleRunBackup('full')}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
            نسخة كاملة
          </Button>
        </div>
      </div>

      {/* Last backup status */}
      {lastSuccess && (
        <Card className="border-none shadow-sm bg-gradient-to-l from-emerald-50 to-teal-50 border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-emerald-800">آخر نسخة احتياطية ناجحة</p>
                <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(lastSuccess.createdAt).toLocaleString('ar-SA')}
                  </span>
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {lastSuccess.size}
                  </span>
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastSuccess.duration}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'نسخ ناجحة', value: successCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'نسخ فاشلة', value: backupHistory.filter(b => b.status === 'failed').length, icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
          { label: 'الحجم الإجمالي', value: totalSize, icon: HardDrive, color: 'text-blue-600 bg-blue-50' },
          { label: 'الجدول التلقائي', value: 'يومياً 02:00', icon: Clock, color: 'text-violet-600 bg-violet-50' },
        ].map(item => (
          <Card key={item.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
        <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-medium text-amber-800">تحذير الاستعادة: </span>
          <span className="text-amber-700">عملية الاستعادة تُوقف النظام مؤقتاً وتستبدل البيانات الحالية. تحتاج تأكيداً إضافياً من Super Admin وستُسجَّل في سجل المراجعة.</span>
        </div>
      </div>

      {/* Backup history */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">سجل النسخ الاحتياطية</CardTitle>
          <CardDescription>آخر {backupHistory.length} نسخة احتياطية</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead>الحجم</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>أُنشئ بواسطة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.map(backup => {
                const Icon = typeIcons[backup.type]
                return (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${typeColors[backup.type]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{typeLabels[backup.type]}</p>
                          {backup.note && <p className="text-xs text-muted-foreground">{backup.note}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{backup.size}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{backup.duration}</TableCell>
                    <TableCell>
                      <Badge
                        variant={backup.status === 'success' ? 'success' : backup.status === 'failed' ? 'destructive' : 'warning'}
                        className="text-xs"
                      >
                        {backup.status === 'success' ? 'ناجحة' : backup.status === 'failed' ? 'فاشلة' : 'جارٍ...'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{backup.createdBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(backup.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {backup.status === 'success' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="تنزيل">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-amber-600"
                              title="استعادة"
                              onClick={() => setRestoreTarget(backup)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restore confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد الاستعادة
            </AlertDialogTitle>
            <AlertDialogDescription>
              أنت على وشك استعادة النسخة الاحتياطية من{' '}
              <strong>{restoreTarget && new Date(restoreTarget.createdAt).toLocaleString('ar-SA')}</strong>.
              سيؤدي هذا إلى استبدال جميع البيانات الحالية. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-amber-600 hover:bg-amber-700"
            >
              تأكيد الاستعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
