import * as React from "react"
import { Link, useLocation } from "wouter"
import {
  LayoutDashboard, Building2, LogOut, Menu, CreditCard,
  Shield, Flag, Activity, Settings, Code2, X,
  Users, Mail, HardDrive, ChevronDown, ChevronRight,
  FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { fetchApi } from "@/lib/api-client"
import { useAuth, hasPermission, type SuperAdminRole } from "@/hooks/use-auth"
import { Badge } from "../ui/badge"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  permission?: Parameters<typeof hasPermission>[1]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, permission: "readDashboard" },
      { href: "/clinics", label: "العيادات", icon: Building2, permission: "readClinics" },
      { href: "/subscriptions", label: "الباقات والاشتراكات", icon: CreditCard, permission: "managePlans" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { href: "/feature-flags", label: "Feature Flags", icon: Flag, permission: "managePlatform" },
      { href: "/audit-logs", label: "سجل المراجعة", icon: Shield, permission: "viewAuditLogs" },
      { href: "/settings", label: "إعدادات المنصة", icon: Settings, permission: "managePlatform" },
      { href: "/communications", label: "الاتصالات", icon: Mail, permission: "managePlatform" },
      { href: "/backups", label: "النسخ الاحتياطية", icon: HardDrive, permission: "managePlatform" },
      { href: "/users", label: "المستخدمون", icon: Users, permission: "manageUsers" },
    ],
  },
  {
    label: "الأمان",
    items: [
      { href: "/security", label: "مركز الأمان", icon: Shield, permission: "managePlatform" },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/system-health", label: "حالة النظام", icon: Activity, permission: "viewSystemHealth" },
      { href: "/developer", label: "Developer Center", icon: Code2, permission: "viewDeveloper" },
      { href: "/sandbox", label: "Developer Sandbox", icon: FlaskConical, permission: "viewDeveloper" },
    ],
  },
]

const ROLE_LABELS: Record<SuperAdminRole, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  super_admin:    { label: "Super Admin",     variant: "default" },
  platform_admin: { label: "Platform Admin",  variant: "secondary" },
  support_admin:  { label: "Support Admin",   variant: "outline" },
  billing_admin:  { label: "Billing Admin",   variant: "outline" },
  developer:      { label: "Developer",       variant: "outline" },
}
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [location, setLocation] = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const role = user?.role

  React.useEffect(() => {
    document.documentElement.dir = "rtl"
    document.documentElement.lang = "ar"
  }, [])

  if (!user) return <>{children}</>

  const handleLogout = async () => {
    try { await fetchApi("/auth", { method: "DELETE" }) } catch {}
    logout()
    setLocation("/login")
  }

  const roleInfo = role ? ROLE_LABELS[role] : null

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-right font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="font-bold text-lg tracking-tight text-white">Clinic OS <span className="text-xs text-sidebar-foreground/50 font-normal">Super Admin</span></div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-sidebar-foreground hover:bg-sidebar-accent">
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "bg-sidebar text-sidebar-foreground w-full md:w-64 flex-col transition-all duration-200 border-l border-sidebar-border shadow-xl md:flex md:min-h-screen",
        isMobileMenuOpen ? "flex" : "hidden"
      )}>
        {/* Logo */}
        <div className="p-5 hidden md:flex items-center gap-3 border-b border-sidebar-border/50">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg text-white leading-tight">Clinic OS</div>
            <div className="text-[10px] text-sidebar-foreground/50 font-medium tracking-widest uppercase">Super Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navSections.map(section => {
            // Filter items based on user role
            const visibleItems = section.items.filter(item => {
              if (!item.permission) return true
              return hasPermission(role, item.permission)
            })
            if (visibleItems.length === 0) return null
            return (
              <div key={section.label}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1.5">{section.label}</div>
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    const Icon = item.icon
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        )}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-bold text-sm flex-shrink-0">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <div className="font-medium text-sm text-sidebar-foreground truncate">{user.name}</div>
              <div className="text-xs text-sidebar-foreground/50 truncate">{user.username}</div>
            </div>
          </div>
          {roleInfo && (
            <div className="px-2 mb-3">
              <Badge variant={roleInfo.variant} className="text-[10px] font-medium h-5">
                {roleInfo.label}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 gap-3 text-sm h-9"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background relative">
        <div className="p-5 md:p-8 max-w-7xl mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
