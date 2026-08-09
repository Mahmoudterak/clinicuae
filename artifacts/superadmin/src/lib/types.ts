export type ClinicPlan = "trial" | "starter" | "pro" | "medical_center";
export type ClinicStatus = "trial" | "active" | "suspended" | "cancelled";

export interface Clinic {
  id: number;
  name: string;
  ownerName: string;
  phone: string;
  email: string | null;
  specialty: string | null;
  plan: ClinicPlan;
  status: ClinicStatus;
  trialStartAt: string | null;
  trialEndAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled: number;
  mrr: number;
  arr: number;
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  planBreakdown: {
    trial: number;
    starter: number;
    pro: number;
    medical_center: number;
  };
}
