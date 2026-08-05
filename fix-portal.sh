sed -i 's/const handleDoctorChange.*/if (role !== '\''doctor'\'') { return (<div className="flex flex-col items-center justify-center min-h-[60vh]"><h2 className="text-2xl font-bold mb-4">Doctor Access Only<\/h2><Link href="\/login"><Button>Log In as Doctor<\/Button><\/Link><\/div>); }/' artifacts/clinic-os/src/pages/doctor-portal.tsx
sed -i '/localStorage.setItem(/d' artifacts/clinic-os/src/pages/doctor-portal.tsx
sed -i '/setDoctorId(id)/d' artifacts/clinic-os/src/pages/doctor-portal.tsx
