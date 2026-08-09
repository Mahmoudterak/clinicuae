export const planLabels: Record<string, string> = {
  trial: "تجريبي",
  starter: "البداية",
  pro: "الاحترافية",
  medical_center: "المركز الطبي",
}

export const statusBadges: Record<string, { label: string; variant: "warning" | "success" | "destructive" | "secondary" }> = {
  trial: { label: "تجريبي", variant: "warning" },
  active: { label: "نشط", variant: "success" },
  suspended: { label: "موقوف", variant: "destructive" },
  cancelled: { label: "ملغي", variant: "secondary" },
}

export const planColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700 border-amber-200",
  starter: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pro: "bg-violet-50 text-violet-700 border-violet-200",
  medical_center: "bg-pink-50 text-pink-700 border-pink-200",
}
