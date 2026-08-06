import React from 'react'
import { COMPANY } from './InvoiceDocument'

// Minimum number of item rows to render (blank rows fill out the rest), matching
// the look of the company's pre-printed paper challan pad.
const MIN_ROWS = 10

function CompanyLogo() {
  return (
    <img src="/logo.png" alt="We Work Constructions logo" width={56} height={56}
      style={{ objectFit: 'contain', flexShrink: 0 }} />
  )
}

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
  const blankRows = Math.max(0, MIN_ROWS - items.length)

  const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2' }
  const numCell: React.CSSProperties = { ...cell, textAlign: 'center', whiteSpace: 'nowrap' }

  return (
    <div className="invoice-doc" style={{
      width: '100%', maxWidth: 860, boxSizing: 'border-box', margin: '0 auto', background: '#fff', color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #000', padding: 0,
    }}>
      {/* Letterhead */}
      <div style={{ borderBottom: '1px solid #000', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CompanyLogo />
            <div style={{ fontFamily: "'Rye', cursive", fontSize: 30, lineHeight: 1.1, color: '#000' }}>{COMPANY.name}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12.5, lineHeight: 1.5 }}>
            <div>{COMPANY.address.join(' ')}</div>
            <div>Mobile :- {COMPANY.mobile}</div>
            <div>GST No- : {COMPANY.gst}</div>
            <div>Email :- {COMPANY.email}</div>
          </div>
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

      {/* Footer: checked by / signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ ...cell, height: 90 }}>Checked by</div>
        <div style={{ ...cell, textAlign: 'right' }}>
          <div>FOR WE WORK CONSTRUCTIONS,</div>
          <img src="/weworksign.jpeg" alt="Authorised signatory" style={{ width: 190, height: 'auto', marginTop: 4, marginLeft: 'auto', display: 'block' }} />
          <div style={{ fontSize: 12 }}>Proprietor</div>
        </div>
      </div>
    </div>
  )
}
