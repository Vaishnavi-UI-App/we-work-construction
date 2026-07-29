import React from 'react'
import {
  fetchWallets, addFund, addTrackedExpense, createSite, fetchOrderedByPeople, addOrderedByPerson,
  fetchExpenseCategories, addExpenseCategory,
} from '../api'
import {
  Building2, Plus, TrendingDown, Wallet, User, ArrowDownCircle,
  X, History, RefreshCw, Paperclip, MapPin, UserPlus, FolderPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getUser } from '../auth'
import SiteHistoryDrawer from '../components/SiteHistoryDrawer'

const todayStr = () => new Date().toISOString().slice(0, 10)

const FUND_TYPE_STYLE: Record<string, string> = {
  COMPANY:  'bg-blue-100 text-blue-700',
  PERSONAL: 'bg-rose-100 text-rose-700',
  SPLIT:    'bg-amber-100 text-amber-700',
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Add Fund Modal ─────────────────────────────────────────────────────────────
function AddFundModal({ sites, onClose, onDone }: { sites: any[]; onClose: () => void; onDone: () => void }) {
  const [siteId, setSiteId] = React.useState(sites[0]?.id || '')
  const [amount, setAmount] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setLoading(true)
    try {
      const res = await addFund({ siteId: Number(siteId), amount: Number(amount), notes })
      const s = res.summary
      if (s.reimbursedToManager > 0) {
        toast.success(`${fmt(s.addedToCompanyBalance)} added to company balance. ${fmt(s.reimbursedToManager)} reimbursed to manager!`, { duration: 5000 })
      } else {
        toast.success(`${fmt(s.addedToCompanyBalance)} added to company balance`)
      }
      onDone()
    } catch { toast.error('Failed to add funds') }
    finally { setLoading(false) }
  }

  return (
    <Modal title="Add Company Funds" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Site</label>
          <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount (₹)</label>
          <input className="input" type="number" min={1} step={0.01} value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="e.g. 50000" required />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fund purpose (optional)" />
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
          If manager has pending personal expenses, this money will <strong>automatically reimburse</strong> them first, then the remainder goes to company balance.
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Adding...' : 'Add Funds'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Add Site Modal ─────────────────────────────────────────────────────────────
function AddSiteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter a site name'); return }
    setLoading(true)
    try {
      await createSite(name.trim())
      toast.success(`Site "${name.trim()}" created!`)
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to create site')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Add New Site" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Site Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Nagpur Phase 1" autoFocus required />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creating...' : 'Create Site'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Add Expense Modal ──────────────────────────────────────────────────────────
function AddExpenseModal({ sites, onClose, onDone }: { sites: any[]; onClose: () => void; onDone: () => void }) {
  const [siteId,   setSiteId]   = React.useState(sites[0]?.id || '')
  const [category, setCategory] = React.useState('')
  const [date,      setDate]    = React.useState(todayStr())
  const [amount,   setAmount]   = React.useState('')
  const [notes,    setNotes]    = React.useState('')
  const [receipt,  setReceipt]  = React.useState<File | null>(null)
  const [preview,  setPreview]  = React.useState<string | null>(null)
  const [loading,  setLoading]  = React.useState(false)

  const [orderedBy, setOrderedBy] = React.useState('')
  const [people, setPeople] = React.useState<any[]>([])
  const [showAddPerson, setShowAddPerson] = React.useState(false)
  const [newPersonName, setNewPersonName] = React.useState('')
  const [addingPerson, setAddingPerson] = React.useState(false)

  const [categories, setCategories] = React.useState<any[]>([])
  const [showAddCategory, setShowAddCategory] = React.useState(false)
  const [newCategoryName, setNewCategoryName] = React.useState('')
  const [addingCategory, setAddingCategory] = React.useState(false)

  React.useEffect(() => {
    fetchOrderedByPeople().then(setPeople).catch(() => {})
    fetchExpenseCategories().then(cats => {
      setCategories(cats)
      if (cats.length && !category) setCategory(cats[0].name)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    setAddingCategory(true)
    try {
      const cat = await addExpenseCategory(name)
      setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
      setCategory(cat.name)
      setNewCategoryName('')
      setShowAddCategory(false)
      toast.success(`"${cat.name}" added`)
    } catch {
      toast.error('Failed to add category')
    } finally {
      setAddingCategory(false)
    }
  }

  const selectedSite   = sites.find(s => s.id === Number(siteId))
  const companyBalance = selectedSite?.wallet?.companyBalance || 0
  const willUseCompany = Math.min(companyBalance, Number(amount) || 0)
  const willUsePersonal = Math.max(0, (Number(amount) || 0) - companyBalance)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setReceipt(f)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  async function handleAddPerson() {
    const name = newPersonName.trim()
    if (!name) return
    setAddingPerson(true)
    try {
      const person = await addOrderedByPerson(name)
      setPeople(prev => prev.some(p => p.id === person.id) ? prev : [...prev, person].sort((a, b) => a.name.localeCompare(b.name)))
      setOrderedBy(person.name)
      setNewPersonName('')
      setShowAddPerson(false)
      toast.success(`"${person.name}" added`)
    } catch {
      toast.error('Failed to add person')
    } finally {
      setAddingPerson(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('siteId',   String(siteId))
      fd.append('category', category)
      fd.append('date',     date)
      fd.append('amount',   amount)
      fd.append('notes',    notes)
      if (orderedBy) fd.append('orderedBy', orderedBy)
      if (receipt) fd.append('receipt', receipt)
      const res = await addTrackedExpense(fd)
      const exp = res.expense
      if (exp.fundType === 'PERSONAL') {
        toast.success(`${fmt(exp.amount)} added as personal expense (company balance was empty)`, { duration: 5000 })
      } else if (exp.fundType === 'SPLIT') {
        toast.success(`Split: ${fmt(exp.companyPaid)} company + ${fmt(exp.personalPaid)} personal`, { duration: 5000 })
      } else {
        toast.success(`${fmt(exp.amount)} deducted from company balance`)
      }
      onDone()
    } catch { toast.error('Failed to add expense') }
    finally { setLoading(false) }
  }

  return (
    <Modal title="Add Expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Site</label>
            <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)}>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Category</label>
            <button type="button" onClick={() => setShowAddCategory(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <FolderPlus size={12} /> New Category
            </button>
          </div>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {!categories.length && <option value="">No categories yet</option>}
            {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {showAddCategory && (
            <div className="flex gap-2 mt-2">
              <input className="input flex-1" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }} />
              <button type="button" onClick={handleAddCategory} disabled={addingCategory || !newCategoryName.trim()}
                className="btn-primary px-4 text-sm whitespace-nowrap disabled:opacity-50">
                {addingCategory ? '...' : 'Add'}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label">Amount (₹)</label>
          <input className="input" type="number" min={1} step={0.01} value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Expense description (optional)" />
        </div>
        {/* Ordered By */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Ordered By</label>
            <button type="button" onClick={() => setShowAddPerson(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <UserPlus size={12} /> New Person
            </button>
          </div>
          <select className="input" value={orderedBy} onChange={e => setOrderedBy(e.target.value)}>
            <option value="">Select person (optional)</option>
            {people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          {showAddPerson && (
            <div className="flex gap-2 mt-2">
              <input className="input flex-1" value={newPersonName} onChange={e => setNewPersonName(e.target.value)}
                placeholder="Enter new person's name" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPerson() } }} />
              <button type="button" onClick={handleAddPerson} disabled={addingPerson || !newPersonName.trim()}
                className="btn-primary px-4 text-sm whitespace-nowrap disabled:opacity-50">
                {addingPerson ? '...' : 'Add'}
              </button>
            </div>
          )}
        </div>
        {/* Bill upload */}
        <div>
          <label className="label">Upload Bill / Receipt (optional)</label>
          <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${receipt ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
            <Paperclip size={16} className="text-slate-400 shrink-0" />
            <span className="text-sm text-slate-500 truncate">{receipt ? receipt.name : 'Click to attach bill photo or PDF'}</span>
            <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
          </label>
          {preview && (
            <div className="mt-2 relative inline-block">
              <img src={preview} alt="receipt" className="h-24 rounded-lg object-cover border border-slate-200" />
              <button type="button" onClick={() => { setReceipt(null); setPreview(null) }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Live preview */}
        {Number(amount) > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
            <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-2">Payment Preview</p>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-blue-600"><Wallet size={13} /> Company pays</span>
              <span className="font-bold text-blue-700">{fmt(willUseCompany)}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-rose-600"><User size={13} /> Manager pays (personal)</span>
              <span className={`font-bold ${willUsePersonal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(willUsePersonal)}</span>
            </div>
            {willUsePersonal > 0 && (
              <p className="text-xs text-rose-500 pt-1">Company balance is {fmt(companyBalance)}. Manager will pay the rest from personal funds and get reimbursed when company adds money.</p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Saving...' : 'Add Expense'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Site Wallet Card ───────────────────────────────────────────────────────────
function SiteCard({ site, onViewHistory }: { site: any; onViewHistory: () => void }) {
  const w = site.wallet || {}
  const pendingReimbursement = (w.totalPersonalSpent || 0) - (w.totalPersonalReimbursed || 0)
  const totalSpent = (w.totalCompanySpent || 0) + (w.totalPersonalSpent || 0)

  const companyUsedPct = w.totalFundsReceived > 0
    ? Math.min(100, Math.round((w.totalCompanySpent || 0) / w.totalFundsReceived * 100))
    : 0

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800">{site.name}</p>
            <p className="text-xs text-slate-400">{site.expenses?.length || 0} expenses</p>
          </div>
        </div>
        <button onClick={onViewHistory} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-medium">
          <History size={13} /> History
        </button>
      </div>

      {/* Balance bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Company spent vs received</span>
          <span>{companyUsedPct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${companyUsedPct}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-blue-500 font-medium mb-0.5 flex items-center gap-1"><Wallet size={11} /> Company Balance</p>
          <p className="font-bold text-blue-700 text-lg">{fmt(w.companyBalance)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 font-medium mb-0.5">Total Received</p>
          <p className="font-bold text-slate-700 text-lg">{fmt(w.totalFundsReceived)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-medium mb-0.5 flex items-center gap-1"><TrendingDown size={11} /> Company Spent</p>
          <p className="font-bold text-emerald-700">{fmt(w.totalCompanySpent)}</p>
        </div>
        <div className={`rounded-xl p-3 ${pendingReimbursement > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium mb-0.5 flex items-center gap-1 ${pendingReimbursement > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            <User size={11} /> Manager Pending
          </p>
          <p className={`font-bold ${pendingReimbursement > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {fmt(pendingReimbursement)}
          </p>
        </div>
      </div>

      {/* Pending reimbursement alert */}
      {pendingReimbursement > 0 && (
        <div className="mt-3 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-rose-600">
          <RefreshCw size={12} />
          Manager is owed <strong className="mx-1">{fmt(pendingReimbursement)}</strong> — will auto-reimburse on next fund
        </div>
      )}

      {/* Recent expenses */}
      {site.expenses?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent Expenses</p>
          <div className="space-y-1.5">
            {site.expenses.slice(0, 3).map((ex: any) => (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ex.fundType === 'PERSONAL' ? 'bg-rose-400' : ex.fundType === 'SPLIT' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <span className="text-slate-600">{ex.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${FUND_TYPE_STYLE[ex.fundType] || 'bg-slate-100 text-slate-500'}`}>
                    {ex.fundType}
                  </span>
                </div>
                <span className="font-medium text-slate-700">{fmt(ex.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ExpenseTracker() {
  const [sites, setSites] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showFund, setShowFund] = React.useState(false)
  const [showExpense, setShowExpense] = React.useState(false)
  const [showSite, setShowSite] = React.useState(false)
  const [historySite, setHistorySite] = React.useState<any>(null)
  const currentUser = getUser()
  const isAdmin = !!currentUser?.isAdmin
  const canManage = isAdmin || !!currentUser?.permissions?.tracker?.canAdd

  function load() {
    setLoading(true)
    fetchWallets()
      .then(d => { setSites(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  // Global totals
  const totalCompanyBalance = sites.reduce((s, site) => s + (site.wallet?.companyBalance || 0), 0)
  const totalCompanySpent   = sites.reduce((s, site) => s + (site.wallet?.totalCompanySpent || 0), 0)
  const totalPersonalSpent  = sites.reduce((s, site) => s + (site.wallet?.totalPersonalSpent || 0), 0)
  const totalReimbursed     = sites.reduce((s, site) => s + (site.wallet?.totalPersonalReimbursed || 0), 0)
  const totalPending        = totalPersonalSpent - totalReimbursed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expense Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Site-wise company & personal fund management</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {isAdmin && (
            <button onClick={() => setShowSite(true)} className="btn-secondary flex items-center gap-2">
              <MapPin size={16} /> Add Site
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowFund(true)} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              <ArrowDownCircle size={16} /> Add Company Funds
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowExpense(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Global summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Company Balance</p>
              <p className="text-xl font-bold text-blue-600">{fmt(totalCompanyBalance)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Company Spent</p>
              <p className="text-xl font-bold text-slate-700">{fmt(totalCompanySpent)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <User size={18} className="text-rose-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Manager Personal Spent</p>
              <p className="text-xl font-bold text-rose-600">{fmt(totalPersonalSpent)}</p>
            </div>
          </div>
        </div>
        <div className={`card ${totalPending > 0 ? 'border-amber-200 bg-amber-50/50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalPending > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <RefreshCw size={18} className={totalPending > 0 ? 'text-amber-600' : 'text-emerald-600'} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">Pending Reimbursement</p>
              <p className={`text-xl font-bold ${totalPending > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <p className="font-bold text-sm mb-3">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">1</div>
            <p className="text-blue-100">Company adds funds → goes to site balance for manager to spend</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">2</div>
            <p className="text-blue-100">Manager adds expense → deducted from company balance first. When balance = 0, recorded as personal</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">3</div>
            <p className="text-blue-100">Next company fund → automatically reimburses manager's personal amount first, then tops up balance</p>
          </div>
        </div>
      </div>

      {/* Site cards */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sites.map(site => (
            <SiteCard
              key={site.id}
              site={site}
              onViewHistory={() => setHistorySite(site)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showSite    && <AddSiteModal                  onClose={() => setShowSite(false)}    onDone={() => { setShowSite(false);    load() }} />}
      {showFund    && <AddFundModal    sites={sites} onClose={() => setShowFund(false)}    onDone={() => { setShowFund(false);    load() }} />}
      {showExpense && <AddExpenseModal sites={sites} onClose={() => setShowExpense(false)} onDone={() => { setShowExpense(false); load() }} />}
      {historySite && <SiteHistoryDrawer site={historySite} onClose={() => setHistorySite(null)} />}
    </div>
  )
}
