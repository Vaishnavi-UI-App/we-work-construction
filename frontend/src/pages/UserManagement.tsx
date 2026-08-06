import React from 'react'
import { fetchUsers, createUser, updateUser, deleteUser, fetchRoles, createRole, updateRole, deleteRole, fetchSites } from '../api'
import { Plus, Pencil, Trash2, X, ShieldCheck, Shield, Users as UsersIcon } from 'lucide-react'
import toast from 'react-hot-toast'

const MODULES = ['dashboard', 'tracker', 'billing', 'delivery-challan', 'simple-challan', 'banking', 'attendance', 'admin-attendance', 'customers', 'vendors', 'reports'] as const
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tracker: 'Expense Tracker',
  billing: 'Billing',
  'delivery-challan': 'Delivery Challan (Tax/GST)',
  'simple-challan': 'Delivery Challan (Simple)',
  banking: 'Banking',
  attendance: 'My Attendance',
  'admin-attendance': 'All Attendance',
  customers: 'Customers',
  vendors: 'Vendors',
  reports: 'Reports',
}
const ACTIONS = ['canView', 'canAdd', 'canEdit', 'canDelete'] as const
const ACTION_LABELS: Record<string, string> = { canView: 'View', canAdd: 'Add', canEdit: 'Edit', canDelete: 'Delete' }

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── User Form ────────────────────────────────────────────────────────────────
function UserForm({ initial, roles, sites, onSave, onClose }: {
  initial?: any; roles: any[]; sites: any[]; onSave: (d: any) => Promise<void>; onClose: () => void
}) {
  const [name,     setName]     = React.useState(initial?.name || '')
  const [email,    setEmail]    = React.useState(initial?.email || '')
  const [phone,    setPhone]    = React.useState(initial?.phone || '')
  const [isAdminRole, setIsAdminRole] = React.useState(initial ? initial.role === 'ADMIN' : false)
  const [roleId,   setRoleId]   = React.useState<number | ''>(initial?.roleId || '')
  const [siteId,   setSiteId]   = React.useState<number | ''>(initial?.siteId || '')
  const [password, setPassword] = React.useState('')
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true)
  const [loading,  setLoading]  = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdminRole && !roleId) { toast.error('Select an access level'); return }
    setLoading(true)
    try {
      await onSave({
        name, email, phone, isActive,
        roleId: isAdminRole ? null : Number(roleId),
        siteId: siteId ? Number(siteId) : null,
        ...(password ? { password } : {}),
      })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@wework.com" required />
      </div>
      <div>
        <label className="label">{initial ? 'New Password (leave blank to keep)' : 'Password *'}</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required={!initial} />
      </div>

      <div>
        <label className="label">Access Level</label>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => { setIsAdminRole(true); setSiteId('') }}
            className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
              isAdminRole ? 'bg-rose-50 text-rose-700 border-rose-300' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            ADMIN
            <span className="block text-xs font-normal opacity-70 mt-0.5">Full access to every page and every branch</span>
          </button>
          {roles.map(r => (
            <button key={r.id} type="button" onClick={() => { setIsAdminRole(false); setRoleId(r.id) }}
              className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                !isAdminRole && roleId === r.id ? 'bg-purple-50 text-purple-700 border-purple-300' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              {r.name}
              <span className="block text-xs font-normal opacity-70 mt-0.5">{r.isAllSites ? 'Sees all branches' : 'Branch-restricted'}</span>
            </button>
          ))}
          {!roles.length && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              No custom roles yet — create one in the Roles tab, or assign ADMIN.
            </p>
          )}
        </div>
      </div>

      {!isAdminRole && (
        <div>
          <label className="label">Branch</label>
          <select className="input" value={siteId} onChange={e => setSiteId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All Branches (no restriction)</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            If the selected role isn't marked "All Branches", this user will only see data for the branch picked here.
          </p>
        </div>
      )}

      {initial && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsActive(v => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${isActive ? 'left-5' : 'left-1'}`} />
          </button>
          <span className="text-sm text-slate-600">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Saving…' : (initial ? 'Update User' : 'Create User')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ── Role Form ────────────────────────────────────────────────────────────────
function RoleForm({ initial, onSave, onClose }: { initial?: any; onSave: (d: any) => Promise<void>; onClose: () => void }) {
  const [name, setName] = React.useState(initial?.name || '')
  const [isAllSites, setIsAllSites] = React.useState(initial?.isAllSites ?? true)
  const [perms, setPerms] = React.useState<Record<string, Record<string, boolean>>>(() => {
    const base: Record<string, Record<string, boolean>> = {}
    for (const m of MODULES) {
      const existing = initial?.permissions?.find((p: any) => p.module === m)
      base[m] = {
        canView: !!existing?.canView, canAdd: !!existing?.canAdd,
        canEdit: !!existing?.canEdit, canDelete: !!existing?.canDelete,
      }
    }
    return base
  })
  const [loading, setLoading] = React.useState(false)

  function toggle(moduleKey: string, action: string) {
    setPerms(prev => {
      const nextModule = { ...prev[moduleKey], [action]: !prev[moduleKey][action] }
      if (action !== 'canView' && nextModule[action]) nextModule.canView = true
      return { ...prev, [moduleKey]: nextModule }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter a role name'); return }
    setLoading(true)
    try {
      const permissions = MODULES.map(m => ({ module: m, ...perms[m] }))
      await onSave({ name: name.trim(), isAllSites, permissions })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Role Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Site Supervisor" autoFocus required />
      </div>

      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
        <button type="button" onClick={() => setIsAllSites(v => !v)}
          className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${isAllSites ? 'bg-blue-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${isAllSites ? 'left-5' : 'left-1'}`} />
        </button>
        <div>
          <p className="text-sm font-medium text-slate-700">All Branches</p>
          <p className="text-xs text-slate-400">Off — members only see data for their own assigned branch</p>
        </div>
      </div>

      <div>
        <label className="label mb-2">Page Access</label>
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-3 py-2 font-medium">Page</th>
                {ACTIONS.map(a => <th key={a} className="px-2 py-2 font-medium">{ACTION_LABELS[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(m => (
                <tr key={m} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{MODULE_LABELS[m]}</td>
                  {ACTIONS.map(action => (
                    <td key={action} className="text-center px-2 py-2">
                      <input type="checkbox" checked={perms[m][action]} onChange={() => toggle(m, action)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Saving…' : (initial ? 'Update Role' : 'Create Role')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ roles, sites }: { roles: any[]; sites: any[] }) {
  const [users,  setUsers]  = React.useState<any[]>([])
  const [loading,setLoading]= React.useState(true)
  const [modal,  setModal]  = React.useState<'create' | 'edit' | null>(null)
  const [editing,setEditing]= React.useState<any>(null)

  function load() { setLoading(true); fetchUsers().then(d => { setUsers(d); setLoading(false) }).catch(() => setLoading(false)) }
  React.useEffect(load, [])

  async function handleCreate(data: any) {
    try { await createUser(data); toast.success('User created!'); setModal(null); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  async function handleUpdate(data: any) {
    try { await updateUser(editing.id, data); toast.success('User updated!'); setModal(null); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}?`)) return
    try { await deleteUser(id); toast.success('User deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => { setModal('create'); setEditing(null) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u: any) => {
            const isAdmin = u.role === 'ADMIN'
            return (
              <div key={u.id} className="card hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${isAdmin ? 'bg-blue-600' : 'bg-purple-500'}`}>
                      {(u.name || u.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEditing(u); setModal('edit') }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(u.id, u.name || u.email)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-1.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isAdmin ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                    {u.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-slate-400 mt-2">
                    {u.site?.name ? `Branch: ${u.site.name}` : 'All Branches'}
                  </p>
                )}
                {u.phone && <p className="text-xs text-slate-400 mt-1">{u.phone}</p>}
                <p className="text-xs text-slate-300 mt-2">
                  Joined {new Date(u.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            )
          })}
          {!users.length && (
            <div className="col-span-3 card text-center py-16 text-slate-400">No users yet</div>
          )}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Add New User" onClose={() => setModal(null)}>
          <UserForm roles={roles} sites={sites} onSave={handleCreate} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editing && (
        <Modal title={`Edit — ${editing.name || editing.email}`} onClose={() => setModal(null)}>
          <UserForm initial={editing} roles={roles} sites={sites} onSave={handleUpdate} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Roles Tab ────────────────────────────────────────────────────────────────
function RolesTab({ onRolesChanged }: { onRolesChanged: () => void }) {
  const [roles,  setRoles]  = React.useState<any[]>([])
  const [loading,setLoading]= React.useState(true)
  const [modal,  setModal]  = React.useState<'create' | 'edit' | null>(null)
  const [editing,setEditing]= React.useState<any>(null)

  function load() {
    setLoading(true)
    fetchRoles().then(d => { setRoles(d); setLoading(false); onRolesChanged() }).catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  async function handleCreate(data: any) {
    try { await createRole(data); toast.success('Role created!'); setModal(null); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  async function handleUpdate(data: any) {
    try { await updateRole(editing.id, data); toast.success('Role updated!'); setModal(null); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete role "${name}"?`)) return
    try { await deleteRole(id); toast.success('Role deleted'); load() }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{roles.length} custom role{roles.length !== 1 ? 's' : ''} — ADMIN always has full access to everything</p>
        <button onClick={() => { setModal('create'); setEditing(null) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r: any) => {
            const granted = (r.permissions || []).filter((p: any) => p.canView)
            return (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-purple-500 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r._count?.users || 0} user{r._count?.users !== 1 ? 's' : ''} · {r.isAllSites ? 'All Branches' : 'Branch-restricted'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(r); setModal('edit') }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(r.id, r.name)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {granted.length ? granted.map((p: any) => (
                    <span key={p.module} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {MODULE_LABELS[p.module] || p.module}
                    </span>
                  )) : <span className="text-xs text-slate-300">No page access granted yet</span>}
                </div>
              </div>
            )
          })}
          {!roles.length && (
            <div className="col-span-2 card text-center py-16 text-slate-400">
              No custom roles yet — create one to control what non-admin users can access
            </div>
          )}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Add New Role" wide onClose={() => setModal(null)}>
          <RoleForm onSave={handleCreate} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editing && (
        <Modal title={`Edit — ${editing.name}`} wide onClose={() => setModal(null)}>
          <RoleForm initial={editing} onSave={handleUpdate} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [tab, setTab] = React.useState<'users' | 'roles'>('users')
  const [roles, setRoles] = React.useState<any[]>([])
  const [sites, setSites] = React.useState<any[]>([])

  function loadRoles() { fetchRoles().then(setRoles).catch(() => {}) }
  React.useEffect(() => {
    loadRoles()
    fetchSites().then(setSites).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage user accounts and the roles that control their access</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}>
          <UsersIcon size={15} /> Users
        </button>
        <button onClick={() => setTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}>
          <ShieldCheck size={15} /> Roles
        </button>
      </div>

      {tab === 'users' ? <UsersTab roles={roles} sites={sites} /> : <RolesTab onRolesChanged={loadRoles} />}
    </div>
  )
}
