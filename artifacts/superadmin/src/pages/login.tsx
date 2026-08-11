import * as React from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { fetchApi } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Loader2, Info, Copy, Check } from "lucide-react"

const DEFAULT_CREDS = { username: 'superadmin', password: 'Clinic@OS2024' }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-blue-400 hover:text-blue-200 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [location, setLocation] = useLocation()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
    if (isAuthenticated) {
      setLocation('/')
    }
  }, [isAuthenticated, setLocation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = await fetchApi('/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      
      if (!data.role) {
        setError('حساب غير مكوَّن: يرجى التواصل مع Super Admin لتحديد الدور')
        return
      }
      login({
        token: data.token,
        name: data.name,
        username: data.username,
        role: data.role,
      })
      setLocation('/')
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDefaults = () => {
    setUsername(DEFAULT_CREDS.username)
    setPassword(DEFAULT_CREDS.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center text-white mb-4 shadow-lg shadow-primary/25">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clinic OS</h1>
          <p className="text-sidebar-foreground/60 mt-2 text-lg">لوحة تحكم المنصة</p>
        </div>

        {/* Default credentials hint */}
        <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-900/20 p-4 text-sm text-blue-200">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-blue-100">بيانات الدخول الافتراضية</p>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-1.5">
                  <span><span className="text-blue-400">user:</span> {DEFAULT_CREDS.username}</span>
                  <CopyButton text={DEFAULT_CREDS.username} />
                </div>
                <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-1.5">
                  <span><span className="text-blue-400">pass:</span> {DEFAULT_CREDS.password}</span>
                  <CopyButton text={DEFAULT_CREDS.password} />
                </div>
              </div>
              <button
                type="button"
                onClick={fillDefaults}
                className="text-xs text-blue-300 underline underline-offset-2 hover:text-blue-100 transition-colors"
              >
                ملء تلقائي ←
              </button>
            </div>
          </div>
        </div>

        <Card className="border-sidebar-border bg-card shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات الاعتماد الخاصة بك للوصول</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="username">
                  اسم المستخدم
                </label>
                <Input 
                  id="username"
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="password">
                  كلمة المرور
                </label>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                دخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
