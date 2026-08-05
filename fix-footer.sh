sed -i '1,/JD/s/JD/\{role === '\''admin'\'' ? <ShieldAlert className="h-4 w-4" \/> : name?.charAt(4) || '\''D'\''\}/' artifacts/clinic-os/src/components/layout/app-layout.tsx
sed -i '1,/Dr. Jane Doe/s/Dr. Jane Doe/\{name\}/' artifacts/clinic-os/src/components/layout/app-layout.tsx
sed -i '1,/Chief Medical Officer/s/Chief Medical Officer/\{role === '\''admin'\'' ? t("auth.admin") : t("auth.doctor")\}/' artifacts/clinic-os/src/components/layout/app-layout.tsx
