import React from 'react'
import { createVendor, updateVendor } from '../api'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateVendor({ initial, onDone, onBack }: { initial?: any; onDone?: () => void; onBack?: () => void }) {
  const [name, setName] = React.useState(initial?.name || '')
  const [agencyCode, setAgencyCode] = React.useState(initial?.agencyCode || '')
  const [phone, setPhone] = React.useState(initial?.phone || '')
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    try {
      if (initial) {
        await updateVendor(initial.id, { name, agencyCode, phone })
        toast.success('Vendor updated!')
      } else {
        await createVendor({ name, agencyCode, phone })
        toast.success('Vendor created!')
      }
      onDone?.()
    } catch { toast.error(initial ? 'Failed to update vendor' : 'Failed to create vendor') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{initial ? 'Edit Vendor' : 'Add Vendor'}</h1>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">Vendor Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Vendor company name" required />
        </div>
        <div>
          <label className="label">Agency Code</label>
          <input className="input" value={agencyCode} onChange={e => setAgencyCode(e.target.value)} placeholder="e.g. AGN-001" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Saving...' : (initial ? 'Save Changes' : 'Save Vendor')}
          </button>
          <button type="button" onClick={onBack} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
