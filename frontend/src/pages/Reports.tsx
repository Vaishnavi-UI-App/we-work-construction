import React from 'react'
import { fetchReports, fetchExpenses, fetchWallets, downloadBranchReport, downloadOrderedByReport, downloadManagerReport } from '../api'
import { TrendingDown, Wallet, Building2, User, BarChart3, ArrowUpRight, Search, Download, UserSearch, X } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const CATEGORY_COLOR: Record<string, string> = {
  Materials: 'bg-amber-100 text-amber-700 border-amber-200',
  Labour:    'bg-blue-100 text-blue-700 border-blue-200',
  Labor:     'bg-blue-100 text-blue-700 border-blue-200',
  Travel:    'bg-purple-100 text-purple-700 border-purple-200',
  Equipment: 'bg-rose-100 text-rose-700 border-rose-200',
  Office:    'bg-slate-100 text-slate-600 border-slate-200',
  Food:      'bg-green-100 text-green-700 border-green-200',
  Misc:      'bg-gray-100 text-gray-600 border-gray-200',
}

const FUND_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  COMPANY:  { bg: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500',   label: 'Company'  },
  PERSONAL: { bg: 'bg-rose-50 text-rose-700 border-rose-200',   dot: 'bg-rose-500',   label: 'Personal' },
  SPLIT:    { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400',  label: 'Split'    },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer-skeleton rounded-xl ${className}`} />
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, gradient, delay, onClick }: any) {
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onClick() } : undefined}
      className={`relative overflow-hidden rounded-2xl p-5 text-white stat-card-hover animate-fade-up ${delay} ${gradient} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
      <div className="absolute -right-5 -top-5 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute right-2 -bottom-4 w-14 h-14 bg-white/10 rounded-full" />
      <div className="relative z-10">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">{icon}</div>
        <p className="text-white/70 text-xs font-medium">{label}</p>
        <p className="text-2xl font-extrabold mt-0.5 tracking-tight">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1 flex items-center gap-1"><ArrowUpRight size={10} />{sub}</p>}
      </div>
    </div>
  )
}

// ── Site wallet card ──────────────────────────────────────────────────────────
function SiteWalletCard({ site, index, onClick }: { site: any; index: number; onClick?: () => void }) {
  const w = site.wallet || {}
  const pending = (w.totalPersonalSpent || 0) - (w.totalPersonalReimbursed || 0)
  const pct = w.totalFundsReceived > 0 ? Math.min(100, ((w.totalCompanySpent || 0) / w.totalFundsReceived) * 100) : 0

  const palettes = [
    { border: 'border-t-blue-500',   icon: 'bg-blue-600',   bar: '#3b82f6' },
    { border: 'border-t-emerald-500', icon: 'bg-emerald-600', bar: '#10b981' },
    { border: 'border-t-amber-500',  icon: 'bg-amber-500',  bar: '#f59e0b' },
    { border: 'border-t-violet-500', icon: 'bg-violet-600', bar: '#7c3aed' },
  ]
  const p = palettes[index % palettes.length]
  const delays = ['animate-delay-1','animate-delay-2','animate-delay-3','animate-delay-4']

  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onClick() } : undefined}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-t-4 ${p.border} p-5 hover:shadow-lg transition-all duration-300 animate-fade-up ${delays[index] || ''} ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${p.icon} rounded-xl flex items-center justify-center`}>
          <Building2 size={17} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800">{site.name}</p>
          <p className="text-xs text-slate-400">{site.expenses?.length || 0} transactions</p>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">Balance</span>
          <span className="font-bold text-lg" style={{ color: p.bar }}>{fmt(w.companyBalance)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">Company spent</span>
          <span className="font-semibold text-slate-700">{fmt(w.totalCompanySpent)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-xs">Manager spent</span>
          <span className="font-semibold text-rose-500">{fmt(w.totalPersonalSpent)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Budget used</span><span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full progress-bar" style={{ backgroundColor: p.bar, width: `${pct}%` }} />
        </div>
      </div>

      {pending > 0 && (
        <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <span className="text-amber-600 text-xs font-semibold">Pending reimburse</span>
          <span className="font-bold text-amber-600">{fmt(pending)}</span>
        </div>
      )}
    </div>
  )
}

// ── Download reports menu ────────────────────────────────────────────────────
function DownloadMenu() {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const options = [
    { key: 'branch',  label: 'Branch-wise (totals & profit)', run: downloadBranchReport },
    { key: 'person',  label: 'Person-wise (Ordered By)',       run: downloadOrderedByReport },
    { key: 'manager', label: 'Manager-wise',                   run: downloadManagerReport },
  ]

  async function handle(opt: typeof options[number]) {
    setBusy(opt.key)
    try { await opt.run(); toast.success('Report downloaded') }
    catch { toast.error('Failed to download report') }
    finally { setBusy(null); setOpen(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
        <Download size={14} /> Download Reports
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20">
          {options.map(opt => (
            <button key={opt.key} onClick={() => handle(opt)} disabled={busy !== null}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-between">
              {opt.label}
              {busy === opt.key && <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [expenses,   setExpenses]   = React.useState<any[]>([])
  const [wallets,    setWallets]    = React.useState<any[]>([])
  const [siteFilter, setSiteFilter] = React.useState('All')
  const [personFilter, setPersonFilter] = React.useState('All')
  const [search,     setSearch]     = React.useState('')
  const [loading,    setLoading]    = React.useState(true)

  React.useEffect(() => {
    Promise.all([fetchReports(), fetchExpenses(), fetchWallets()])
      .then(([_r, exp, w]) => { setExpenses(exp); setWallets(w); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const allSites = ['All', ...Array.from(new Set(expenses.map((e: any) => e.site?.name).filter(Boolean)))]
  const allPeople = Array.from(new Set(expenses.map((e: any) => e.orderedBy).filter(Boolean))).sort()

  const filtered = expenses
    .filter((e: any) => siteFilter === 'All' || e.site?.name === siteFilter)
    .filter((e: any) => personFilter === 'All' || e.orderedBy === personFilter)
    .filter((e: any) => !search || e.category?.toLowerCase().includes(search.toLowerCase()) || e.site?.name?.toLowerCase().includes(search.toLowerCase()) || e.notes?.toLowerCase().includes(search.toLowerCase()) || e.orderedBy?.toLowerCase().includes(search.toLowerCase()))

  const totalCompany  = filtered.reduce((s: number, e: any) => s + (e.companyPaid  || 0), 0)
  const totalPersonal = filtered.reduce((s: number, e: any) => s + (e.personalPaid || 0), 0)
  const totalAll      = filtered.reduce((s: number, e: any) => s + e.amount, 0)

  if (loading) return <ReportsSkeleton />

  function scrollToLedger() {
    document.getElementById('expense-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function selectSite(name: string) {
    setSiteFilter(name)
    scrollToLedger()
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl text-white p-7 animate-fade-up"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2a4a 100%)' }}>
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #3b82f6 0%, transparent 45%), radial-gradient(circle at 85% 30%, #6366f1 0%, transparent 40%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-blue-300" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Analytics</span>
            </div>
            <h1 className="text-3xl font-extrabold">Reports</h1>
            <p className="text-blue-200 text-sm mt-1">Site-wise expense analysis &amp; financial overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-blue-300 text-xs">Total entries</p>
              <p className="text-5xl font-black">{expenses.length}</p>
            </div>
            <DownloadMenu />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Expenses" value={fmt(totalAll)} sub={`${filtered.length} entries`}
          icon={<TrendingDown size={18} className="text-white" />}
          gradient="bg-gradient-to-br from-slate-700 to-slate-900"
          delay="animate-delay-1"
          onClick={() => { setSiteFilter('All'); setPersonFilter('All'); scrollToLedger() }}
        />
        <StatCard
          label="Company Paid" value={fmt(totalCompany)} sub="From company funds"
          icon={<Wallet size={18} className="text-white" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          delay="animate-delay-2"
          onClick={scrollToLedger}
        />
        <StatCard
          label="Manager Paid" value={fmt(totalPersonal)} sub="Personal expenses"
          icon={<User size={18} className="text-white" />}
          gradient="bg-gradient-to-br from-rose-500 to-rose-700"
          delay="animate-delay-3"
          onClick={scrollToLedger}
        />
        <StatCard
          label="Active Sites" value={wallets.length} sub="Tracked sites"
          icon={<Building2 size={18} className="text-white" />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-700"
          delay="animate-delay-4"
          onClick={() => document.getElementById('site-wallet-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      {/* Site wallet summary */}
      <div id="site-wallet-summary" className="animate-fade-up animate-delay-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-slate-800">Site Wallet Summary</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{wallets.length} sites</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {wallets.map((site: any, i: number) => (
            <SiteWalletCard key={site.id} site={site} index={i} onClick={() => selectSite(site.name)} />
          ))}
        </div>
      </div>

      {/* Expense Ledger */}
      <div id="expense-ledger" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-up animate-delay-6">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Expense Ledger</h2>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} of {expenses.length} entries</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-44">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Ordered By filter */}
            <div className="relative w-full sm:w-48">
              <UserSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                className="border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full appearance-none bg-white"
                value={personFilter}
                onChange={e => setPersonFilter(e.target.value)}
              >
                <option value="All">Ordered by: Anyone</option>
                {allPeople.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {/* Site filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {allSites.map(s => (
                <button key={s} onClick={() => setSiteFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${siteFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ordered-by summary banner */}
        {personFilter !== 'All' && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <UserSearch size={15} />
              <span><strong>{personFilter}</strong> ordered {filtered.length} expense{filtered.length !== 1 ? 's' : ''} totaling <strong>{fmt(totalAll)}</strong></span>
            </div>
            <button onClick={() => setPersonFilter('All')} className="text-blue-400 hover:text-blue-600">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                {['#', 'Site', 'Category', 'Ordered By', 'Total', 'Company', 'Personal', 'Type', 'Date'].map(h => (
                  <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex: any, i: number) => {
                const ft = FUND_STYLE[ex.fundType] || FUND_STYLE.COMPANY
                return (
                  <tr key={ex.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50 group">
                    <td className="px-4 py-3.5 text-xs text-slate-300 font-mono">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">{ex.site?.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${CATEGORY_COLOR[ex.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{ex.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {ex.orderedBy || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{fmt(ex.amount)}</td>
                    <td className="px-4 py-3.5">
                      {ex.companyPaid > 0
                        ? <span className="font-semibold text-blue-600">{fmt(ex.companyPaid)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {ex.personalPaid > 0
                        ? <span className="font-semibold text-rose-600">{fmt(ex.personalPaid)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${ft.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ft.dot}`} />
                        {ft.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(ex.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <BarChart3 size={20} />
                      </div>
                      <p className="text-sm font-medium">No expenses found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-t-2 border-slate-100">
                  <td colSpan={4} className="px-4 py-4">
                    <span className="font-bold text-slate-700">Total</span>
                    <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} entries</span>
                  </td>
                  <td className="px-4 py-4 font-extrabold text-slate-800 text-base">{fmt(totalAll)}</td>
                  <td className="px-4 py-4 font-bold text-blue-600">{fmt(totalCompany)}</td>
                  <td className="px-4 py-4 font-bold text-rose-600">{fmt(totalPersonal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
