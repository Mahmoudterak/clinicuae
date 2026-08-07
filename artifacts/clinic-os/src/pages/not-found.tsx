import { Link } from 'wouter';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-1">الصفحة غير موجودة</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">Page Not Found</p>
        <Link href="/">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <ArrowRight className="h-4 w-4" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
