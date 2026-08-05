# appointments
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/appointments/index.tsx
sed -i 's/useListAppointments()/useListAppointments(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/appointments/index.tsx

# records
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/records/index.tsx
sed -i 's/useListMedicalRecords()/useListMedicalRecords(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/records/index.tsx

# prescriptions
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/prescriptions/index.tsx
sed -i 's/useListPrescriptions()/useListPrescriptions(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/prescriptions/index.tsx

# invoices
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/invoices/index.tsx
sed -i 's/useListInvoices()/useListInvoices(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/invoices/index.tsx

# lab
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/lab/index.tsx
sed -i 's/useListLabRequests()/useListLabRequests(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/lab/index.tsx

# radiology
sed -i '1s/^/import { useAuth } from "@\/contexts\/auth-context";\n/' artifacts/clinic-os/src/pages/radiology/index.tsx
sed -i 's/useListRadiologyRequests()/useListRadiologyRequests(useAuth().role === '\''doctor'\'' ? { doctorId: useAuth().doctorId } : undefined)/g' artifacts/clinic-os/src/pages/radiology/index.tsx

