import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/i18n/context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Stethoscope, Loader2, Eye, EyeOff } from "lucide-react";
import logoUrl from "@/assets/clinic-os-logo.png";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LoginPage() {
  const { t, lang, setLang, isRtl } = useTranslation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"admin" | "doctor">("admin");

  // Admin form
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Doctor form
  const [doctorUser, setDoctorUser] = useState("");
  const [doctorPass, setDoctorPass] = useState("");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [showDoctorPass, setShowDoctorPass] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin-users/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPass }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: isRtl ? "فشل تسجيل الدخول" : "Login failed", description: err.error ?? (isRtl ? "بيانات غير صحيحة" : "Invalid credentials") });
        return;
      }
      const data = await res.json();
      login({ role: "admin", name: data.name ?? adminUser });
    } catch {
      toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: isRtl ? "تعذر الاتصال بالخادم" : "Could not reach server" });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorLoading(true);
    try {
      const res = await fetch(`${BASE}/api/doctor-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: doctorUser, password: doctorPass }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: isRtl ? "فشل تسجيل الدخول" : "Login failed", description: err.error ?? (isRtl ? "بيانات غير صحيحة" : "Invalid credentials") });
        return;
      }
      const data = await res.json();
      login({ role: "doctor", doctorId: data.doctorId, name: data.name });
    } catch {
      toast({ variant: "destructive", title: isRtl ? "خطأ" : "Error", description: isRtl ? "تعذر الاتصال بالخادم" : "Could not reach server" });
    } finally {
      setDoctorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 start-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -end-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-40 -start-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="absolute top-4 end-4 z-20">
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="p-2 px-4 rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 transition-colors font-bold text-sm hover:text-indigo-600"
        >
          {lang === "en" ? "عربي" : "English"}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center p-3">
            <img src={logoUrl} alt="Clinic OS" className="h-full w-full object-contain" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("auth.welcome")}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          {t("auth.subtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-2xl shadow-indigo-500/10 sm:rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-700/50">

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/50 p-1 mb-8">
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "admin"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              {t("auth.adminTab")}
            </button>
            <button
              onClick={() => setActiveTab("doctor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "doctor"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              {t("auth.doctorTab")}
            </button>
          </div>

          {/* Admin form */}
          {activeTab === "admin" && (
            <form className="space-y-5" onSubmit={handleAdminLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.username")}
                </label>
                <Input
                  required
                  value={adminUser}
                  onChange={e => setAdminUser(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                  dir="ltr"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showAdminPass ? "text" : "password"}
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50 pe-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(p => !p)}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={adminLoading}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-md font-semibold mt-2 gap-2"
              >
                {adminLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.loginBtn")}
              </Button>
            </form>
          )}

          {/* Doctor form */}
          {activeTab === "doctor" && (
            <form className="space-y-5" onSubmit={handleDoctorLogin}>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3 text-sm text-indigo-700 dark:text-indigo-300 text-center">
                {isRtl
                  ? "استخدم بيانات الحساب التي أنشأها المدير لك"
                  : "Use the credentials created for you by your administrator"}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.username")}
                </label>
                <Input
                  required
                  value={doctorUser}
                  onChange={e => setDoctorUser(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                  dir="ltr"
                  placeholder="dr.username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showDoctorPass ? "text" : "password"}
                    value={doctorPass}
                    onChange={e => setDoctorPass(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50 pe-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDoctorPass(p => !p)}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showDoctorPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={doctorLoading}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-md font-semibold mt-2 gap-2"
              >
                {doctorLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.loginBtn")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
