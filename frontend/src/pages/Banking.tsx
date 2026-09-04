import React from 'react'
import { fetchBankingSummary, fetchPayments, addPayment, deletePayment, fetchCustomers, downloadBankingReport } from '../api'
import { Plus, Landmark, TrendingUp, TrendingDown, Wallet, Search, X, Trash2, History, Download, FileText } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import BankingReportDocument from '../components/BankingReportDocument'

const METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other']

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function buildLedgerMessage(c: any) {
  const lines = [
    `Hi ${c.customerName},`,
    '',
    'Here is your account summary from We Work Constructions:',
    '',
    `Total Billed: ${fmt(c.billed)}`,
    `Total Paid: ${fmt(c.paid)}`,
  ]
  if (c.due > 0) lines.push(`Amount Due: ${fmt(c.due)}`)
  if (c.advance > 0) lines.push(`Advance Balance: ${fmt(c.advance)}`)
  lines.push('', 'Thank you for your business!')
  return lines.join('\n')
}

function shareOnWhatsApp(c: any) {
  const digits = String(c.mobile || '').replace(/\D/g, '')
  const phone = digits ? (digits.length === 10 ? `91${digits}` : digits) : ''
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildLedgerMessage(c))}`, '_blank', 'noopener,noreferrer')
}

function shareViaEmail(c: any) {
  const subject = `Account Summary — We Work Constructions`
  window.location.href = `mailto:${c.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildLedgerMessage(c))}`
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Add Payment Modal ────────────────────────────────────────────────────────
function AddPaymentModal({ customerNames, initialName, onClose, onSaved }: {
  customerNames: string[]; initialName?: string; onClose: () => void; onSaved: () => void
}) {
  const [customerName, setCustomerName] = React.useState(initialName || '')
  const [amount, setAmount] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = React.useState('Cash')
  const [reference, setReference] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) { toast.error('Customer name is required'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      await addPayment({ customerName: customerName.trim(), amount: Number(amount), date, method, reference, notes })
      toast.success('Payment recorded!')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to record payment')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Customer Name *</label>
          <input className="input" list="banking-customers" value={customerName}
            onChange={e => setCustomerName(e.target.value)} placeholder="e.g. SRPRO Technoworld LLP" autoFocus />
          <datalist id="banking-customers">
            {customerNames.map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input className="input no-spinner" type="number" inputMode="decimal" min={1} step={0.01} value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference No.</label>
            <input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="Cheque / UTR / txn id" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Payment History Drawer ───────────────────────────────────────────────────
function HistoryDrawer({ customer, onClose, onChanged }: { customer: any; onClose: () => void; onChanged: () => void }) {
  const [payments, setPayments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  function load() {
    setLoading(true)
    fetchPayments(customer.customerName).then(d => { setPayments(d); setLoading(false) }).catch(() => setLoading(false))
  }
  React.useEffect(load, [customer.customerName])

  async function remove(id: number) {
    if (!confirm('Delete this payment record?')) return
    try { await deletePayment(id); toast.success('Payment removed'); load(); onChanged() }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{customer.customerName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div><p className="text-xs text-slate-400">Total Billed</p><p className="font-bold text-slate-700">{fmt(customer.billed)}</p></div>
          <div><p className="text-xs text-slate-400">Total Paid</p><p className="font-bold text-emerald-600">{fmt(customer.paid)}</p></div>
          <div><p className="text-xs text-slate-400">Due</p><p className={`font-bold ${customer.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(customer.due)}</p></div>
          <div><p className="text-xs text-slate-400">Advance</p><p className={`font-bold ${customer.advance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{fmt(customer.advance)}</p></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading && <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && payments.map((p: any) => (
            <div key={p.id} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-white group">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{p.method || 'Payment'}</p>
                    {p.reference && <p className="text-xs text-slate-400 mt-0.5">Ref: {p.reference}</p>}
                    {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-emerald-600">+{fmt(p.amount)}</p>
                    <p className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => remove(p.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all self-start">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!loading && !payments.length && (
            <div className="text-center text-slate-400 py-16">No payments recorded yet for this customer.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Banking() {
  const [summary, setSummary] = React.useState<any[]>([])
  const [customerList, setCustomerList] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [showAdd, setShowAdd] = React.useState(false)
  const [historyFor, setHistoryFor] = React.useState<any>(null)
  const [downloading, setDownloading] = React.useState(false)
  const [downloadingPdf, setDownloadingPdf] = React.useState(false)
  const [downloadCustomer, setDownloadCustomer] = React.useState('')
  const [pdfCapture, setPdfCapture] = React.useState<{ rows: any[]; single?: any; payments?: any[] } | null>(null)
  const pdfCaptureRef = React.useRef<HTMLDivElement>(null)

  function load() {
    setLoading(true)
    Promise.all([fetchBankingSummary(), fetchCustomers()])
      .then(([s, c]) => { setSummary(s); setCustomerList(c); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(load, [])

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadBankingReport(downloadCustomer || undefined)
      toast.success(downloadCustomer ? `${downloadCustomer}'s report downloaded` : 'Report downloaded')
    }
    catch { toast.error('Failed to download report') }
    finally { setDownloading(false) }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      const single = downloadCustomer ? summary.find((s: any) => s.customerName === downloadCustomer) : undefined
      const payments = single ? await fetchPayments(downloadCustomer) : undefined
      setPdfCapture({ rows: summary, single, payments })
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const node = pdfCaptureRef.current
      if (!node) throw new Error('capture container not ready')

      // windowWidth forces html2canvas to lay out its clone at this fixed width
      // regardless of the actual device screen — otherwise on a narrow phone
      // screen the report's 860px design width collapses to fit, squishing the
      // fixed-size header/table until content overflows and gets cut off.
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 900 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const filename = downloadCustomer ? `${downloadCustomer.replace(/[^a-z0-9]+/gi, '-')}-ledger.pdf` : 'customer-ledger.pdf'
      pdf.save(filename)
      toast.success(downloadCustomer ? `${downloadCustomer}'s PDF downloaded` : 'PDF downloaded')
    } catch (err: any) {
      console.error('PDF download failed:', err)
      toast.error('Failed to generate PDF')
    } finally {
      setPdfCapture(null)
      setDownloadingPdf(false)
    }
  }

  const filtered = summary.filter((s: any) => !search || s.customerName.toLowerCase().includes(search.toLowerCase()))
  const totalBilled = summary.reduce((s, c) => s + c.billed, 0)
  const totalPaid = summary.reduce((s, c) => s + c.paid, 0)
  const totalDue = summary.reduce((s, c) => s + c.due, 0)
  const totalAdvance = summary.reduce((s, c) => s + c.advance, 0)

  const allNames = Array.from(new Set([...summary.map((s: any) => s.customerName), ...customerList.map((c: any) => c.name)]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banking</h1>
          <p className="text-slate-500 text-sm mt-1">Customer-wise paid, due &amp; advance amounts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input !py-2 w-44" value={downloadCustomer} onChange={e => setDownloadCustomer(e.target.value)}>
            <option value="">All Customers</option>
            {allNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={handleDownload} disabled={downloading} className="btn-secondary flex items-center gap-2">
            {downloading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Download size={16} />}
            Download Excel
          </button>
          <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="btn-secondary flex items-center gap-2">
            {downloadingPdf ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <FileText size={16} />}
            Download PDF
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0"><Landmark size={18} className="text-slate-600" /></div>
            <div><p className="text-slate-500 text-xs font-medium">Total Billed</p><p className="text-xl font-bold text-slate-700">{fmt(totalBilled)}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={18} className="text-emerald-600" /></div>
            <div><p className="text-slate-500 text-xs font-medium">Total Paid</p><p className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</p></div>
          </div>
        </div>
        <div className={`card ${totalDue > 0 ? 'border-rose-200 bg-rose-50/50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalDue > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}><TrendingDown size={18} className={totalDue > 0 ? 'text-rose-600' : 'text-slate-400'} /></div>
            <div><p className="text-slate-500 text-xs font-medium">Total Due</p><p className={`text-xl font-bold ${totalDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(totalDue)}</p></div>
          </div>
        </div>
        <div className={`card ${totalAdvance > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalAdvance > 0 ? 'bg-blue-100' : 'bg-slate-100'}`}><Wallet size={18} className={totalAdvance > 0 ? 'text-blue-600' : 'text-slate-400'} /></div>
            <div><p className="text-slate-500 text-xs font-medium">Total Advance</p><p className={`text-xl font-bold ${totalAdvance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{fmt(totalAdvance)}</p></div>
          </div>
        </div>
      </div>

      {/* Customer ledger */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-slate-800">Customer Ledger</h2>
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Billed</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Paid</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Due</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Advance</th>
                  <th className="px-4 py-3 w-24 text-center">Share</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.customerName} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setHistoryFor(c)}>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{c.customerName}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{fmt(c.billed)}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-emerald-600">{fmt(c.paid)}</td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      {c.due > 0 ? <span className="text-rose-600">{fmt(c.due)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      {c.advance > 0 ? <span className="text-blue-600">{fmt(c.advance)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => shareOnWhatsApp(c)} title="Share on WhatsApp" className="hover:opacity-75 transition-opacity"><FaWhatsapp size={18} color="#25D366" /></button>
                        <button onClick={() => shareViaEmail(c)} title="Share via Email" className="hover:opacity-75 transition-opacity"><SiGmail size={16} color="#EA4335" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <History size={15} className="text-slate-300" />
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                    {summary.length ? 'No customers match your search' : 'No billing or payment activity yet — record a payment or create an invoice to get started'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddPaymentModal customerNames={allNames} onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }} />
      )}
      {historyFor && (
        <HistoryDrawer customer={historyFor} onClose={() => setHistoryFor(null)} onChanged={load} />
      )}

      {pdfCapture && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: '#fff' }}>
          <div ref={pdfCaptureRef} style={{ width: 860, background: '#fff' }}>
            <BankingReportDocument rows={pdfCapture.rows} single={pdfCapture.single} payments={pdfCapture.payments} />
          </div>
        </div>
      )}
    </div>
  )
}
