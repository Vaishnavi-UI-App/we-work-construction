import React from 'react'
import { fetchCustomers, deleteCustomer } from '../api'
import { Plus, Trash2, User, Phone, MapPin, Mail, Globe, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import CreateCustomer from './CreateCustomer'

export default function Customers() {
  const [customers, setCustomers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)

  function load() {
    setLoading(true)
    fetchCustomers().then(d => { setCustomers(d); setLoading(false) }).catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  async function remove(id: number) {
    if (!confirm('Delete this customer?')) return
    try { await deleteCustomer(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  if (showCreate) return <CreateCustomer onDone={() => { setShowCreate(false); load() }} onBack={() => setShowCreate(false)} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} registered client{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c: any) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">Customer #{c.id}</p>
                  </div>
                </div>
                <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-4 space-y-1.5">
                {c.phone && <p className="text-sm text-slate-500 flex items-center gap-2"><Phone size={13} />{c.phone}</p>}
                {c.email && <p className="text-sm text-slate-500 flex items-center gap-2"><Mail size={13} />{c.email}</p>}
                {c.website && <p className="text-sm text-slate-500 flex items-center gap-2"><Globe size={13} />{c.website}</p>}
                {c.address && <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin size={13} />{c.address}</p>}
                {c.gst && (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <ShieldCheck size={13} />{c.gst}{c.stateCode ? ` (State Code: ${c.stateCode})` : ''}
                  </p>
                )}
                {c.state && <p className="text-xs text-slate-400 pl-5">{c.state}</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
                Added {new Date(c.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
          {!customers.length && (
            <div className="col-span-3 card text-center py-16 text-slate-400">
              No customers yet. Add your first client!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
