import React from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Plus, Trash2, Printer, FileText, ArrowLeft, RefreshCw, Eye, Package, PackageCheck, Pencil } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import {
  fetchChallans, fetchNextChallanNo, createChallan, updateChallan, deleteChallan,
  fetchSimpleChallans, fetchNextSimpleChallanNo, createSimpleChallan, updateSimpleChallan, deleteSimpleChallan,
} from '../api'
import ChallanDocument from '../components/ChallanDocument'
import SimpleChallanDocument from '../components/SimpleChallanDocument'

type ChallanType = 'simple' | 'tax'

const UNITS = ['EA', 'NOS', 'PCS', 'SET', 'MTR', 'RMT', 'SQM', 'SQF', 'KG', 'TON', 'LTR', 'BOX', 'ROLL', 'PKT', 'BAG', 'HRS', 'DAYS', 'LOT', 'LS', 'CUM']
const SIMPLE_UNITS = ["NO'S", 'NOS', 'EA', 'PCS', 'SET', 'MTR', 'LTR', 'KG', 'BOX', 'ROLL', 'PKT', 'BAG', 'CUM']
const PURPOSES = ['Delivery', 'Job Work', 'Sales Return', 'Sample', 'Exhibition', 'Other']

type TaxItem = { description: string; hsnCode: string; unit: string; quantity: string }
type SimpleItem = { description: string; unit: string; quantity: string }

const emptyTaxItem = (): TaxItem => ({ description: '', hsnCode: '', unit: 'EA', quantity: '' })
const emptySimpleItem = (): SimpleItem => ({ description: '', unit: "NO'S", quantity: '' })

function partyOf(c: any) { return c._type === 'simple' ? c.partyName : c.billToName }
function mobileOf(c: any) { return c._type === 'simple' ? '' : c.billToMobile }
function emailOf(c: any) { return c._type === 'simple' ? '' : c.billToEmail }

