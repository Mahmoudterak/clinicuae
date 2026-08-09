import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api-client"
import {
  FlaskConical, Server, Code2, Webhook, Database,
  Play, CheckCircle2, Clock, AlertTriangle, Copy,
  ChevronRight, Terminal, Zap, Globe, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

// ─── Environments ─────────────────────────────────────────────────────────────
const ENVIRONMENTS = [
  {
    id: "production",
    label: "Production",
    labelAr: "الإنتاج",
    desc: "البيئة الحية — تؤثر على العيادات الفعلية",
    status: "live" as const,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Globe,
    features: { webhooks: true, email: true, payments: true, sandbox: false },
  },
  {
    id: "staging",
    label: "Staging",
    labelAr: "التجهيز",
    desc: "نسخة مرآة من الإنتاج لاختبار التحديثات",
    status: "ready" as const,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Server,
    features: { webhooks: true, email: false, payments: false, sandbox: false },
  },
  {
    id: "development",
    label: "Development",
    labelAr: "التطوير",
    desc: "البيئة الحالية — البيئة النشطة الآن",
    status: "active" as const,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    icon: Code2,
    features: { webhooks: true, email: false, payments: false, sandbox: true },
  },
  {
    id: "sandbox",
    label: "Sandbox",
    labelAr: "بيئة الاختبار",
    desc: "منعزلة تماماً — بيانات وهمية لا تؤثر على أي شيء",
    status: "isolated" as const,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: FlaskConical,
    features: { webhooks: true, email: false, payments: false, sandbox: true },
  },
]

function statusBadge(status: string) {
  switch (status) {
    case "live": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🟢 Live</Badge>
    case "active": return <Badge className="bg-violet-100 text-violet-700 border-violet-300 text-[10px]">🔵 Active Now</Badge>
    case "ready": return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">⚡ Ready</Badge>
    case "isolated": return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">🔒 Isolated</Badge>
    default: return null
  }
}

// ─── API Tester ───────────────────────────────────────────────────────────────
function ApiTester() {
  const [method, setMethod] = useState("GET")
  const [path, setPath] = useState("/api/superadmin/stats")
  const [body, setBody] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const run = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const token = localStorage.getItem("sa-auth")
      const opts: RequestInit = {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
      if (method !== "GET" && body.trim()) opts.body = body
      const r = await fetch(path, opts)
      setStatus(r.status)
      const text = await r.text()
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)) }
      catch { setResponse(text) }
    } catch (err: any) {
      setResponse(err.message)
      setStatus(0)
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (response) { navigator.clipboard.writeText(response); toast({ title: "تم النسخ" }) }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-24 rounded-xl text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["GET", "POST", "PATCH", "PUT", "DELETE"].map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={path}
          onChange={e => setPath(e.target.value)}
          className="rounded-xl h-9 font-mono text-sm flex-1"
          placeholder="/api/..."
        />
        <Button onClick={run} disabled={loading} size="sm" className="rounded-xl gap-2 h-9">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          تشغيل
        </Button>
      </div>

      {method !== "GET" && (
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder='{ "key": "value" }'
          className="font-mono text-xs rounded-xl"
          rows={3}
        />
      )}

      {response !== null && (
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <Badge variant={status && status < 400 ? "secondary" : "destructive"} className="text-xs">
              {status}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={copy}>
              <Copy className="h-3 w-3 mr-1" />نسخ
            </Button>
          </div>
          <pre className="bg-slate-950 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto max-h-80 font-mono leading-relaxed">
            {response}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Webhook Tester ───────────────────────────────────────────────────────────
function WebhookTester() {
  const [url, setUrl] = useState("")
  const [event, setEvent] = useState("patient.created")
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const test = async () => {
    if (!url) return
    setLoading(true)
    try {
      const payload = {
        event,
        clinicId: 999,
        timestamp: new Date().toISOString(),
        data: event === "patient.created"
          ? { id: 1, firstName: "Test", lastName: "Patient", phone: "+971500000000" }
          : { id: 1, date: "2026-08-09", status: "scheduled" },
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sandbox": "true" },
        body: JSON.stringify(payload),
      })
      setResult(`✅ ${r.status} ${r.statusText}`)
    } catch (err: any) {
      setResult(`❌ ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Webhook URL</Label>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." className="rounded-xl font-mono text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">نوع الحدث</Label>
        <Select value={event} onValueChange={setEvent}>
          <SelectTrigger className="rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["patient.created", "patient.updated", "appointment.created", "appointment.completed", "invoice.paid"].map(e => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={test} disabled={loading || !url} size="sm" className="rounded-xl gap-2">
        {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        إرسال اختبار
      </Button>
      {result && (
        <div className={`text-sm rounded-xl p-3 border font-mono ${result.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {result}
        </div>
      )}
    </div>
  )
}

// ─── DB Stats ─────────────────────────────────────────────────────────────────
function DbStats() {
  const { data, isLoading } = useQuery<{ tables: { name: string; rowCount: number }[] }>({
    queryKey: ["developer-info-tables"],
    queryFn: () => fetchApi("/developer-info"),
  })

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">جاري التحميل…</div>
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {(data?.tables ?? []).map(t => (
        <div key={t.name} className="bg-card border rounded-xl p-3 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground truncate">{t.name}</span>
          <Badge variant="secondary" className="text-xs shrink-0">{t.rowCount}</Badge>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const [activeEnv, setActiveEnv] = useState("development")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          Developer Sandbox
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          اختبر المميزات والـ APIs والـ Webhooks بدون التأثير على العيادات الحقيقية
        </p>
      </div>

      {/* Environment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ENVIRONMENTS.map(env => {
          const Icon = env.icon
          const isActive = activeEnv === env.id
          return (
            <button
              key={env.id}
              onClick={() => setActiveEnv(env.id)}
              className={`text-right rounded-2xl border p-4 transition-all ${isActive ? "ring-2 ring-primary ring-offset-1" : "hover:border-primary/40"} ${env.color}`}
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-5 w-5" />
                {statusBadge(env.status)}
              </div>
              <div className="font-semibold text-sm">{env.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{env.labelAr}</div>
              <p className="text-xs opacity-60 mt-2 leading-relaxed">{env.desc}</p>

              {/* Feature toggles */}
              <div className="mt-3 pt-3 border-t border-current/20 grid grid-cols-2 gap-1">
                {Object.entries(env.features).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 text-[10px] opacity-70">
                    {v ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5 opacity-40" />}
                    {k}
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active env notice */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-2">
        <ChevronRight className="h-4 w-4" />
        البيئة المحددة: <strong className="text-foreground">{ENVIRONMENTS.find(e => e.id === activeEnv)?.label}</strong>
        {activeEnv === "sandbox" && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] mr-2">🔒 جميع البيانات وهمية</Badge>
        )}
      </div>

      {/* Tools */}
      <Tabs defaultValue="api">
        <TabsList className="rounded-xl">
          <TabsTrigger value="api" className="gap-2">
            <Terminal className="h-3.5 w-3.5" />API Tester
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Webhook className="h-3.5 w-3.5" />Webhook Tester
          </TabsTrigger>
          <TabsTrigger value="db" className="gap-2">
            <Database className="h-3.5 w-3.5" />DB Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-4">
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              API Request Tester
            </h3>
            <ApiTester />
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="mt-4">
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              Webhook Tester
            </h3>
            <WebhookTester />
          </div>
        </TabsContent>

        <TabsContent value="db" className="mt-4">
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Database Table Stats
            </h3>
            <DbStats />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
