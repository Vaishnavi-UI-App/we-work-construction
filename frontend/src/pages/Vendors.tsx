import React from 'react'
import { fetchVendors, deleteVendor } from '../api'
import { Plus, Trash2, Truck, Phone, LayoutGrid, List, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import CreateVendor from './CreateVendor'

export default function Vendors() {
  const [vendors, setVendors] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [view, setView] = React.useState<'grid' | 'list'>('grid')

  function load() {
    setLoading(true)
    fetchVendors().then(d => { setVendors(d); setLoading(false) }).catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  async function remove(id: number) {
    if (!confirm('Delete this vendor?')) return
    try { await deleteVendor(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  if (showCreate) return <CreateVendor onDone={() => { setShowCreate(false); load() }} onBack={() => setShowCreate(false)} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendors</h1>
          <p className="text-slate-500 text-sm mt-1">{vendors.length} registered vendor{vendors.length !== 1 ? 's' : ''}</p>
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
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !vendors.length ? (
        <div className="card text-center py-16 text-slate-400">
          No vendors yet. Add your first vendor!
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v: any) => (
            <div key={v.id} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Truck size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-400">Vendor {v.id}</p>
                  </div>
                </div>
                <button onClick={() => remove(v.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-4 space-y-1.5">
                {v.agencyCode && <p className="text-sm text-slate-500 flex items-center gap-2"><Briefcase size={13} />Agency: {v.agencyCode}</p>}
                {v.phone && <p className="text-sm text-slate-500 flex items-center gap-2"><Phone size={13} />{v.phone}</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
                Added {new Date(v.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Agency Code</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Added</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v: any) => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                    <td className="py-3 px-4 font-semibold text-slate-800">{v.name}</td>
                    <td className="py-3 px-4 text-slate-600">{v.agencyCode || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-600">{v.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{new Date(v.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => remove(v.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
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
