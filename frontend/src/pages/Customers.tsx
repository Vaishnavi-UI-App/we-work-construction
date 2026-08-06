import React from 'react'
import { fetchCustomers, deleteCustomer } from '../api'
import { Plus, Trash2, Pencil, User, Phone, MapPin, Mail, Globe, ShieldCheck, LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'
import CreateCustomer from './CreateCustomer'

export default function Customers() {
  const [customers, setCustomers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [view, setView] = React.useState<'grid' | 'list'>('grid')

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

  if (showCreate || editing) {
    return (
      <CreateCustomer
        initial={editing}
        onDone={() => { setShowCreate(false); setEditing(null); load() }}
        onBack={() => { setShowCreate(false); setEditing(null) }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} registered client{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView('grid')} title="Grid view"
              className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')} title="List view"
              className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <List size={16} />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !customers.length ? (
        <div className="card text-center py-16 text-slate-400">
          No customers yet. Add your first client!
        </div>
      ) : view === 'grid' ? (
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
                    <p className="text-xs text-slate-400">Customer {c.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => setEditing(c)} className="text-slate-300 hover:text-blue-500">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
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
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Added</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600">{c.email || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate">{c.address || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600">{c.gst || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600">{c.state || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setEditing(c)} className="text-slate-400 hover:text-blue-500 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
