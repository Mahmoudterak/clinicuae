import * as React from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { LayoutDashboard, Building2, LogOut, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { fetchApi } from "@/lib/api-client"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [location, setLocation] = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    // Add RTL class to body
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  }, [])

  if (!user) {
    return <>{children}</>
  }

  const handleLogout = async () => {
    try {
      await fetchApi('/auth', { method: 'DELETE' })
    } catch (e) {
      // Ignore errors on logout
    }
    logout()
    setLocation('/login')
  }

  const navItems = [
    { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/clinics', label: 'العيادات', icon: Building2 },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50 text-right font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="font-bold text-xl tracking-tight">Clinic OS</div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-sidebar-foreground hover:bg-sidebar-accent">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "bg-sidebar text-sidebar-foreground w-full md:w-64 flex-col transition-all duration-200 border-l border-sidebar-border shadow-xl md:flex",
        isMobileMenuOpen ? "flex" : "hidden"
      )}>
        <div className="p-6 hidden md:block">
          <div className="font-bold text-2xl tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Building2 className="w-5 h-5" />
            </div>
            Clinic OS
          </div>
          <div className="text-xs text-sidebar-foreground/60 mt-1">Super Admin Portal</div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-bold">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm text-sidebar-foreground">{user.name}</div>
              <div className="text-xs text-sidebar-foreground/60">{user.username}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/80 hover:text-white hover:bg-destructive/20 gap-3"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50/50 relative">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