function buildShareMessage(challan: any) {
  const date = new Date(challan.date).toLocaleDateString('en-GB')
  const label = challan._type === 'tax' ? 'GST delivery challan' : 'delivery challan'
  return `Hi ${partyOf(challan) || ''},\n\nHere is your ${label} from We Work Constructions:\n\nChallan No: ${challan.challanNumber}\nDate: ${date}\n\nThank you!`
}
function buildWhatsAppUrl(challan: any) {
  const digits = String(mobileOf(challan) || '').replace(/\D/g, '')
  const phone = digits ? (digits.length === 10 ? `91${digits}` : digits) : ''
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildShareMessage(challan))}`
}
function shareViaEmail(challan: any) {
  const subject = `Delivery Challan ${challan.challanNumber} from We Work Constructions`
  const url = `mailto:${emailOf(challan) || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage(challan))}`
  window.location.href = url
}

// ── Create: Simple (pad-style) challan ─────────────────────────────────────────
function SimpleCreateForm({ editing, onDone, onCancel }: { editing?: any; onDone: () => void; onCancel: () => void }) {
  const [challanNumber, setChallanNumber] = React.useState(editing?.challanNumber || '')
  const [date, setDate] = React.useState(() => editing?.date ? new Date(editing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [vehicleNumber, setVehicleNumber] = React.useState(editing?.vehicleNumber ?? 'BY HAND')
  const [partyName, setPartyName] = React.useState(editing?.partyName || '')
  const [siteName, setSiteName] = React.useState(editing?.siteName || '')
  const [kindAttn, setKindAttn] = React.useState(editing?.kindAttn || '')
  const [items, setItems] = React.useState<SimpleItem[]>(
    editing?.items?.length
      ? editing.items.map((it: any) => ({ description: it.description || '', unit: it.unit || "NO'S", quantity: String(it.quantity ?? '') }))
      : [emptySimpleItem()]
  )
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (editing) return
    fetchNextSimpleChallanNo().then(n => setChallanNumber(n.challanNumber)).catch(() => {})
  }, [editing])

  function updateItem(idx: number, patch: Partial<SimpleItem>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addRow() { setItems(prev => [...prev, emptySimpleItem()]) }
  function removeRow(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)) }

  async function save() {
    if (!partyName.trim()) { toast.error('Party name is required'); return }
    const valid = items.filter(it => it.description.trim())
    if (valid.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      const payload = {
        challanNumber, date, vehicleNumber, partyName, siteName, kindAttn,
        items: valid.map((it, i) => ({ lineNo: i + 1, description: it.description, unit: it.unit, quantity: Number(it.quantity) || 0 })),
      }
      if (editing) await updateSimpleChallan(editing.id, payload)
      else await createSimpleChallan(payload)
      toast.success(editing ? 'Delivery challan updated!' : 'Delivery challan generated!')
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || (editing ? 'Failed to update delivery challan' : 'Failed to generate delivery challan'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{editing ? 'Edit Delivery Challan' : 'New Delivery Challan'}</h1>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Challan No (auto)</label>
          <input className="input" value={challanNumber} onChange={e => setChallanNumber(e.target.value)} placeholder="116" />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Vehicle No</label>
          <input className="input" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="BY HAND" />
        </div>

        <div className="md:col-span-2 border-t border-slate-200 dark:border-white/10 pt-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Party Details</p>
        </div>
        <div>
          <label className="label">Party Name *</label>
          <input className="input" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="M/S. Company Name" />
        </div>
        <div>
          <label className="label">Site</label>
          <input className="input" value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="SITE - LOCATION, CITY" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Kind Attn</label>
          <input className="input" value={kindAttn} onChange={e => setKindAttn(e.target.value)} placeholder="Mr. Name" />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Line Items</p>
          <button onClick={addRow} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-sm"><Plus size={14} /> Add Row</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <th className="py-2 pr-2 w-14">Sr no</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2 w-24">Unit</th>
                <th className="py-2 pr-2 w-20">Qty</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pr-2 text-center text-slate-500 dark:text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                  <td className="py-1.5 pr-2">
                    <input className="input !py-1.5 !px-2" value={it.description}
                      onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Material / description" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select className="input !py-1.5 !px-2" value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}>
                      {SIMPLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
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
          {saving ? (editing ? 'Saving...' : 'Generating...') : (editing ? 'Save Changes' : 'Generate Challan')}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

// ── Create: Tax / GST-style challan ─────────────────────────────────────────────
function TaxCreateForm({ editing, onDone, onCancel }: { editing?: any; onDone: () => void; onCancel: () => void }) {
  const [challanNumber, setChallanNumber] = React.useState(editing?.challanNumber || '')
  const [date, setDate] = React.useState(() => editing?.date ? new Date(editing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [billToName, setBillToName] = React.useState(editing?.billToName || '')
  const [billToAddress, setBillToAddress] = React.useState(editing?.billToAddress || '')
  const [billToGst, setBillToGst] = React.useState(editing?.billToGst || '')
  const [billToMobile, setBillToMobile] = React.useState(editing?.billToMobile || '')
  const [billToEmail, setBillToEmail] = React.useState(editing?.billToEmail || '')
  const [billToState, setBillToState] = React.useState(editing?.billToState || 'Maharashtra')
  const [sameAsBilling, setSameAsBilling] = React.useState(
    editing ? !(editing.shipToName || editing.shipToAddress || editing.shipToGst || editing.shipToState) : true
  )
  const [shipToName, setShipToName] = React.useState(editing?.shipToName || '')
  const [shipToAddress, setShipToAddress] = React.useState(editing?.shipToAddress || '')
  const [shipToGst, setShipToGst] = React.useState(editing?.shipToGst || '')
  const [shipToState, setShipToState] = React.useState(editing?.shipToState || '')
  const [poNumber, setPoNumber] = React.useState(editing?.poNumber || '')
  const [poDate, setPoDate] = React.useState(editing?.poDate || '')
  const [purpose, setPurpose] = React.useState(editing?.purpose || 'Delivery')
  const [dateOfSupply, setDateOfSupply] = React.useState(editing?.dateOfSupply ? new Date(editing.dateOfSupply).toISOString().slice(0, 10) : '')
  const [placeOfSupply, setPlaceOfSupply] = React.useState(editing?.placeOfSupply || 'Maharashtra')
  const [vehicleNumber, setVehicleNumber] = React.useState(editing?.vehicleNumber || '')
  const [transportMode, setTransportMode] = React.useState(editing?.transportMode || 'Road')
  const [siteName, setSiteName] = React.useState(editing?.siteName || '')
  const [deliveredThrough, setDeliveredThrough] = React.useState(editing?.deliveredThrough || '')
  const [items, setItems] = React.useState<TaxItem[]>(
    editing?.items?.length
      ? editing.items.map((it: any) => ({ description: it.description || '', hsnCode: it.hsnCode || '', unit: it.unit || 'EA', quantity: String(it.quantity ?? '') }))
      : [emptyTaxItem()]
  )
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (editing) return
    fetchNextChallanNo().then(n => setChallanNumber(n.challanNumber)).catch(() => {})
  }, [editing])

  function updateItem(idx: number, patch: Partial<TaxItem>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addRow() { setItems(prev => [...prev, emptyTaxItem()]) }
  function removeRow(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)) }

  async function save() {
    if (!billToName.trim()) { toast.error('Bill To name is required'); return }
    const valid = items.filter(it => it.description.trim())
    if (valid.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      const payload = {
        challanNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName: sameAsBilling ? '' : shipToName,
        shipToAddress: sameAsBilling ? '' : shipToAddress,
        shipToGst: sameAsBilling ? '' : shipToGst,
        shipToState: sameAsBilling ? '' : shipToState,
        poNumber, poDate, purpose,
        dateOfSupply: dateOfSupply || date, placeOfSupply,
        vehicleNumber, transportMode, siteName, deliveredThrough,
        items: valid.map((it, i) => ({ lineNo: i + 1, description: it.description, hsnCode: it.hsnCode, unit: it.unit, quantity: Number(it.quantity) || 0 })),
      }
      if (editing) await updateChallan(editing.id, payload)
      else await createChallan(payload)
      toast.success(editing ? 'Tax delivery challan updated!' : 'Tax delivery challan generated!')
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || (editing ? 'Failed to update delivery challan' : 'Failed to generate delivery challan'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{editing ? 'Edit Tax Delivery Challan' : 'New Tax Delivery Challan'}</h1>
      </div>

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
                  <td className="py-1.5 pr-2 text-center text-slate-500 dark:text-slate-400 font-medium tabular-nums">{idx + 1}</td>
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
          {saving ? (editing ? 'Saving...' : 'Generating...') : (editing ? 'Save Changes' : 'Generate Challan')}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

// ── Main page: unified list across both challan types ───────────────────────────
export default function DeliveryChallan() {
  const [view, setView] = React.useState<'list' | 'choose' | 'create-simple' | 'create-tax'>('list')
  const [challans, setChallans] = React.useState<any[]>([])
  const [preview, setPreview] = React.useState<any | null>(null)
  const [editingChallan, setEditingChallan] = React.useState<any | null>(null)
  const [captureChallan, setCaptureChallan] = React.useState<any | null>(null)
  const [sharingKey, setSharingKey] = React.useState<string | null>(null)
  const captureRef = React.useRef<HTMLDivElement>(null)

  async function loadList() {
    const [simpleRes, taxRes] = await Promise.allSettled([fetchSimpleChallans(), fetchChallans()])
    const simple = simpleRes.status === 'fulfilled' ? simpleRes.value.map((c: any) => ({ ...c, _type: 'simple' as ChallanType })) : []
    const tax = taxRes.status === 'fulfilled' ? taxRes.value.map((c: any) => ({ ...c, _type: 'tax' as ChallanType })) : []
    if (simpleRes.status === 'rejected' && taxRes.status === 'rejected') {
      toast.error('Failed to load delivery challans')
    }
    const merged = [...simple, ...tax].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setChallans(merged)
  }
  React.useEffect(() => { loadList() }, [])

  async function remove(c: any) {
    if (!confirm('Delete this delivery challan?')) return
    try {
      if (c._type === 'simple') await deleteSimpleChallan(c.id)
      else await deleteChallan(c.id)
      toast.success('Deleted')
      loadList()
    } catch { toast.error('Failed to delete') }
  }

  // Renders the challan off-screen and captures it as a PDF. We do NOT call
  // window.open()/navigator.share() here — both require a live user gesture, which is gone
  // by the time this async work (html2canvas + jsPDF) finishes, so browsers silently block
  // them. Instead we show a toast with a real <a> link; a genuine click on it is a fresh
  // user gesture that no popup blocker can touch.
  async function handleShareWhatsApp(challan: any) {
    const key = `${challan._type}-${challan.id}`
    setSharingKey(key)
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
      setSharingKey(null)
    }
  }

  function afterCreate() {
    setView('list')
    setEditingChallan(null)
    loadList()
  }

  function startEditChallan(c: any) {
    setEditingChallan(c)
    setPreview(null)
    setView(c._type === 'simple' ? 'create-simple' : 'create-tax')
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
            <div className="flex items-center gap-3">
              <button onClick={() => startEditChallan(preview)} className="btn-secondary flex items-center gap-2">
                <Pencil size={16} /> Edit
              </button>
              <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          </div>
          <div className="print-area bg-white p-4 rounded-lg">
            {preview._type === 'simple' ? <SimpleChallanDocument challan={preview} /> : <ChallanDocument challan={preview} />}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ----- CREATE FORMS -----
  if (view === 'create-simple') return <SimpleCreateForm editing={editingChallan} onDone={afterCreate} onCancel={() => { setEditingChallan(null); setView('list') }} />
  if (view === 'create-tax') return <TaxCreateForm editing={editingChallan} onDone={afterCreate} onCancel={() => { setEditingChallan(null); setView('list') }} />

  // ----- TYPE CHOOSER -----
  if (view === 'choose') {
    return (
      <div className="space-y-5 max-w-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">New Delivery Challan</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setView('create-simple')}
            className="card text-left hover:shadow-md transition-shadow flex flex-col gap-2 !p-5">
            <Package size={22} className="text-blue-600" />
            <p className="font-bold text-slate-800 dark:text-white">Simple Challan</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Plain material slip — party details, description, qty, unit. No GST.</p>
          </button>
          <button onClick={() => setView('create-tax')}
            className="card text-left hover:shadow-md transition-shadow flex flex-col gap-2 !p-5">
            <PackageCheck size={22} className="text-blue-600" />
            <p className="font-bold text-slate-800 dark:text-white">Tax Challan (GST)</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Full GST-style document — HSN codes, consignee, PO reference.</p>
          </button>
        </div>
      </div>
    )
  }

  // ----- LIST -----
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Delivery Challan</h1>
        <button onClick={() => { setEditingChallan(null); setView('choose') }} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Challan</button>
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
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map(c => {
                  const key = `${c._type}-${c.id}`
                  return (
                    <tr key={key} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">{c.challanNumber}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{partyOf(c)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c._type === 'tax' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                          {c._type === 'tax' ? 'Tax / GST' : 'Simple'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleShareWhatsApp(c)} disabled={sharingKey === key} title="Share on WhatsApp" className="hover:opacity-75 transition-opacity disabled:opacity-50">
                            {sharingKey === key ? <RefreshCw size={18} className="animate-spin text-slate-400" /> : <FaWhatsapp size={18} color="#25D366" />}
                          </button>
                          <button onClick={() => shareViaEmail(c)} title="Share via Email" className="hover:opacity-75 transition-opacity"><SiGmail size={16} color="#EA4335" /></button>
                          <button onClick={() => setPreview(c)} title="View / Print" className="text-blue-500 hover:text-blue-600"><Eye size={17} /></button>
                          <button onClick={() => startEditChallan(c)} title="Edit" className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                          <button onClick={() => remove(c)} title="Delete" className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {captureChallan && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: '#fff' }}>
          <div ref={captureRef} style={{ width: 860, background: '#fff' }}>
            {captureChallan._type === 'simple' ? <SimpleChallanDocument challan={captureChallan} /> : <ChallanDocument challan={captureChallan} />}
          </div>
        </div>
      )}
    </div>
  )
}
