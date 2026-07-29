import React from 'react'
import { fetchSiteHistory } from '../api'
import { X, ArrowDownCircle, ArrowUpCircle, CheckCircle, Image, User } from 'lucide-react'

const FUND_TYPE_STYLE: Record<string, string> = {
  COMPANY:  'bg-blue-100 text-blue-700',
  PERSONAL: 'bg-rose-100 text-rose-700',
  SPLIT:    'bg-amber-100 text-amber-700',
}

function fmt(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

// Full fund + expense timeline for one site — used from both the Expense
// Tracker's per-site "History" button and the Dashboard's clickable site cards.
export default function SiteHistoryDrawer({ site, onClose }: { site: any; onClose: () => void }) {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchSiteHistory(site.id)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [site.id])

  const w = data?.wallet || {}

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
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
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${tx.txType === 'FUND' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.txType === 'FUND' ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString('en-IN')}</p>
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
    </div>
  )
}
