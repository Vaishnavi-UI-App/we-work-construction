import React from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Plus, Trash2, Printer, FileText, ArrowLeft, RefreshCw, Eye } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import { fetchChallans, fetchNextChallanNo, createChallan, deleteChallan } from '../api'
import ChallanDocument from '../components/ChallanDocument'

const UNITS = ['EA', 'NOS', 'PCS', 'SET', 'MTR', 'RMT', 'SQM', 'SQF', 'KG', 'TON', 'LTR', 'BOX', 'ROLL', 'PKT', 'BAG', 'HRS', 'DAYS', 'LOT', 'LS']
const PURPOSES = ['Delivery', 'Job Work', 'Sales Return', 'Sample', 'Exhibition', 'Other']

type Item = { description: string; hsnCode: string; unit: string; quantity: string }

const emptyItem = (): Item => ({ description: '', hsnCode: '', unit: 'EA', quantity: '' })

function buildShareMessage(challan: any) {
  const date = new Date(challan.date).toLocaleDateString('en-GB')
  return `Hi ${challan.billToName || ''},\n\nHere is your delivery challan from We Work Constructions:\n\nChallan No: ${challan.challanNumber}\nDate: ${date}\nPurpose: ${challan.purpose || 'Delivery'}\n\nThank you!`
}

