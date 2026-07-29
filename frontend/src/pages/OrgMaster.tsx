import React from 'react'
import { fetchOrgProfile, updateOrgProfile, fetchOrgDocuments, uploadOrgDocument, deleteOrgDocument } from '../api'
import {
  Building, Pencil, Save, X, Upload, Trash2, FileText, FileImage,
  FileBadge, Phone, Mail, Globe, MapPin, Hash, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const DOC_TYPES = ['Registration', 'GST Certificate', 'PAN Card', 'License', 'Insurance', 'Contract', 'Agreement', 'Other']

const DOC_ICON: Record<string, any> = {
  'Registration': FileBadge,
  'GST Certificate': FileText,
  'PAN Card': FileText,
  'License': FileBadge,
  'Insurance': FileText,
  'Contract': FileText,
  'Agreement': FileText,
  'Other': FileText,
}

const DOC_COLOR: Record<string, string> = {
  'Registration':   'bg-blue-100 text-blue-700',
  'GST Certificate':'bg-emerald-100 text-emerald-700',
  'PAN Card':       'bg-purple-100 text-purple-700',
  'License':        'bg-amber-100 text-amber-700',
  'Insurance':      'bg-rose-100 text-rose-700',
  'Contract':       'bg-slate-100 text-slate-700',
  'Agreement':      'bg-indigo-100 text-indigo-700',
  'Other':          'bg-gray-100 text-gray-600',
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}

// ── Profile Section ───────────────────────────────────────────────────────────
function ProfileSection() {
  const [profile, setProfile]   = React.useState<any>(null)
  const [editing, setEditing]   = React.useState(false)
  const [form,    setForm]      = React.useState<any>({})
  const [loading, setLoading]   = React.useState(true)
  const [saving,  setSaving]    = React.useState(false)

  function load() {
    fetchOrgProfile()
      .then(d => { setProfile(d); setForm(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  function set(k: string, v: string) { setForm((p: any) => ({ ...p, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateOrgProfile(form)
      setProfile(updated)
      setEditing(false)
      toast.success('Company profile saved!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  if (editing) return (
    <form onSubmit={save} className="card space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-slate-800">Edit Company Profile</h2>
        <button type="button" onClick={() => { setEditing(false); setForm(profile) }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Company Name</label>
          <input className="input" value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} placeholder="We Work Constructions Pvt. Ltd." />
        </div>
        <div className="md:col-span-2">
          <label className="label">Tagline / Description</label>
          <input className="input" value={form.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="Building Tomorrow, Today" />
        </div>
        <div>
          <label className="label">Registration Number</label>
          <input className="input" value={form.regNumber || ''} onChange={e => set('regNumber', e.target.value)} placeholder="CIN / Company Reg No." />
        </div>
        <div>
          <label className="label">GST Number</label>
          <input className="input" value={form.gstNumber || ''} onChange={e => set('gstNumber', e.target.value)} placeholder="27XXXXX0000X1ZX" />
        </div>
        <div>
          <label className="label">PAN Number</label>
          <input className="input" value={form.panNumber || ''} onChange={e => set('panNumber', e.target.value)} placeholder="AAAAA0000A" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="info@wework.com" />
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://wework.com" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Address</label>
          <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Street / Building / Plot No." />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={form.state || ''} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" />
        </div>
        <div>
          <label className="label">Pincode</label>
          <input className="input" value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} placeholder="400001" />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        <button type="button" onClick={() => { setEditing(false); setForm(profile) }} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )

  const hasData = profile?.companyName

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Building size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{profile?.companyName || 'Company Name Not Set'}</h2>
            {profile?.tagline && <p className="text-slate-500 text-sm mt-0.5">{profile.tagline}</p>}
            {hasData && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1"><CheckCircle size={11} /> Profile complete</span>}
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 shrink-0">
          <Pencil size={14} /> Edit
        </button>
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-slate-400">
          <Building size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No company information added yet.</p>
          <button onClick={() => setEditing(true)} className="btn-primary mt-4 text-xs px-4 py-2">Add Company Info</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity</p>
            <Field label="Registration No." value={profile?.regNumber} />
            <Field label="GST Number" value={profile?.gstNumber} />
            <Field label="PAN Number" value={profile?.panNumber} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</p>
            {profile?.phone   && <div className="flex items-center gap-2 text-sm text-slate-700"><Phone size={14} className="text-slate-400" />{profile.phone}</div>}
            {profile?.email   && <div className="flex items-center gap-2 text-sm text-slate-700"><Mail size={14} className="text-slate-400" />{profile.email}</div>}
            {profile?.website && <div className="flex items-center gap-2 text-sm text-blue-600"><Globe size={14} className="text-slate-400" />{profile.website}</div>}
          </div>
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</p>
            {(profile?.address || profile?.city) && (
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{[profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Documents Section ─────────────────────────────────────────────────────────
function DocumentsSection() {
  const [docs,    setDocs]    = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [name,    setName]    = React.useState('')
  const [docType, setDocType] = React.useState('Registration')
  const [file,    setFile]    = React.useState<File | null>(null)

  function load() {
    fetchOrgDocuments()
      .then(d => { setDocs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !name.trim()) { toast.error('Name and file are required'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('docType', docType)
      fd.append('file', file)
      await uploadOrgDocument(fd)
      toast.success('Document uploaded!')
      setName(''); setDocType('Registration'); setFile(null)
      load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await deleteOrgDocument(id)
      toast.success('Document deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-4">Upload Document</h2>
        <form onSubmit={upload} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label">Document Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. GST Certificate 2024" required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File</label>
            <label className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-sm ${file ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 text-slate-500'}`}>
              <Upload size={14} className="shrink-0" />
              <span className="truncate">{file ? file.name : 'Choose file'}</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setFile(e.target.files?.[0] || null)} required />
            </label>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
              {uploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={15} />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>

      {/* Document list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Document Vault</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">{docs.length} files</span>
        </div>

        {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && !docs.length && (
          <div className="text-center py-16 text-slate-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="divide-y divide-slate-50">
            {docs.map((doc: any) => {
              const Icon = DOC_ICON[doc.docType] || FileText
              return (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${DOC_COLOR[doc.docType] || 'bg-gray-100 text-gray-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOC_COLOR[doc.docType] || 'bg-gray-100 text-gray-600'}`}>{doc.docType}</span>
                      <span className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <a href={`http://localhost:4001${doc.fileUrl}`} target="_blank" rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View / Download">
                      <FileImage size={15} />
                    </a>
                    <button onClick={() => remove(doc.id, doc.name)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgMaster() {
  const [tab, setTab] = React.useState<'profile' | 'documents'>('profile')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Organisation Master</h1>
        <p className="text-slate-500 text-sm mt-1">Company profile & important document vault</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['profile', 'documents'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'profile' ? 'Company Profile' : 'Document Vault'}
          </button>
        ))}
      </div>

      {tab === 'profile'    && <ProfileSection />}
      {tab === 'documents'  && <DocumentsSection />}
    </div>
  )
}
