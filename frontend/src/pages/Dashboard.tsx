import React from 'react'
import { fetchReports, fetchExpenses, fetchWallets } from '../api'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, LineElement, PointElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { TrendingDown, Wallet, User, Building2, ArrowUpRight, ArrowDownRight, Layers, Activity } from 'lucide-react'
import SiteHistoryDrawer from '../components/SiteHistoryDrawer'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement)

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const fmtShort = (n: number): string => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n}`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer-skeleton rounded-xl ${className}`} />
}
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-36" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

// ── Circular Progress (SVG) ───────────────────────────────────────────────────
function CircularProgress({ pct, color, trackColor = 'rgba(255,255,255,0.12)', size = 88 }: {
  pct: number; color: string; trackColor?: string; size?: number
}) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, pct) / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="10" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  )
}

// ── Metric Gauge Card (reference-style) ──────────────────────────────────────
function GaugeCard({ label, value, sub, pct, circleColor, gradient, Icon, trend, trendUp, delay }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white stat-card-hover animate-fade-up ${delay} ${gradient}`}>
      <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative shrink-0">
          <CircularProgress pct={pct} color={circleColor} size={84} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black">{Math.round(pct)}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-white/65 text-xs font-medium">{label}</p>
          <p className="text-xl font-extrabold mt-0.5 leading-tight">{value}</p>
          {sub && <p className="text-white/55 text-xs mt-0.5">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${trendUp ? 'text-emerald-300' : 'text-rose-300'}`}>
              {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend}
            </div>
          )}
        </div>
        <div className="ml-auto shrink-0 w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

