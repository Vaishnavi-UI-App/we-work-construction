import React from 'react'
import toast from 'react-hot-toast'
import {
  fetchSiteHistory, fetchExpenseCategories, fetchOrderedByPeople,
  updateTrackedExpense, deleteTrackedExpense, deleteTrackedFund,
} from '../api'
import { X, ArrowDownCircle, ArrowUpCircle, CheckCircle, Image, User, Pencil, Trash2 } from 'lucide-react'

const FUND_TYPE_STYLE: Record<string, string> = {
  COMPANY:  'bg-blue-100 text-blue-700',
  PERSONAL: 'bg-rose-100 text-rose-700',
  SPLIT:    'bg-amber-100 text-amber-700',
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// ── Edit Expense Modal ──────────────────────────────────────────────────────────
function EditExpenseModal({ tx, onClose, onSaved }: { tx: any; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = React.useState(tx.category || '')
  const [date,      setDate]    = React.useState(tx.date ? new Date(tx.date).toISOString().slice(0, 10) : todayStr())
  const [amount,   setAmount]   = React.useState(String(tx.amount ?? ''))
  const [notes,    setNotes]    = React.useState(tx.notes || '')
  const [orderedBy, setOrderedBy] = React.useState(tx.orderedBy || '')
  const [receipt,  setReceipt]  = React.useState<File | null>(null)
  const [categories, setCategories] = React.useState<any[]>([])
  const [people, setPeople] = React.useState<any[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetchExpenseCategories().then(setCategories).catch(() => {})
    fetchOrderedByPeople().then(setPeople).catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('category', category)
      fd.append('date', date)
      fd.append('amount', amount)
      fd.append('notes', notes)
      if (orderedBy) fd.append('orderedBy', orderedBy)
      if (receipt) fd.append('receipt', receipt)
      await updateTrackedExpense(tx.id, fd)
      toast.success('Expense updated')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update expense')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">Edit Expense</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {!categories.some((c: any) => c.name === category) && category && <option value={category}>{category}</option>}
                {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Amount (₹)</label>
            <input className="input" type="number" min={1} step={0.01} value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Expense description (optional)" />
          </div>
          <div>
            <label className="label">Ordered By</label>
            <select className="input" value={orderedBy} onChange={e => setOrderedBy(e.target.value)}>
              <option value="">Select person (optional)</option>
              {!people.some((p: any) => p.name === orderedBy) && orderedBy && <option value={orderedBy}>{orderedBy}</option>}
              {people.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Replace Receipt (optional)</label>
            <label className="flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer border-slate-200 hover:border-blue-300 hover:bg-slate-50">
              <span className="text-sm text-slate-500 truncate">{receipt ? receipt.name : (tx.receiptUrl ? 'Keep existing receipt' : 'Attach a receipt')}</span>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setReceipt(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Full fund + expense timeline for one site — used from both the Expense
// Tracker's per-site "History" button and the Dashboard's clickable site cards.
export default function SiteHistoryDrawer({ site, onClose, onChanged }: { site: any; onClose: () => void; onChanged?: () => void }) {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [editingTx, setEditingTx] = React.useState<any>(null)

  function load() {
    setLoading(true)
    fetchSiteHistory(site.id)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(load, [site.id])

  async function remove(tx: any) {
    if (!confirm('Delete this expense? This reverses its effect on the site wallet.')) return
    try {
      await deleteTrackedExpense(tx.id)
      toast.success('Expense deleted')
      load()
      onChanged?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to delete expense')
    }
  }

  async function removeFund(tx: any) {
    if (!confirm('Delete this company fund entry? This reverses its effect on the site wallet.')) return
    try {
      await deleteTrackedFund(tx.id)
      toast.success('Fund entry deleted')
      load()
      onChanged?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to delete fund entry')
    }
  }

  const w = data?.wallet || {}

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{site.name} — Transaction History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{data?.timeline?.length || 0} entries</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {!loading && data && (
          <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs text-slate-400">Company Balance</p>
              <p className="font-bold text-blue-600">{fmt(w.companyBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Received</p>
              <p className="font-bold text-slate-700">{fmt(w.totalFundsReceived)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Company Spent</p>
              <p className="font-bold text-emerald-600">{fmt(w.totalCompanySpent)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Manager Pending</p>
              <p className="font-bold text-rose-600">{fmt((w.totalPersonalSpent || 0) - (w.totalPersonalReimbursed || 0))}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading && <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

          {!loading && data?.timeline?.map((tx: any, i: number) => (
            <div key={i} className={`flex gap-4 p-4 rounded-xl border ${tx.txType === 'FUND' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.txType === 'FUND' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                {tx.txType === 'FUND'
                  ? <ArrowDownCircle size={18} className="text-emerald-600" />
                  : <ArrowUpCircle size={18} className="text-rose-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {tx.txType === 'FUND' ? 'Company Fund Added' : tx.category}
                    </p>
                    {tx.txType === 'EXPENSE' && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${FUND_TYPE_STYLE[tx.fundType] || ''}`}>
                        {tx.fundType === 'COMPANY' ? 'Company' : tx.fundType === 'PERSONAL' ? 'Personal' : 'Split'}
                      </span>
                    )}
                    {tx.txType === 'EXPENSE' && tx.orderedBy && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><User size={11} /> Ordered by {tx.orderedBy}</p>
                    )}
                    {tx.notes && <p className="text-xs text-slate-400 mt-1 truncate">{tx.notes}</p>}
                    {tx.txType === 'EXPENSE' && tx.fundType === 'SPLIT' && (
                      <p className="text-xs text-slate-500 mt-1">
                        Co: {fmt(tx.companyPaid)} + Personal: {fmt(tx.personalPaid)}
                      </p>
                    )}
                    {tx.receiptUrl && (
                      <a href={`http://localhost:4001${tx.receiptUrl}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1">
                        <Image size={11} /> View Receipt
                      </a>
                    )}
                    {tx.txType === 'FUND' && tx.reimbursedAmount > 0 && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={11} /> {fmt(tx.reimbursedAmount)} reimbursed to manager
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <p className={`font-bold text-sm ${tx.txType === 'FUND' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.txType === 'FUND' ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString('en-IN')}</p>
                    {tx.txType === 'EXPENSE' && (
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => setEditingTx(tx)} title="Edit expense" className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(tx)} title="Delete expense" className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {tx.txType === 'FUND' && (
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => removeFund(tx)} title="Delete fund entry" className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!loading && !data?.timeline?.length && (
            <div className="text-center text-slate-400 py-16">No transactions yet for this site.</div>
          )}
        </div>
      </div>

      {editingTx && (
        <EditExpenseModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); load(); onChanged?.() }}
        />
      )}
    </div>
  )
}
