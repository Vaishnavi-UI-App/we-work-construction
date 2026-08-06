import React from 'react'
import { COMPANY } from './InvoiceDocument'

const fmt = (n: number) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const cell: React.CSSProperties = { border: '1px solid #000', padding: '6px 8px', fontSize: 12, verticalAlign: 'top' }
const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2' }

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
      {/* Letterhead */}
      <div style={{ borderBottom: '1px solid #000', padding: '12px 16px' }}>
        <div style={{ fontFamily: "'Rye', cursive", fontSize: 30, lineHeight: 1.1, color: '#000' }}>{COMPANY.name}</div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>{COMPANY.address.join(' ')}</div>
        <div style={{ fontSize: 12.5, marginTop: 2 }}>Mobile :- {COMPANY.mobile} &nbsp; Email :- {COMPANY.email}</div>
        <div style={{ fontSize: 12.5, marginTop: 2 }}><strong>GSTIN :</strong> {COMPANY.gst}</div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, padding: '8px 0', borderBottom: '1px solid #000' }}>
        {single ? `Account Statement — ${single.customerName}` : 'Customer Ledger Report'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11.5, padding: '4px 0', color: '#555' }}>Generated on {generatedOn}</div>

      {single ? (
        <>
          {/* Single-customer summary */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Billed</th>
                <th style={th}>Paid</th>
                <th style={th}>Due</th>
                <th style={th}>Advance</th>
                <th style={th}>Mobile</th>
                <th style={th}>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(single.billed)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(single.paid)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(single.due)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(single.advance)}</td>
                <td style={cell}>{single.mobile || '—'}</td>
                <td style={cell}>{single.email || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment history */}
          <div style={{ padding: '10px 14px 4px', fontWeight: 700, fontSize: 13 }}>Payment History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Amount</th>
                <th style={th}>Method</th>
                <th style={th}>Reference</th>
                <th style={{ ...th, textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...cell, textAlign: 'center' }}>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{fmt(p.amount)}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{p.method || '—'}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{p.reference || '—'}</td>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Customer</th>
              <th style={th}>Billed</th>
              <th style={th}>Paid</th>
              <th style={th}>Due</th>
              <th style={th}>Advance</th>
              <th style={th}>Mobile</th>
              <th style={th}>Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c: any, i: number) => (
              <tr key={i}>
                <td style={cell}>{c.customerName}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(c.billed)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(c.paid)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(c.due)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(c.advance)}</td>
                <td style={cell}>{c.mobile || '—'}</td>
                <td style={cell}>{c.email || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...cell, fontWeight: 700 }}>Total</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.billed || 0), 0))}</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.paid || 0), 0))}</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.due || 0), 0))}</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{fmt(rows.reduce((s, c) => s + (c.advance || 0), 0))}</td>
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
