import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useListDoctors } from "@workspace/api-client-react";
import { useTranslation } from "@/i18n/context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Stethoscope, ChevronRight, Loader2 } from "lucide-react";
import logoUrl from "@/assets/clinic-os-logo.png";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { t, lang, setLang, isRtl } = useTranslation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"admin" | "doctor">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: doctors, isLoading } = useListDoctors();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      login({ role: "admin", name: "System Admin" });
    } else {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid credentials. Try admin / admin123"
      });
    }
  };

  const handleDoctorLogin = (doctor: any) => {
    login({ 
      role: "doctor", 
      doctorId: doctor.id, 
      name: `Dr. ${doctor.firstName} ${doctor.lastName}` 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 start-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -end-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute top-40 -start-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl"></div>
      </div>

      <div className="absolute top-4 end-4 z-20">
        <button 
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="p-2 px-4 rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 transition-colors font-bold text-sm hover:text-indigo-600"
        >
          {lang === 'en' ? 'عربي' : 'English'}
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
          
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/50 p-1 mb-8">
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "admin" 
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              {t("auth.doctorTab")}
            </button>
          </div>

          {activeTab === "admin" ? (
            <form className="space-y-6" onSubmit={handleAdminLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.username")}
                </label>
                <Input 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("auth.password")}
                </label>
                <Input 
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-md font-semibold mt-4">
                {t("auth.loginBtn")}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pe-2">
              {isLoading ? (
                <div className="py-8 flex justify-center text-indigo-500"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : doctors?.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4">{t("doctors.noDoctors")}</div>
              ) : (
                doctors?.map((doctor) => (
                  <button
                    key={doctor.id}
                    onClick={() => handleDoctorLogin(doctor)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-start"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold">
                        {doctor.firstName[0]}{doctor.lastName[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{doctor.specialty}</div>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