// ── Site Card ─────────────────────────────────────────────────────────────────
function SiteCard({ site, index, onClick }: { site: any; index: number; onClick: () => void }) {
  const w = site.wallet || {}
  const pending = (w.totalPersonalSpent || 0) - (w.totalPersonalReimbursed || 0)
  const pct = w.totalFundsReceived > 0 ? Math.min(100, ((w.totalCompanySpent || 0) / w.totalFundsReceived) * 100) : 0
  const palettes = [
    { accent: '#3b82f6', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800', iconBg: 'bg-blue-600' },
    { accent: '#10b981', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800', iconBg: 'bg-emerald-600' },
    { accent: '#f59e0b', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800', iconBg: 'bg-amber-500' },
    { accent: '#8b5cf6', light: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-100 dark:border-violet-800', iconBg: 'bg-violet-600' },
  ]
  const p = palettes[index % palettes.length]
  const delays = ['animate-delay-1','animate-delay-2','animate-delay-3','animate-delay-4']

  return (
    <button type="button" onClick={onClick}
      className={`text-left w-full rounded-2xl border ${p.light} ${p.border} p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-up cursor-pointer ${delays[index] || ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${p.iconBg} rounded-xl flex items-center justify-center`}>
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-white text-sm">{site.name}</p>
          <p className="text-xs text-slate-400">{site.expenses?.length || 0} entries</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-extrabold text-base" style={{ color: p.accent }}>{fmt(w.companyBalance || 0)}</p>
          <p className="text-xs text-slate-400">balance</p>
        </div>
      </div>
      <div className="h-1.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full progress-bar" style={{ backgroundColor: p.accent, width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-slate-400">
        <span>Spent {fmtShort(w.totalCompanySpent || 0)}</span>
        <span>{Math.round(pct)}% used</span>
      </div>
      {pending > 0 && (
        <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 flex justify-between bg-amber-50 dark:bg-amber-900/30 rounded-lg px-2.5 py-1.5">
          <span>Mgr. owed</span><span>{fmt(pending)}</span>
        </div>
      )}
    </button>
  )
}

// ── Recent Activity ───────────────────────────────────────────────────────────
function ActivityFeed({ expenses }: { expenses: any[] }) {
  const recent = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  const catColor: Record<string, string> = {
    Materials: 'bg-amber-500', Labour: 'bg-blue-500', Labor: 'bg-blue-500', Travel: 'bg-purple-500',
    Equipment: 'bg-rose-500', Food: 'bg-green-500', Office: 'bg-slate-400', Misc: 'bg-gray-400',
  }
  return (
    <div className="card animate-fade-up animate-delay-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Recent Activity</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest expense entries</p>
        </div>
        <Activity size={16} className="text-slate-400" />
      </div>
      <div className="space-y-3">
        {recent.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No activity yet</p>}
        {recent.map((e, i) => (
          <div key={e.id} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${catColor[e.category] || 'bg-slate-400'}`}>
              <span className="text-white text-xs font-bold">{(e.category || 'M')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{e.category} — {e.site?.name}</p>
              <p className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{fmt(e.amount)}</p>
              <p className={`text-xs ${e.fundType === 'PERSONAL' ? 'text-rose-500' : e.fundType === 'SPLIT' ? 'text-amber-500' : 'text-blue-500'}`}>
                {e.fundType}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Admin Dashboard ────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [report,   setReport]   = React.useState<any>(null)
  const [wallets,  setWallets]  = React.useState<any[]>([])
  const [expenses, setExpenses] = React.useState<any[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [historySite, setHistorySite] = React.useState<any>(null)
  const isDark = document.documentElement.classList.contains('dark')

  React.useEffect(() => {
    Promise.all([fetchReports(), fetchWallets(), fetchExpenses()])
      .then(([r, w, e]) => { setReport(r); setWallets(w); setExpenses(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const totalBalance   = wallets.reduce((s, w) => s + (w.wallet?.companyBalance || 0), 0)
  const totalReceived  = wallets.reduce((s, w) => s + (w.wallet?.totalFundsReceived || 0), 0)
  const totalCompSpent = wallets.reduce((s, w) => s + (w.wallet?.totalCompanySpent || 0), 0)
  const totalPersonal  = wallets.reduce((s, w) => s + ((w.wallet?.totalPersonalSpent || 0) - (w.wallet?.totalPersonalReimbursed || 0)), 0)
  const totalPersonalSpent = wallets.reduce((s, w) => s + (w.wallet?.totalPersonalSpent || 0), 0)

  const balancePct  = totalReceived > 0 ? (totalBalance / totalReceived) * 100 : 0
  const spentPct    = totalReceived > 0 ? (totalCompSpent / totalReceived) * 100 : 0
  const personalPct = totalPersonalSpent > 0 ? (totalPersonal / totalPersonalSpent) * 100 : 0

  // Monthly bar chart data
  const monthlyMap: Record<string, { company: number; personal: number }> = {}
  expenses.forEach((e: any) => {
    const m = new Date(e.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    if (!monthlyMap[m]) monthlyMap[m] = { company: 0, personal: 0 }
    monthlyMap[m].company  += e.companyPaid  || 0
    monthlyMap[m].personal += e.personalPaid || 0
  })
  const months = Object.keys(monthlyMap).sort()

  const barData = {
    labels: months.length ? months : ['Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Company',
        data: months.length ? months.map(m => monthlyMap[m].company) : [0, 0, 0],
        backgroundColor: (ctx: any) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300)
          gradient.addColorStop(0, 'rgba(56,189,248,1)')
          gradient.addColorStop(1, 'rgba(37,99,235,0.7)')
          return gradient
        },
        borderRadius: { topLeft: 8, topRight: 8 },
        borderSkipped: false,
        maxBarThickness: 52,
      },
      {
        label: 'Personal',
        data: months.length ? months.map(m => monthlyMap[m].personal) : [0, 0, 0],
        backgroundColor: (ctx: any) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300)
          gradient.addColorStop(0, 'rgba(251,113,133,1)')
          gradient.addColorStop(1, 'rgba(239,68,68,0.7)')
          return gradient
        },
        borderRadius: { topLeft: 8, topRight: 8 },
        borderSkipped: false,
        maxBarThickness: 52,
      },
    ],
  }

  const siteColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e']
  const donutData = {
    labels: wallets.map(w => w.name),
    datasets: [{
      data: wallets.map(w => w.wallet?.totalCompanySpent || 0),
      backgroundColor: siteColors,
      borderWidth: 3,
      borderColor: isDark ? '#131f35' : '#ffffff',
      hoverOffset: 10,
    }],
  }

  const axisColor = isDark ? '#475569' : '#94a3b8'
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'
  const tooltipBg = isDark ? '#0e1929' : '#1e293b'

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 md:p-7 text-white animate-fade-up"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #312e81 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, rgba(59,130,246,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(139,92,246,0.3) 0%, transparent 40%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Live Overview</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-blue-200 text-xs md:text-sm mt-1.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3 md:gap-5 text-right shrink-0">
            <div>
              <p className="text-blue-300 text-xs mb-0.5">Total Received</p>
              <p className="text-xl md:text-2xl font-black">{fmtShort(totalReceived)}</p>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaugeCard
          label="Company Balance" value={fmt(totalBalance)} sub={`of ${fmtShort(totalReceived)} received`}
          pct={balancePct} circleColor="#38bdf8"
          gradient="bg-gradient-to-br from-sky-500 to-blue-700"
          Icon={Wallet} trend="+funds in" trendUp={true} delay="animate-delay-1"
        />
        <GaugeCard
          label="Company Spent" value={fmt(totalCompSpent)} sub="All sites"
          pct={spentPct} circleColor="#fb923c"
          gradient="bg-gradient-to-br from-orange-400 to-amber-600"
          Icon={TrendingDown} trend="expenses" trendUp={false} delay="animate-delay-2"
        />
        <GaugeCard
          label="Manager Pending" value={fmt(totalPersonal)} sub="Pending reimburse"
          pct={personalPct}
          circleColor={totalPersonal > 0 ? '#f87171' : '#34d399'}
          gradient={totalPersonal > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}
          Icon={User} trendUp={totalPersonal === 0} delay="animate-delay-3"
        />
        <GaugeCard
          label="Active Sites" value={wallets.length} sub="Tracked locations"
          pct={(wallets.length / Math.max(wallets.length, 1)) * 100} circleColor="#a78bfa"
          gradient="bg-gradient-to-br from-violet-500 to-purple-700"
          Icon={Building2} delay="animate-delay-4"
        />
      </div>

      {/* Charts + sites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart — takes 2/3 width */}
        <div className="card lg:col-span-2 animate-fade-up animate-delay-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">Monthly Expense Breakdown</h2>
              <p className="text-slate-400 text-xs mt-0.5">Company vs Personal spending</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />Company
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />Personal
              </span>
            </div>
          </div>
          <div className="h-56 md:h-64">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: tooltipBg, padding: 12, cornerRadius: 10 } },
                scales: {
                  x: { grid: { display: false }, border: { display: false }, ticks: { color: axisColor, font: { size: 11 } } },
                  y: { grid: { color: gridColor }, border: { display: false }, ticks: { color: axisColor, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        {/* Donut chart */}
        <div className="card animate-fade-up animate-delay-6 flex flex-col">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800 dark:text-white">Site Spending</h2>
            <p className="text-slate-400 text-xs mt-0.5">Distribution by site</p>
          </div>
          {wallets.some(w => (w.wallet?.totalCompanySpent || 0) > 0) ? (
            <>
              <div className="h-40 md:h-44">
                <Doughnut
                  data={donutData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '70%',
                  }}
                />
              </div>
              {/* Custom legend */}
              <div className="mt-4 space-y-2">
                {wallets.map((w, i) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: siteColors[i % siteColors.length] }} />
                      <span className="text-xs text-slate-600 dark:text-slate-300">{w.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmtShort(w.wallet?.totalCompanySpent || 0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-14 h-14 bg-slate-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <TrendingDown size={22} />
              </div>
              <p className="text-sm">No spending data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Site cards grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-slate-800 dark:text-white">Site Wallets</h2>
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full">{wallets.length} sites</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {wallets.map((site, i) => <SiteCard key={site.id} site={site} index={i} onClick={() => setHistorySite(site)} />)}
        </div>
      </div>

      {/* Activity feed */}
      <ActivityFeed expenses={expenses} />

      {historySite && <SiteHistoryDrawer site={historySite} onClose={() => setHistorySite(null)} />}
    </div>
  )
}

// ── Manager Dashboard ──────────────────────────────────────────────────────────
function ManagerDashboard({ user }: { user: any }) {
  const [wallets,  setWallets]  = React.useState<any[]>([])
  const [expenses, setExpenses] = React.useState<any[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [historySite, setHistorySite] = React.useState<any>(null)

  React.useEffect(() => {
    Promise.all([fetchWallets(), fetchExpenses()])
      .then(([w, e]) => { setWallets(w); setExpenses(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const totalPending = wallets.reduce((s, w) =>
    s + ((w.wallet?.totalPersonalSpent || 0) - (w.wallet?.totalPersonalReimbursed || 0)), 0)
  const totalPersonal = wallets.reduce((s, w) => s + (w.wallet?.totalPersonalSpent || 0), 0)
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white animate-fade-up"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #7c3aed 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 10% 80%, rgba(96,165,250,0.3) 0%, transparent 40%), radial-gradient(circle at 90% 10%, rgba(167,139,250,0.3) 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium">{greeting},</p>
          <h1 className="text-3xl font-extrabold mt-1">{user?.name || 'Manager'} 👋</h1>
          <p className="text-blue-200 text-sm mt-1">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="bg-white/15 rounded-xl px-4 py-2">
              <p className="text-xs text-white/65">Personal Spent</p>
              <p className="font-extrabold text-lg">{fmt(totalPersonal)}</p>
            </div>
            <div className={`rounded-xl px-4 py-2 ${totalPending > 0 ? 'bg-amber-400/25' : 'bg-emerald-400/25'}`}>
              <p className="text-xs text-white/65">Pending Reimburse</p>
              <p className="font-extrabold text-lg">{fmt(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gauge cards */}
      <div className="grid grid-cols-2 gap-4">
        <GaugeCard
          label="My Personal Spent" value={fmt(totalPersonal)} sub="Out of pocket"
          pct={totalPersonal > 0 ? 100 : 0} circleColor="#f87171"
          gradient="bg-gradient-to-br from-rose-500 to-rose-700"
          Icon={User} delay="animate-delay-1"
        />
        <GaugeCard
          label="Pending Reimburse" value={fmt(totalPending)} sub="Company owes you"
          pct={totalPersonal > 0 ? (totalPending / totalPersonal) * 100 : 0}
          circleColor={totalPending > 0 ? '#fbbf24' : '#34d399'}
          gradient={totalPending > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}
          Icon={Wallet} delay="animate-delay-2"
        />
      </div>

      {/* Site balances */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-slate-800 dark:text-white">Site Balances</h2>
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-gray-700 dark:text-gray-400 px-2.5 py-1 rounded-full">{wallets.length} sites</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((site, i) => <SiteCard key={site.id} site={site} index={i} onClick={() => setHistorySite(site)} />)}
        </div>
      </div>

      {/* Activity */}
      <ActivityFeed expenses={expenses} />

      {historySite && <SiteHistoryDrawer site={historySite} onClose={() => setHistorySite(null)} />}
    </div>
  )
}

export default function Dashboard({ user }: { user: any }) {
  if (user?.isAdmin) return <AdminDashboard />
  return <ManagerDashboard user={user} />
}