function buildWhatsAppUrl(challan: any) {
  const digits = String(challan.billToMobile || '').replace(/\D/g, '')
  const phone = digits ? (digits.length === 10 ? `91${digits}` : digits) : ''
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildShareMessage(challan))}`
}

function shareViaEmail(challan: any) {
  const subject = `Delivery Challan ${challan.challanNumber} from We Work Constructions`
  const url = `mailto:${challan.billToEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage(challan))}`
  window.location.href = url
}

export default function DeliveryChallan() {
  const [view, setView] = React.useState<'list' | 'create'>('list')
  const [challans, setChallans] = React.useState<any[]>([])
  const [preview, setPreview] = React.useState<any | null>(null)
  const [captureChallan, setCaptureChallan] = React.useState<any | null>(null)
  const [sharingId, setSharingId] = React.useState<number | null>(null)
  const captureRef = React.useRef<HTMLDivElement>(null)

  // form state
  const [challanNumber, setChallanNumber] = React.useState('')
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
  const [purpose, setPurpose] = React.useState('Delivery')
  const [dateOfSupply, setDateOfSupply] = React.useState('')
  const [placeOfSupply, setPlaceOfSupply] = React.useState('Maharashtra')
  const [vehicleNumber, setVehicleNumber] = React.useState('')
  const [transportMode, setTransportMode] = React.useState('Road')
  const [siteName, setSiteName] = React.useState('')
  const [deliveredThrough, setDeliveredThrough] = React.useState('')
  const [items, setItems] = React.useState<Item[]>([emptyItem()])
  const [saving, setSaving] = React.useState(false)

  async function loadList() {
    try { setChallans(await fetchChallans()) } catch { toast.error('Failed to load delivery challans') }
  }
  React.useEffect(() => { loadList() }, [])

  async function startCreate() {
    setChallanNumber(''); setDate(new Date().toISOString().slice(0, 10))
    setBillToName(''); setBillToAddress(''); setBillToGst(''); setBillToMobile(''); setBillToEmail(''); setBillToState('Maharashtra')
    setSameAsBilling(true); setShipToName(''); setShipToAddress(''); setShipToGst(''); setShipToState('')
    setPoNumber(''); setPoDate(''); setPurpose('Delivery')
    setDateOfSupply(''); setPlaceOfSupply('Maharashtra')
    setVehicleNumber(''); setTransportMode('Road'); setSiteName(''); setDeliveredThrough('')
    setItems([emptyItem()])
    try {
      const n = await fetchNextChallanNo()
      setChallanNumber(n.challanNumber)
    } catch { /* non-fatal */ }
    setView('create')
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addRow() { setItems(prev => [...prev, emptyItem()]) }
  function removeRow(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)) }

  async function save() {
    if (!billToName.trim()) { toast.error('Bill To name is required'); return }
    const valid = items.filter(it => it.description.trim())
    if (valid.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      const created = await createChallan({
        challanNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName: sameAsBilling ? '' : shipToName,
        shipToAddress: sameAsBilling ? '' : shipToAddress,
        shipToGst: sameAsBilling ? '' : shipToGst,
        shipToState: sameAsBilling ? '' : shipToState,
        poNumber, poDate, purpose,
        dateOfSupply: dateOfSupply || date, placeOfSupply,
        vehicleNumber, transportMode, siteName, deliveredThrough,
        items: valid.map((it, i) => ({
          lineNo: i + 1, description: it.description, hsnCode: it.hsnCode,
          unit: it.unit, quantity: Number(it.quantity) || 0,
        })),
      })
      toast.success('Delivery challan generated!')
      await loadList()
      setPreview(created)
      setView('list')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to generate delivery challan')
    } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!confirm('Delete this delivery challan?')) return
    try { await deleteChallan(id); toast.success('Deleted'); loadList() }
    catch { toast.error('Failed to delete') }
  }

  // Renders the challan off-screen and captures it as a PDF. We do NOT call
  // window.open()/navigator.share() here — both require a live user gesture, which is gone
  // by the time this async work (html2canvas + jsPDF) finishes, so browsers silently block
  // them. Instead we show a toast with a real <a> link; a genuine click on it is a fresh
  // user gesture that no popup blocker can touch.
  async function handleShareWhatsApp(challan: any) {
    setSharingId(challan.id)
    try {
      setCaptureChallan(challan)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const node = captureRef.current
      if (!node) throw new Error('capture container not ready')

      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
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

      const pdfBlob = pdf.output('blob')
      const file = new File([pdfBlob], `challan-${challan.challanNumber}.pdf`, { type: 'application/pdf' })

      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const waUrl = buildWhatsAppUrl(challan)
      toast((t) => (
        <span className="flex items-center gap-2">
          Challan PDF downloaded.
          <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => toast.dismiss(t.id)}
            className="font-semibold text-blue-600 underline whitespace-nowrap">
            Open WhatsApp
          </a>
          and attach it.
        </span>
      ), { duration: 20000 })
    } catch (err: any) {
      console.error('WhatsApp share failed:', err)
      toast.error(`Could not share delivery challan PDF: ${err?.message || err}`)
    } finally {
      setCaptureChallan(null)
      setSharingId(null)
    }
  }

  // ----- PREVIEW / PRINT MODAL -----
  if (preview) {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-black/70 overflow-auto p-4 print:p-0 print:bg-white flex justify-center">
        <div className="max-w-4xl w-full">
          <div className="flex items-center justify-between mb-3 no-print">
            <button onClick={() => setPreview(null)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
          <div className="print-area bg-white p-4 rounded-lg">
            <ChallanDocument challan={preview} />
          </div>
        </div>
      </div>,
      document.body
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">New Delivery Challan</h1>
        </div>

        {/* Header fields */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Challan No (auto)</label>
            <input className="input" value={challanNumber} onChange={e => setChallanNumber(e.target.value)} placeholder="DC .../26-27" />
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
          <div>
            <label className="label">Purpose</label>
            <select className="input" value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Dispatch / Transport Details</p>
          </div>
          <div><label className="label">Date Of Supply</label><input type="date" className="input" value={dateOfSupply} onChange={e => setDateOfSupply(e.target.value)} /></div>
          <div><label className="label">Place of Supply</label><input className="input" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Maharashtra" /></div>
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                  <th className="py-2 pr-2 w-14">Sr.No.</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2 w-28">HSN/SAC</th>
                  <th className="py-2 pr-2 w-24">Unit</th>
                  <th className="py-2 pr-2 w-20">Qty</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-1.5 pr-2 text-center text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input !py-1.5 !px-2" value={it.description}
                        onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Product / description" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input no-arrow !py-1.5 !px-2" value={it.hsnCode}
                        onChange={e => updateItem(idx, { hsnCode: e.target.value })} placeholder="85359090" />
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
                    <td className="py-1.5 text-center">
                      <button onClick={() => removeRow(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText size={16} />}
            {saving ? 'Generating...' : 'Generate Challan'}
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Delivery Challan</h1>
        <button onClick={startCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Challan</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {challans.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No delivery challans yet</p>
            <p className="text-sm">Click "New Challan" to generate your first delivery challan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  <th className="py-3 px-4">Challan No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill To</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">{c.challanNumber}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{c.billToName}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{c.purpose || 'Delivery'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleShareWhatsApp(c)} disabled={sharingId === c.id} title="Share on WhatsApp" className="hover:opacity-75 transition-opacity disabled:opacity-50">
                          {sharingId === c.id ? <RefreshCw size={18} className="animate-spin text-slate-400" /> : <FaWhatsapp size={18} color="#25D366" />}
                        </button>
                        <button onClick={() => shareViaEmail(c)} title="Share via Email" className="hover:opacity-75 transition-opacity"><SiGmail size={16} color="#EA4335" /></button>
                        <button onClick={() => setPreview(c)} title="View / Print" className="text-blue-500 hover:text-blue-600"><Eye size={17} /></button>
                        <button onClick={() => remove(c.id)} title="Delete" className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {captureChallan && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: '#fff' }}>
          <div ref={captureRef} style={{ width: 860, background: '#fff' }}>
            <ChallanDocument challan={captureChallan} />
          </div>
        </div>
      )}
    </div>
  )
}
