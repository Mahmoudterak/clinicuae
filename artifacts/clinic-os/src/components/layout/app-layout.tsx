import { Link, useLocation } from "wouter"
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Pill, 
  Receipt,
  Search,
  Bell,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "../theme-provider"
import { useTranslation } from "@/i18n/context"
import logoUrl from "@/assets/clinic-os-logo.png"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t, lang, setLang } = useTranslation()

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.doctorPortal"), href: "/doctor", icon: Stethoscope },
    { name: t("nav.patients"), href: "/patients", icon: Users },
    { name: t("nav.doctors"), href: "/doctors", icon: Stethoscope },
    { name: t("nav.appointments"), href: "/appointments", icon: Calendar },
    { name: t("nav.records"), href: "/records", icon: FileText },
    { name: t("nav.prescriptions"), href: "/prescriptions", icon: Pill },
    { name: t("nav.invoices"), href: "/invoices", icon: Receipt },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Clinic OS" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Clinic OS</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -me-2 text-muted-foreground hover:bg-accent rounded-md"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 start-0 z-50 w-64 bg-sidebar border-e flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${sidebarOpen 
          ? "translate-x-0" 
          : "max-md:-translate-x-full max-md:[html[dir=rtl]_&]:translate-x-full"}
      `}>
        <div className="h-16 flex items-center gap-3 px-6 border-b">
          <img src={logoUrl} alt="Clinic OS" className="h-8 w-8 object-contain" />
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Clinic OS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                `}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Dr. Jane Doe</span>
              <span className="text-xs text-muted-foreground">Chief Medical Officer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-card border-b hidden md:flex items-center justify-between px-8 shrink-0 sticky top-0 z-30">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder={t("common.searchPlaceholder")}
                className="w-full ps-9 pe-4 py-2 bg-muted/50 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ms-4">
            <button 
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="p-2 w-10 h-10 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors font-bold text-sm flex items-center justify-center"
              title="Toggle language"
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
            <ThemeToggle />
            <button className="relative p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-card"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
