import React from 'react'
import { createCustomer } from '../api'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateCustomer({ onDone, onBack }: { onDone?: () => void; onBack?: () => void }) {
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [gst, setGst] = React.useState('')
  const [state, setState] = React.useState('Maharashtra')
  const [stateCode, setStateCode] = React.useState('27')
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    try {
      await createCustomer({ name, phone, email, website, address, gst, state, stateCode })
      toast.success('Customer created!')
      onDone?.()
    } catch { toast.error('Failed to create customer') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Add Customer</h1>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" />
          </div>
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.example.com" />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input resize-none" rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">GSTIN No</label>
            <input className="input" value={gst} onChange={e => setGst(e.target.value)} placeholder="27AAACB4487D1ZS" />
          </div>
          <div>
            <label className="label">State Code</label>
            <input className="input" value={stateCode} onChange={e => setStateCode(e.target.value)} placeholder="27" />
          </div>
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={state} onChange={e => setState(e.target.value)} placeholder="Maharashtra" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
          <button type="button" onClick={onBack} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
