import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth, type SuperAdminRole } from '@/hooks/use-auth'
import { Users, Plus, Shield, Edit2 } from 'lucide-react'

interface AdminUser {
  id: number
  username: string
  name: string
  role: SuperAdminRole
  createdAt: string
}

const ROLE_BADGE_COLOR: Record<SuperAdminRole, string> = {
  super_admin:    '',
  platform_admin: '',
  support_admin:  'text-blue-600 border-blue-300',
  billing_admin:  'text-green-700 border-green-300',
  developer:      'text-violet-700 border-violet-300',
}

const ROLES: { value: SuperAdminRole; label: string; description: string }[] = [
  { value: 'super_admin',    label: 'Super Admin',    description: 'وصول كامل لكل شيء' },
  { value: 'platform_admin', label: 'Platform Admin', description: 'إدارة المنصة بدون صلاحيات المستخدمين والفوترة' },
  { value: 'support_admin',  label: 'Support Admin',  description: 'قراءة العيادات وسجلات المراجعة فقط' },
  { value: 'billing_admin',  label: 'Billing Admin',  description: 'إدارة الباقات والاشتراكات فقط' },
  { value: 'developer',      label: 'Developer',      description: 'مركز المطورين وصحة النظام فقط' },
]

const ROLE_BADGE_VARIANT: Record<SuperAdminRole, 'default' | 'secondary' | 'outline'> = {
  super_admin:    'default',
  platform_admin: 'secondary',
  support_admin:  'outline',
  billing_admin:  'outline',
  developer:      'outline',
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ username: '', password: '', name: '', role: 'support_admin' as SuperAdminRole })

  const [roleOpen, setRoleOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [newRole, setNewRole] = useState<SuperAdminRole>('support_admin')

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['sa-users'],
    queryFn: () => fetchApi('/users'),
  })

  const addUser = useMutation({
    mutationFn: (body: typeof addForm) =>
      fetchApi('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-users'] })
      toast({ title: 'تم إضافة المستخدم', description: `تمت إضافة ${addForm.name} بنجاح` })
      setAddOpen(false)
      setAddForm({ username: '', password: '', name: '', role: 'support_admin' })
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إضافة المستخدم' }),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: SuperAdminRole }) =>
      fetchApi(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sa-users'] })
      const roleLabel = ROLES.find(r => r.value === vars.role)?.label ?? vars.role
      toast({ title: 'تم تغيير الدور', description: `تم تعيين دور "${roleLabel}"` })
      setRoleOpen(false)
      setEditingUser(null)
    },
    onError: () => toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تغيير الدور' }),
  })

  function openRoleDialog(u: AdminUser) {
    setEditingUser(u)
    setNewRole(u.role)
    setRoleOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            المستخدمون
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مستخدمي Super Admin وأدوارهم</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مستخدم
        </Button>
      </div>

      {/* Role Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            الأدوار والصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <Badge variant={ROLE_BADGE_VARIANT[r.value]} className={`mt-0.5 text-[10px] shrink-0 ${ROLE_BADGE_COLOR[r.value]}`}>
                  {r.label}
                </Badge>
                <span className="text-xs text-muted-foreground leading-relaxed">{r.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">قائمة المستخدمين</CardTitle>
          <CardDescription className="text-sm">{users.length} مستخدم مسجل</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">لا يوجد مستخدمون</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map(u => {
                const isMe = u.username === me?.username
                const roleInfo = ROLES.find(r => r.value === u.role)
                return (
                  <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {u.name}
                          {isMe && <span className="text-[10px] text-muted-foreground font-normal">(أنت)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge
                        variant={ROLE_BADGE_VARIANT[u.role]}
                        className={`text-[10px] ${ROLE_BADGE_COLOR[u.role]}`}
                      >
                        {roleInfo?.label ?? u.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openRoleDialog(u)}
                      >
                        <Edit2 className="w-3 h-3" />
                        تغيير الدور
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="محمد أحمد"
              />
            </div>
            <div className="space-y-1.5">
              <Label>اسم المستخدم</Label>
              <Input
                value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                placeholder="m.ahmed"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الدور</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v as SuperAdminRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <div className="font-medium text-sm">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => addUser.mutate(addForm)}
              disabled={addUser.isPending || !addForm.name || !addForm.username || !addForm.password}
            >
              {addUser.isPending ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير دور المستخدم</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {editingUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{editingUser.name}</div>
                  <div className="text-xs text-muted-foreground">{editingUser.username}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الدور الجديد</Label>
                <Select value={newRole} onValueChange={v => setNewRole(v as SuperAdminRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <div className="font-medium text-sm">{r.label}</div>
                          <div className="text-xs text-muted-foreground">{r.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => editingUser && changeRole.mutate({ id: editingUser.id, role: newRole })}
              disabled={changeRole.isPending || newRole === editingUser?.role}
            >
              {changeRole.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
