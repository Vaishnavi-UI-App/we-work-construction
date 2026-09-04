import React from 'react'
import { COMPANY } from './InvoiceDocument'

// Pad the table out to a reasonable minimum row count, matching the look of
// the company's pre-printed paper challan pad — but only as many blank rows
// as needed to reach it (capped at 5), so a challan with just a couple of
// items isn't left mostly empty space.
const MIN_TOTAL_ROWS = 6
const MAX_EXTRA_ROWS = 5

const cell: React.CSSProperties = { border: '1px solid #000', padding: '5px 8px', fontSize: 13, verticalAlign: 'top' }
const label: React.CSSProperties = { fontSize: 12, color: '#333' }
const value: React.CSSProperties = { fontWeight: 700, fontSize: 13.5 }

function MetaRow({ text, val }: { text: string; val: React.ReactNode }) {
  return (
    <div style={{ ...cell, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <span style={label}>{text}</span>
      <span style={value}>{val || ' '}</span>
    </div>
  )
}

export default function SimpleChallanDocument({ challan }: { challan: any }) {
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : ''
  const items: any[] = challan.items || []
  const blankRows = Math.min(MAX_EXTRA_ROWS, Math.max(0, MIN_TOTAL_ROWS - items.length))

  const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2' }
  const numCell: React.CSSProperties = { ...cell, textAlign: 'center', whiteSpace: 'nowrap' }

  return (
    <div className="invoice-doc" style={{
      width: '100%', maxWidth: 860, boxSizing: 'border-box', margin: '0 auto', background: '#fff', color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #000', padding: 0,
    }}>
      {/* Letterhead */}
      <div style={{ borderBottom: '1px solid #000', padding: '12px 16px', background: '#fce8d5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'nowrap' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.5, color: '#e07b1e', fontFamily: 'Arial, Helvetica, sans-serif', flexShrink: 0 }}>
          {COMPANY.name}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, lineHeight: 1.5, flexShrink: 0 }}>
          <div>Office :- {COMPANY.address.slice(0, -1).join(' ')}</div>
          <div>{COMPANY.address[COMPANY.address.length - 1]}</div>
          <div>Mobile :- {COMPANY.mobile}</div>
          <div>GST No- : {COMPANY.gst}</div>
          <div>Email :- {COMPANY.email}</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, padding: '8px 0', borderBottom: '1px solid #000', color: '#b91c1c' }}>
        Delivery Challan
      </div>

      {/* Party details + challan meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
        <div style={{ ...cell, gridRow: '1 / span 3' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>PARTY DETAILS:-</div>
          <div style={{ fontWeight: 700 }}>M/S. {challan.partyName}</div>
          {challan.siteName && <div>SITE :- {challan.siteName}</div>}
          {challan.kindAttn && <div style={{ marginTop: 6 }}>Kind Att :- {challan.kindAttn}</div>}
        </div>
        <MetaRow text="Challan No:-" val={challan.challanNumber} />
        <MetaRow text="Date:-" val={fmtDate(challan.date)} />
        <MetaRow text="Vehical no:" val={challan.vehicleNumber} />
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '8%' }}>Sr no</th>
            <th style={{ ...th, textAlign: 'left' }}>Description</th>
            <th style={{ ...th, width: '16%' }}>Qty</th>
            <th style={{ ...th, width: '16%' }}>Unit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={numCell}>{i + 1}</td>
              <td style={cell}>{it.description}</td>
              <td style={numCell}>{it.quantity}</td>
              <td style={numCell}>{it.unit}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...cell, height: 26 }}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Goods received + signature */}
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
