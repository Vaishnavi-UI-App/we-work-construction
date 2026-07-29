import React from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Printer, FileText, X, ArrowLeft, RefreshCw, Eye } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import { fetchBills, fetchNextBillNo, fetchHsnCodes, createBill, deleteBill } from '../api'
import InvoiceDocument from '../components/InvoiceDocument'

const UNITS = ['EA', 'NOS', 'PCS', 'SET', 'MTR', 'RMT', 'SQM', 'SQF', 'KG', 'TON', 'LTR', 'BOX', 'ROLL', 'PKT', 'BAG', 'HRS', 'DAYS', 'LOT', 'LS']

type Item = { description: string; hsnCode: string; unit: string; quantity: string; unitPrice: string }

const emptyItem = (): Item => ({ description: '', hsnCode: '', unit: 'EA', quantity: '', unitPrice: '' })

// Share a text summary of the invoice — there's no hosted PDF to attach/link,
// so this sends the key details rather than the invoice file itself.
function buildShareMessage(bill: any) {
  const amount = `₹${Number(bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const date = new Date(bill.date).toLocaleDateString('en-GB')
  return `Hi ${bill.billToName || ''},\n\nHere are your invoice details from We Work Constructions:\n\nInvoice No: ${bill.invoiceNumber}\nDate: ${date}\nAmount: ${amount}\n\nThank you for your business!`
}

function shareOnWhatsApp(bill: any) {
  const digits = String(bill.billToMobile || '').replace(/\D/g, '')
  const phone = digits ? (digits.length === 10 ? `91${digits}` : digits) : ''
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildShareMessage(bill))}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareViaEmail(bill: any) {
  const subject = `Invoice ${bill.invoiceNumber} from We Work Constructions`
  const url = `mailto:${bill.billToEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage(bill))}`
  window.location.href = url
}

export default function Billing() {
  const [view, setView] = React.useState<'list' | 'create'>('list')
  const [bills, setBills] = React.useState<any[]>([])
  const [hsn, setHsn] = React.useState<any[]>([])
  const [preview, setPreview] = React.useState<any | null>(null)

  // form state
  const [invoiceNumber, setInvoiceNumber] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [billToName, setBillToName] = React.useState('')
  const [billToAddress, setBillToAddress] = React.useState('')
  const [billToGst, setBillToGst] = React.useState('')
  const [billToMobile, setBillToMobile] = React.useState('')
  const [billToEmail, setBillToEmail] = React.useState('')
  const [billToState, setBillToState] = React.useState('Maharashtra')
  const [sameAsBilling, setSameAsBilling] = React.useState(true)
  const [shipToName, setShipToName] = React.useState('')
  const [shipToAddress, setShipToAddress] = React.useState('')
  const [shipToGst, setShipToGst] = React.useState('')
  const [shipToState, setShipToState] = React.useState('')
  const [poNumber, setPoNumber] = React.useState('')
  const [poDate, setPoDate] = React.useState('')
  const [vendorCode, setVendorCode] = React.useState('')
  const [projectCode, setProjectCode] = React.useState('')
  const [projectName, setProjectName] = React.useState('')
  const [dateOfSupply, setDateOfSupply] = React.useState('')
  const [placeOfSupply, setPlaceOfSupply] = React.useState('Maharashtra')
  const [reverseCharge, setReverseCharge] = React.useState('NO')
  const [vehicleNumber, setVehicleNumber] = React.useState('')
  const [transportMode, setTransportMode] = React.useState('Road')
  const [siteName, setSiteName] = React.useState('')
  const [deliveredThrough, setDeliveredThrough] = React.useState('')
  const [gstRate, setGstRate] = React.useState(9)
  const [items, setItems] = React.useState<Item[]>([emptyItem()])
  const [saving, setSaving] = React.useState(false)

  async function loadList() {
    try { setBills(await fetchBills()) } catch { toast.error('Failed to load invoices') }
  }
  React.useEffect(() => { loadList() }, [])

  async function startCreate() {
    setInvoiceNumber(''); setDate(new Date().toISOString().slice(0, 10))
    setBillToName(''); setBillToAddress(''); setBillToGst(''); setBillToMobile(''); setBillToEmail(''); setBillToState('Maharashtra')
    setSameAsBilling(true); setShipToName(''); setShipToAddress(''); setShipToGst(''); setShipToState('')
    setPoNumber(''); setPoDate(''); setVendorCode(''); setProjectCode(''); setProjectName('')
    setDateOfSupply(''); setPlaceOfSupply('Maharashtra'); setReverseCharge('NO')
    setVehicleNumber(''); setTransportMode('Road'); setSiteName(''); setDeliveredThrough('')
    setGstRate(9); setItems([emptyItem()])
    try {
      const [n, h] = await Promise.all([fetchNextBillNo(), fetchHsnCodes()])
      setInvoiceNumber(n.invoiceNumber); setHsn(h)
    } catch { /* non-fatal */ }
    setView('create')
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  // When a saved product description is chosen, auto-fill HSN / unit / price
  function onDescriptionChange(idx: number, value: string) {
    const match = hsn.find((h: any) => h.description === value)
    if (match) {
      updateItem(idx, {
        description: value,
        hsnCode: match.code || '',
        unit: match.unit || 'EA',
        unitPrice: match.unitPrice != null ? String(match.unitPrice) : items[idx].unitPrice,
      })
    } else {
      updateItem(idx, { description: value })
    }
  }
  // When an HSN code is typed that matches a saved one, we leave it — but if user picks a known code, fill unit
  function onHsnChange(idx: number, value: string) {
    updateItem(idx, { hsnCode: value })
  }

  // Each HSN/SAC code may only ever map to a single product — returns the conflicting
  // product name if this row's code is already used for a different description.
  function hsnConflict(hsnCode: string, description: string): string | null {
    const code = hsnCode.trim()
    const desc = description.trim()
    if (!code) return null
    const savedMatch = hsn.find((h: any) => h.code === code && h.description.trim() !== desc)
    if (savedMatch) return savedMatch.description
    const rowMatch = items.find(it => it.hsnCode.trim() === code && it.description.trim() && it.description.trim() !== desc)
    return rowMatch ? rowMatch.description : null
  }

  function addRow() { setItems(prev => [...prev, emptyItem()]) }
  function removeRow(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)) }

  const rowAmount = (it: Item) => (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
  const subtotal = items.reduce((s, it) => s + rowAmount(it), 0)
  const cgst = subtotal * gstRate / 100
  const sgst = subtotal * gstRate / 100
  const total = subtotal + cgst + sgst
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function save() {
    if (!billToName.trim()) { toast.error('Bill To name is required'); return }
    const valid = items.filter(it => it.description.trim())
    if (valid.length === 0) { toast.error('Add at least one line item'); return }
    const conflicted = valid.find(it => hsnConflict(it.hsnCode, it.description))
    if (conflicted) { toast.error(`HSN/SAC code "${conflicted.hsnCode}" is already used for another product`); return }
    setSaving(true)
    try {
      const created = await createBill({
        invoiceNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName: sameAsBilling ? '' : shipToName,
        shipToAddress: sameAsBilling ? '' : shipToAddress,
        shipToGst: sameAsBilling ? '' : shipToGst,
        shipToState: sameAsBilling ? '' : shipToState,
        poNumber, poDate, vendorCode, projectCode, projectName,
        dateOfSupply: dateOfSupply || date, placeOfSupply, reverseCharge,
        vehicleNumber, transportMode, siteName, deliveredThrough,
        gstRate,
        items: valid.map((it, i) => ({
          lineNo: i + 1, description: it.description, hsnCode: it.hsnCode,
          unit: it.unit, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0,
        })),
      })
      toast.success('Invoice generated!')
      await loadList()
      setPreview(created)
      setView('list')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to generate invoice')
    } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!confirm('Delete this invoice?')) return
    try { await deleteBill(id); toast.success('Deleted'); loadList() }
    catch { toast.error('Failed to delete') }
  }

  // ----- PREVIEW / PRINT MODAL -----
  if (preview) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 overflow-auto p-4 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3 no-print">
            <button onClick={() => setPreview(null)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
          <div className="print-area bg-white p-4 rounded-lg">
            <InvoiceDocument bill={preview} />
          </div>
        </div>
      </div>
    )
  }

  // ----- CREATE FORM -----
  if (view === 'create') {
    return (
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">New Tax Invoice</h1>
        </div>

        {/* Header fields */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Invoice No (auto)</label>
            <input className="input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="WWC .../26-27" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Details of Receiver | Billed To</p>
          </div>
          <div>
            <label className="label">Bill To Name *</label>
            <input className="input" value={billToName} onChange={e => setBillToName(e.target.value)} placeholder="M/s. Company Name" />
          </div>
          <div>
            <label className="label">Bill To GST No</label>
            <input className="input" value={billToGst} onChange={e => setBillToGst(e.target.value)} placeholder="27AAACB4487D1ZS" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Bill To Address</label>
            <textarea className="input resize-none" rows={3} value={billToAddress} onChange={e => setBillToAddress(e.target.value)} placeholder="Full billing address (one line per row)" />
          </div>
          <div><label className="label">Mobile</label><input className="input" value={billToMobile} onChange={e => setBillToMobile(e.target.value)} placeholder="9545519101" /></div>
          <div><label className="label">Email</label><input className="input" value={billToEmail} onChange={e => setBillToEmail(e.target.value)} placeholder="buyer@example.com" /></div>
          <div className="md:col-span-2"><label className="label">State</label><input className="input" value={billToState} onChange={e => setBillToState(e.target.value)} placeholder="Maharashtra" /></div>

          <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Details of Consignee | Shipped To</p>
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={sameAsBilling} onChange={e => setSameAsBilling(e.target.checked)} />
              Same as billing
            </label>
          </div>
          {!sameAsBilling && (
            <>
              <div>
                <label className="label">Ship To Name</label>
                <input className="input" value={shipToName} onChange={e => setShipToName(e.target.value)} placeholder="M/s. Company Name" />
              </div>
              <div>
                <label className="label">Ship To GST No</label>
                <input className="input" value={shipToGst} onChange={e => setShipToGst(e.target.value)} placeholder="27AAACB4487D1ZS" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Ship To Address</label>
                <textarea className="input resize-none" rows={3} value={shipToAddress} onChange={e => setShipToAddress(e.target.value)} placeholder="Full shipping address (one line per row)" />
              </div>
              <div className="md:col-span-2"><label className="label">State</label><input className="input" value={shipToState} onChange={e => setShipToState(e.target.value)} placeholder="Maharashtra" /></div>
            </>
          )}

          <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Order Reference</p>
          </div>
          <div><label className="label">PO Number</label><input className="input" value={poNumber} onChange={e => setPoNumber(e.target.value)} /></div>
          <div><label className="label">PO Date</label><input className="input" value={poDate} onChange={e => setPoDate(e.target.value)} placeholder="24.06.2026" /></div>
          <div><label className="label">Vendor Code</label><input className="input" value={vendorCode} onChange={e => setVendorCode(e.target.value)} /></div>
          <div><label className="label">Project Code</label><input className="input" value={projectCode} onChange={e => setProjectCode(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Project Name</label><input className="input" value={projectName} onChange={e => setProjectName(e.target.value)} /></div>

          <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Dispatch / Transport Details</p>
          </div>
          <div><label className="label">Date Of Supply</label><input type="date" className="input" value={dateOfSupply} onChange={e => setDateOfSupply(e.target.value)} /></div>
          <div><label className="label">Place of Supply</label><input className="input" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Maharashtra" /></div>
          <div>
            <label className="label">Reverse Charge</label>
            <select className="input" value={reverseCharge} onChange={e => setReverseCharge(e.target.value)}>
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>
          <div><label className="label">Transportation Mode</label><input className="input" value={transportMode} onChange={e => setTransportMode(e.target.value)} placeholder="Road" /></div>
          <div><label className="label">Vehicle Number</label><input className="input" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="MH12VF9823" /></div>
          <div><label className="label">Place Of Supply (Site)</label><input className="input" value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="SITE- SHRIRAMPUR" /></div>
          <div className="md:col-span-2"><label className="label">Delivered Through</label><input className="input" value={deliveredThrough} onChange={e => setDeliveredThrough(e.target.value)} placeholder="Name / phone number" /></div>
        </div>

        {/* Line items */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Line Items</p>
            <button onClick={addRow} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-sm"><Plus size={14} /> Add Row</button>
          </div>

          {/* saved product datalist for autocomplete */}
          <datalist id="hsn-products">
            {hsn.map((h: any) => <option key={h.id} value={h.description} />)}
          </datalist>
          <datalist id="hsn-codes">
            {[...new Set(hsn.map((h: any) => h.code))].map((c: any) => <option key={c} value={c} />)}
          </datalist>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                  <th className="py-2 pr-2 w-14">Sr.No.</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2 w-28">HSN/SAC</th>
                  <th className="py-2 pr-2 w-24">Unit</th>
                  <th className="py-2 pr-2 w-20">Qty</th>
                  <th className="py-2 pr-2 w-28">Unit Price</th>
                  <th className="py-2 pr-2 w-32 text-right">Amount</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const conflict = hsnConflict(it.hsnCode, it.description)
                  return (
                  <tr key={idx} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-1.5 pr-2 text-center text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input !py-1.5 !px-2" list="hsn-products" value={it.description}
                        onChange={e => onDescriptionChange(idx, e.target.value)} placeholder="Product / description" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className={`input no-arrow !py-1.5 !px-2 ${conflict ? '!border-red-400' : ''}`} list="hsn-codes" value={it.hsnCode}
                        onChange={e => onHsnChange(idx, e.target.value)} placeholder="85359090" />
                      {conflict && (
                        <p className="text-xs text-red-500 mt-1 whitespace-normal">
                          Already used for "{conflict}"
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <select className="input !py-1.5 !px-2" value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input no-spinner !py-1.5 !px-2 text-right" type="number" inputMode="decimal" value={it.quantity}
                        onChange={e => updateItem(idx, { quantity: e.target.value })} placeholder="0" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input no-spinner !py-1.5 !px-2 text-right" type="number" inputMode="decimal" value={it.unitPrice}
                        onChange={e => updateItem(idx, { unitPrice: e.target.value })} placeholder="0.00" />
                    </td>
                    <td className="py-1.5 pr-2 text-right font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                      {rowAmount(it).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 text-center">
                      <button onClick={() => removeRow(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* GST + totals */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">GST Rate (CGST + SGST)</label>
            <div className="flex gap-2 mt-1">
              {[9, 2.5].map(r => (
                <button key={r} onClick={() => setGstRate(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    gstRate === r ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/15 hover:border-blue-400'
                  }`}>
                  {r}% + {r}%
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">CGST {gstRate}% and SGST {gstRate}% each applied on the subtotal.</p>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total Before Taxes</span><span className="font-medium tabular-nums">{inr(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">CGST {gstRate}%</span><span className="font-medium tabular-nums">{inr(cgst)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">SGST {gstRate}%</span><span className="font-medium tabular-nums">{inr(sgst)}</span></div>
            <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-1.5 text-base font-bold text-slate-800 dark:text-white">
              <span>Net Payable</span><span className="tabular-nums">{inr(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText size={16} />}
            {saving ? 'Generating...' : 'Generate Invoice'}
          </button>
          <button onClick={() => setView('list')} className="btn-secondary">Cancel</button>
        </div>
      </div>
    )
  }

  // ----- LIST -----
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Billing / Tax Invoices</h1>
        <button onClick={startCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Invoice</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {bills.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm">Click “New Invoice” to generate your first GST tax invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill To</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">{b.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{new Date(b.date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{b.billToName}</td>
                    <td className="py-3 px-4 text-right font-medium tabular-nums">{inr(b.total)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => shareOnWhatsApp(b)} title="Share on WhatsApp" className="hover:opacity-75 transition-opacity"><FaWhatsapp size={18} color="#25D366" /></button>
                        <button onClick={() => shareViaEmail(b)} title="Share via Email" className="hover:opacity-75 transition-opacity"><SiGmail size={16} color="#EA4335" /></button>
                        <button onClick={() => setPreview(b)} title="View / Print" className="text-blue-500 hover:text-blue-600"><Eye size={17} /></button>
                        <button onClick={() => remove(b.id)} title="Delete" className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
