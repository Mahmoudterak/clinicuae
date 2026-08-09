import { ShieldX } from "lucide-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { useAuth, type SuperAdminRole } from "@/hooks/use-auth"

const ROLE_LABELS: Record<SuperAdminRole, string> = {
  super_admin:    "Super Admin",
  platform_admin: "Platform Admin",
  support_admin:  "Support Admin",
  billing_admin:  "Billing Admin",
  developer:      "Developer",
}

/** First accessible page for each role, used as the fallback nav target in AccessDenied. */
const ROLE_HOME: Record<SuperAdminRole, { href: string; label: string }> = {
  super_admin:    { href: "/",              label: "لوحة التحكم" },
  platform_admin: { href: "/",              label: "لوحة التحكم" },
  support_admin:  { href: "/",              label: "لوحة التحكم" },
  billing_admin:  { href: "/subscriptions", label: "الباقات والاشتراكات" },
  developer:      { href: "/developer",     label: "Developer Center" },
}

export function AccessDenied() {
  const { user } = useAuth()
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "—"
  const home = user?.role ? ROLE_HOME[user.role] : { href: "/login", label: "تسجيل الدخول" }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          دورك الحالي (<span className="font-medium text-foreground">{roleLabel}</span>) لا يملك صلاحية الوصول إلى هذه الصفحة.
        </p>
      </div>
      <Link href={home.href}>
        <Button variant="outline">التوجه إلى {home.label}</Button>
      </Link>
    </div>
  )
}
