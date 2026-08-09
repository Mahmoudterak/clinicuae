import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Flag, Loader2 } from 'lucide-react'

interface FeatureFlag {
  id: number
  key: string
  name: string
  nameAr: string
  description: string | null
  enabled: boolean
  category: string
  updatedAt: string
  updatedBy: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'الميزات',
  experimental: 'تجريبي',
  maintenance: 'الصيانة',
}

const CATEGORY_COLORS: Record<string, string> = {
  feature: 'bg-blue-100 text-blue-800',
  experimental: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-red-100 text-red-800',
}

export default function FeatureFlags() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: flags = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['sa-feature-flags'],
    queryFn: () => fetchApi('/feature-flags'),
  })

  const toggle = useMutation({
    mutationFn: (flag: FeatureFlag) =>
      fetchApi(`/feature-flags/${flag.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !flag.enabled }) }),
    onSuccess: (_, flag) => {
      qc.invalidateQueries({ queryKey: ['sa-feature-flags'] })
      toast({
        title: flag.enabled ? 'تم التعطيل' : 'تم التفعيل',
        description: `${flag.nameAr} — ${flag.enabled ? 'معطّل الآن' : 'مفعّل الآن'}`,
      })
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث الميزة' }),
  })

  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    const cat = flag.category ?? 'feature'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(flag)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6 text-primary" />
          Feature Flags
        </h1>
        <p className="text-muted-foreground text-sm mt-1">تفعيل وتعطيل ميزات المنصة بدون نشر جديد</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : flags.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-muted-foreground">لا توجد feature flags</CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryFlags]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-semibold text-base">{CATEGORY_LABELS[category] ?? category}</h2>
                <Badge className={`text-xs ${CATEGORY_COLORS[category] ?? 'bg-muted text-foreground'}`}>
                  {categoryFlags.length} ميزة
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryFlags.map(flag => (
                  <Card key={flag.id} className={`transition-all ${flag.enabled ? 'border-primary/30 bg-primary/5' : 'border-border opacity-75'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-sm font-semibold">{flag.nameAr}</CardTitle>
                          <code className="text-xs text-muted-foreground bg-muted px-1 rounded mt-0.5 inline-block">{flag.key}</code>
                        </div>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => toggle.mutate(flag)}
                          disabled={toggle.isPending}
                        />
                      </div>
                    </CardHeader>
                    {flag.description && (
                      <CardContent className="pt-0 pb-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>
                        {flag.updatedBy && (
                          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                            آخر تعديل بواسطة: <span className="font-medium">{flag.updatedBy}</span>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
