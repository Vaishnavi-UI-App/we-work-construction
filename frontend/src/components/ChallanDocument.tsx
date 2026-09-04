import React from 'react'
import { COMPANY } from './InvoiceDocument'

// Reusable bordered cell styles shared across the document's tables/grids
const box: React.CSSProperties = { border: '1px solid #000', padding: '5px 8px', fontSize: 14 }
const boxLabel: React.CSSProperties = { fontSize: 12, color: '#333' }
const boxValue: React.CSSProperties = { fontWeight: 700, fontSize: 14 }
const stateCodeBadge: React.CSSProperties = {
  display: 'inline-block', border: '1px solid #000', borderRadius: 3,
  padding: '0 5px', fontSize: 12.5, marginLeft: 6, fontWeight: 400,
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={box}>
      <div style={boxLabel}>{label}</div>
      <div style={boxValue}>{value || ' '}</div>
    </div>
  )
}

// Always append 5 blank rows after the real items, matching the look of a
// pre-printed pad — regardless of how many items are on the challan.
const EXTRA_ROWS = 5

export default function ChallanDocument({ challan }: { challan: any }) {
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const items: any[] = challan.items || []
  const blankRows = EXTRA_ROWS

  const shipToName = challan.shipToName || challan.billToName
  const shipToAddress = challan.shipToAddress || challan.billToAddress
  const shipToGst = challan.shipToGst || challan.billToGst
  const shipToState = challan.shipToState || challan.billToState

  const cell: React.CSSProperties = { border: '1px solid #000', padding: '4px 5px', fontSize: 12, verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }
  const numCell: React.CSSProperties = { ...cell, whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2', whiteSpace: 'nowrap' }

  return (
    <div className="invoice-doc" style={{
      width: '100%', maxWidth: 860, boxSizing: 'border-box', margin: '0 auto', background: '#fff', color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #000', padding: 0,
    }}>
      {/* Supplier + challan meta */}
      <div style={{ display: 'flex' }}>
        {/* Supplier block */}
        <div style={{ flex: 1.3, padding: '12px 14px', borderRight: '1px solid #000', borderBottom: '1px solid #000', background: '#fce8d5' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.5, color: '#e07b1e', fontFamily: 'Arial, Helvetica, sans-serif', marginBottom: 6 }}>
            {COMPANY.name}
          </div>
          {COMPANY.address.map((l, i) => <div key={i} style={{ fontSize: 13 }}>{l}</div>)}
          <div style={{ fontSize: 13, marginTop: 3 }}>📞 {COMPANY.mobile}{COMPANY.altMobile ? `, ${COMPANY.altMobile}` : ''} &nbsp; ✉ {COMPANY.email}</div>
          <div style={{ fontSize: 13, marginTop: 3 }}>
            <strong>GSTIN :</strong> {COMPANY.gst}
            <span style={stateCodeBadge}>State Code : {COMPANY.gstStateCode}</span>
          </div>
          <div style={{ fontSize: 13 }}><strong>PAN :</strong> {COMPANY.pan}</div>
        </div>

        {/* Challan meta grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #000' }}>
          <MetaCell label="Challan Number" value={challan.challanNumber} />
          <MetaCell label="Challan Date" value={fmtDate(challan.date)} />
          <MetaCell label="Place of Supply" value={challan.placeOfSupply} />
          <MetaCell label="Date Of Supply" value={fmtDate(challan.dateOfSupply || challan.date)} />
          <MetaCell label="Purpose" value={challan.purpose || 'Delivery'} />
          <MetaCell label={challan.poNumberLabel || 'PO Number'} value={challan.poNumber} />
          <MetaCell label={challan.poDateLabel || 'PO Date'} value={challan.poDate} />
          <MetaCell label="Vehicle Number" value={challan.vehicleNumber} />
          <MetaCell label="Transportation Mode" value={challan.transportMode} />
          <div style={{ gridColumn: '1 / span 3', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <MetaCell label="Place Of Supply (Site)" value={challan.siteName} />
            <MetaCell label="Delivered Through" value={challan.deliveredThrough} />
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, padding: '8px 0', borderBottom: '1px solid #000', color: '#b91c1c' }}>
        Delivery Challan
      </div>

      {/* Receiver / Consignee */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #000', fontSize: 11.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Details of Receiver | Billed to</div>
          <div style={{ fontWeight: 700 }}>{challan.billToName}</div>
          {(challan.billToAddress || '').split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
          {challan.billToMobile && <div>Mobile: {challan.billToMobile}</div>}
          <div>Email: {challan.billToEmail || 'None'}</div>
          {challan.billToGst && <div>GSTIN: {challan.billToGst}<span style={stateCodeBadge}>State Code : {challan.billToGst.slice(0, 2)}</span></div>}
          {challan.billToState && <div>State: {challan.billToState}</div>}
        </div>
        <div style={{ flex: 1, padding: '8px 12px', fontSize: 11.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Details of Consignee | Shipped to</div>
          <div style={{ fontWeight: 700 }}>{shipToName}</div>
          {(shipToAddress || '').split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
          {shipToGst && <div>GSTIN: {shipToGst}<span style={stateCodeBadge}>State Code : {shipToGst.slice(0, 2)}</span></div>}
          {shipToState && <div>State: {shipToState}</div>}
        </div>
      </div>

      {/* Items table — quantities only, no pricing/tax (this isn't a bill) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '6%' }}>Sr.<br />No.</th>
            <th style={{ ...th, textAlign: 'left', whiteSpace: 'normal' }}>Name of Product</th>
            <th style={{ ...th, width: '18%' }}>HSN/SAC</th>
            <th style={{ ...th, width: '15%' }}>Quantity</th>
            <th style={{ ...th, width: '15%' }}>Unit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={{ ...numCell, textAlign: 'center' }}>{i + 1}</td>
              <td style={cell}>{it.description}</td>
              <td style={{ ...numCell, textAlign: 'center' }}>{it.hsnCode}</td>
              <td style={{ ...numCell, textAlign: 'center' }}>{it.quantity}</td>
              <td style={{ ...numCell, textAlign: 'center' }}>{it.unit}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...cell, height: 24 }}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bank + signature */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #000', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Goods Received In Good Condition</div>
          <div style={{ marginTop: 30 }}>Receiver's Signature: ____________________</div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>
          <div>Certified that the particulars given above are true and correct for,</div>
          <img src="/weworksign.jpeg" alt="Authorised signatory" style={{ width: 230, height: 'auto', marginTop: 5, marginLeft: 'auto', display: 'block' }} />
        </div>
      </div>

      {/* Terms */}
      <div style={{ padding: '10px 14px', fontSize: 12.5 }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>Terms And Conditions</div>
        <div>Goods once dispatched cannot be taken back unless authorised.</div>
        <div>This challan is not a tax invoice — no payment is due against it.</div>
      </div>

      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12.5, borderTop: '1px solid #000', padding: '6px 0' }}>
        This is a computer generated delivery challan
      </div>
    </div>
  )
}
