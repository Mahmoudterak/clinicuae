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
  X,
  TestTube,
  Activity,
  CreditCard,
  ShieldPlus,
  Cross,
  Package,
  Building2,
  BriefcaseMedical,
  LineChart,
  Bot
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
    { name: t("nav.lab"), href: "/lab", icon: TestTube },
    { name: t("nav.radiology"), href: "/radiology", icon: Activity },
    { name: t("nav.pharmacy"), href: "/pharmacy", icon: Package },
    { name: t("nav.inventory"), href: "/inventory", icon: Package },
    { name: t("nav.departments"), href: "/departments", icon: Building2 },
    { name: t("nav.staff"), href: "/staff", icon: BriefcaseMedical },
  ]

  const comingSoonNavigation = [
    { name: t("dashboard.payments"), icon: CreditCard },
    { name: t("dashboard.insurance"), icon: ShieldPlus },
    { name: t("dashboard.reports"), icon: LineChart },
    { name: t("dashboard.aiAssistant"), icon: Bot },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Clinic OS" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">Clinic OS</span>
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
        fixed inset-y-0 start-0 z-50 w-64 bg-gradient-to-b from-[#312E81] to-[#4338CA] dark:from-slate-900 dark:to-slate-900 border-e border-indigo-900/50 flex flex-col transition-transform duration-300 ease-in-out text-indigo-100 shadow-xl
        md:relative md:translate-x-0
        ${sidebarOpen 
          ? "translate-x-0" 
          : "max-md:-translate-x-full max-md:[html[dir=rtl]_&]:translate-x-full"}
      `}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-indigo-500/30">
          <img src={logoUrl} alt="Clinic OS" className="h-8 w-8 object-contain brightness-0 invert" />
          <span className="font-bold text-xl tracking-tight text-white">Clinic OS</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? "bg-white text-[#312E81] dark:bg-primary dark:text-primary-foreground shadow-sm shadow-black/10" 
                      : "text-indigo-100/80 hover:bg-white/10 hover:text-white"}
                  `}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? "text-[#312E81] dark:text-primary-foreground" : "text-indigo-200 group-hover:text-white"}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-4 py-2">
            <h4 className="px-3 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
              {t("dashboard.comingSoon")}
            </h4>
            <nav className="space-y-1">
              {comingSoonNavigation.map((item) => (
                <div 
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300/50 cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 opacity-50" />
                    {item.name}
                  </div>
                  <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded font-semibold border border-indigo-700/30">
                    {t("dashboard.soon")}
                  </span>
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-indigo-500/30 bg-black/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/30">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Dr. Jane Doe</span>
              <span className="text-xs text-indigo-200">Chief Medical Officer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Top App Bar */}
        <header className="h-16 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder={t("common.searchPlaceholder")}
                className="w-full ps-9 pe-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-card transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 ms-4">
            <button 
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="p-2 w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors font-bold text-sm flex items-center justify-center"
              title="Toggle language"
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
            <ThemeToggle />
            <button className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 end-2 h-2 w-2 rounded-full bg-destructive border-2 border-white dark:border-card"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
