import React from 'react'
import { COMPANY } from './InvoiceDocument'

const fmt = (n: number) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const cell: React.CSSProperties = { border: '1px solid #000', padding: '6px 6px', fontSize: 11, verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }
// Numbers/dates must never wrap mid-value; `overflow: hidden` is a backstop so a
// value wider than its fixed column clips inside its own cell instead of
// bleeding past the table's right edge and getting cut off by the page boundary
// (in both window.print() and the html2canvas-based PDF capture).
const numCell: React.CSSProperties = { ...cell, whiteSpace: 'nowrap', overflow: 'hidden' }
const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2', whiteSpace: 'nowrap' }

// Either the full customer-wise ledger (all customers), or one customer's
// ledger plus their full payment history — same shape the CSV export uses.
export default function BankingReportDocument({ rows, single, payments }: {
  rows: any[]; single?: any; payments?: any[]
}) {
  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="invoice-doc" style={{
      width: '100%', maxWidth: 860, boxSizing: 'border-box', margin: '0 auto', background: '#fff', color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #000', padding: 0,
    }}>
      {/* Letterhead — matches the orange band used on the invoice/challan documents */}
      <div style={{ borderBottom: '1px solid #000', padding: '12px 16px', background: '#fce8d5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'nowrap' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.5, color: '#e07b1e', fontFamily: 'Arial, Helvetica, sans-serif', flexShrink: 0 }}>
          {COMPANY.name}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, lineHeight: 1.5, flexShrink: 0 }}>
          <div>{COMPANY.address.join(' ')}</div>
          <div>Mobile :- {COMPANY.mobile} &nbsp; Email :- {COMPANY.email}</div>
          <div><strong>GSTIN :</strong> {COMPANY.gst}</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, padding: '8px 0', borderBottom: '1px solid #000', color: '#b91c1c' }}>
        {single ? `Account Statement — ${single.customerName}` : 'Customer Ledger Report'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11.5, padding: '4px 0 8px', color: '#555', borderBottom: '1px solid #000' }}>Generated on {generatedOn}</div>

      {single ? (
        <>
          {/* Single-customer summary */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '18%' }}>Billed</th>
                <th style={{ ...th, width: '16%' }}>Paid</th>
                <th style={{ ...th, width: '16%' }}>Due</th>
                <th style={{ ...th, width: '16%' }}>Advance</th>
                <th style={{ ...th, width: '17%' }}>Mobile</th>
                <th style={{ ...th, width: '17%' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...numCell, textAlign: 'right' }}>{fmt(single.billed)}</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{fmt(single.paid)}</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{fmt(single.due)}</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{fmt(single.advance)}</td>
                <td style={cell}>{single.mobile || '—'}</td>
                <td style={cell}>{single.email || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment history */}
          <div style={{ padding: '10px 14px 4px', fontWeight: 700, fontSize: 13 }}>Payment History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '14%' }}>Date</th>
                <th style={{ ...th, width: '16%' }}>Amount</th>
                <th style={{ ...th, width: '14%' }}>Method</th>
                <th style={{ ...th, width: '16%' }}>Reference</th>
                <th style={{ ...th, textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...numCell, textAlign: 'center' }}>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ ...numCell, textAlign: 'right' }}>{fmt(p.amount)}</td>
                  <td style={{ ...numCell, textAlign: 'center' }}>{p.method || '—'}</td>
                  <td style={{ ...numCell, textAlign: 'center' }}>{p.reference || '—'}</td>
                  <td style={cell}>{p.notes || ''}</td>
                </tr>
              ))}
              {!(payments || []).length && (
                <tr><td colSpan={5} style={{ ...cell, textAlign: 'center', color: '#888' }}>No payments recorded</td></tr>
              )}
            </tbody>
          </table>
        </>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '19%', textAlign: 'left' }}>Customer</th>
              <th style={{ ...th, width: '15%' }}>Billed</th>
              <th style={{ ...th, width: '13%' }}>Paid</th>
              <th style={{ ...th, width: '13%' }}>Due</th>
              <th style={{ ...th, width: '13%' }}>Advance</th>
              <th style={{ ...th, width: '14%' }}>Mobile</th>
              <th style={{ ...th, width: '13%' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c: any, i: number) => {
              const rowBg = i % 2 === 1 ? { background: '#fafafa' } : undefined
              return (
                <tr key={i}>
                  <td style={{ ...cell, ...rowBg }}>{c.customerName}</td>
                  <td style={{ ...numCell, textAlign: 'right', ...rowBg }}>{fmt(c.billed)}</td>
                  <td style={{ ...numCell, textAlign: 'right', ...rowBg }}>{fmt(c.paid)}</td>
                  <td style={{ ...numCell, textAlign: 'right', ...rowBg }}>{fmt(c.due)}</td>
                  <td style={{ ...numCell, textAlign: 'right', ...rowBg }}>{fmt(c.advance)}</td>
                  <td style={{ ...cell, ...rowBg }}>{c.mobile || '—'}</td>
                  <td style={{ ...cell, ...rowBg }}>{c.email || '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...cell, fontWeight: 700 }}>Total</td>
              <td style={{ ...numCell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.billed || 0), 0))}</td>
              <td style={{ ...numCell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.paid || 0), 0))}</td>
              <td style={{ ...numCell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.due || 0), 0))}</td>
              <td style={{ ...numCell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.advance || 0), 0))}</td>
              <td style={cell}></td>
              <td style={cell}></td>
            </tr>
          </tfoot>
        </table>
      )}

      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, borderTop: '1px solid #000', padding: '6px 0', marginTop: 4 }}>
        This is a computer generated report
      </div>
    </div>
  )
}
