import React from 'react'

// Fixed company / supplier details (We Work Constructions)
export const COMPANY = {
  name: 'WE WORK CONSTRUCTIONS',
  address: ['Gat No 179, Flat No B-507,', 'Nisarg Raghavendra Soceity.', 'Moshi Pune 412105'],
  mobile: '+91 7588077493',
  altMobile: '',
  gst: '27BYOPD3282Q1ZP',
  gstStateCode: '27',
  email: 'weworkconstructions@gmail.com',
  altEmail: '',
  pan: 'BYOPD3282Q',
  udyam: '',
  bankAccount: '50200087489444',
  bankName: 'HDFC BANK.',
  bankBranch: 'DEHU ROAD MOSHI.',
  bankIfsc: 'HDFC0008976',
}

const inr = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function CompanyLogo() {
  return (
    <img src="/logo.png" alt="We Work Constructions logo" width={64} height={64}
      style={{ objectFit: 'contain', flexShrink: 0 }} />
  )
}

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
      <div style={boxValue}>{value || ' '}</div>
    </div>
  )
}

// Always append 5 blank rows after the real items, matching the look of a
// pre-printed pad — regardless of how many items are on the invoice.
const EXTRA_ROWS = 5

export default function InvoiceDocument({ bill }: { bill: any }) {
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const items: any[] = bill.items || []
  const blankRows = EXTRA_ROWS
  const gstRate = bill.gstRate || 0

  const shipToName = bill.shipToName || bill.billToName
  const shipToAddress = bill.shipToAddress || bill.billToAddress
  const shipToGst = bill.shipToGst || bill.billToGst
  const shipToState = bill.shipToState || bill.billToState

  const cell: React.CSSProperties = { border: '1px solid #000', padding: '4px 4px', fontSize: 11, verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }
  // Numbers/codes must never mid-value wrap (that's what caused "10,349.55" to split across
  // three lines) — only the free-text description column benefits from word-break. `overflow:
  // hidden` is a backstop: without it, a value wider than its fixed column (e.g. a large SGST/
  // Total amount) doesn't wrap or shrink, it just pokes out past the table's right edge — and
  // since that edge sits at the printable page boundary, the overflow gets silently cut off in
  // both window.print() and the html2canvas-based PDF download instead of just being ugly on
  // screen. Clipping it here keeps the layout intact; column widths below are sized generously
  // enough that realistic invoice amounts never actually reach this limit.
  const numCell: React.CSSProperties = { ...cell, whiteSpace: 'nowrap', overflow: 'hidden' }
  const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2', whiteSpace: 'nowrap' }

  return (
    <div className="invoice-doc" style={{
      width: '100%', maxWidth: 860, boxSizing: 'border-box', margin: '0 auto', background: '#fff', color: '#000',
      fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #000', padding: 0,
    }}>
      {/* Supplier + invoice meta */}
      <div style={{ display: 'flex' }}>
        {/* Supplier block */}
        <div style={{ flex: 1.3, padding: '12px 14px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <CompanyLogo />
            <div style={{ fontFamily: "'Rye', cursive", fontSize: 34, lineHeight: 1.1, color: '#000000' }}>{COMPANY.name}</div>
          </div>
          {COMPANY.address.map((l, i) => <div key={i} style={{ fontSize: 13 }}>{l}</div>)}
          <div style={{ fontSize: 13, marginTop: 3 }}>📞 {COMPANY.mobile}{COMPANY.altMobile ? `, ${COMPANY.altMobile}` : ''} &nbsp; ✉ {COMPANY.email}</div>
          <div style={{ fontSize: 13, marginTop: 3 }}>
            <strong>GSTIN :</strong> {COMPANY.gst}
            <span style={stateCodeBadge}>State Code : {COMPANY.gstStateCode}</span>
          </div>
          <div style={{ fontSize: 13 }}><strong>PAN :</strong> {COMPANY.pan}</div>
          {COMPANY.altEmail && <div style={{ fontSize: 13 }}><strong>Email :</strong> {COMPANY.altEmail}</div>}
          {COMPANY.udyam && <div style={{ fontSize: 13 }}><strong>UDYAM :</strong> {COMPANY.udyam}</div>}
        </div>

        {/* Invoice meta grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #000' }}>
          <MetaCell label="Invoice Number" value={bill.invoiceNumber} />
          <MetaCell label="Invoice Date" value={fmtDate(bill.date)} />
          <MetaCell label="Place of Supply" value={bill.placeOfSupply} />
          <MetaCell label="Date Of Supply" value={fmtDate(bill.dateOfSupply || bill.date)} />
          <MetaCell label={bill.poNumberLabel || 'PO Number'} value={bill.poNumber} />
          <MetaCell label={bill.poDateLabel || 'PO Date'} value={bill.poDate} />
          <div style={{ gridColumn: '1 / span 3', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <MetaCell label="Vehicle Number" value={bill.vehicleNumber} />
            <MetaCell label="Transportation Mode" value={bill.transportMode} />
          </div>
          <div style={{ gridColumn: '1 / span 3', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <MetaCell label="Place Of Supply (Site)" value={bill.siteName} />
            <MetaCell label="Delivered Through" value={bill.deliveredThrough} />
          </div>
        </div>
      </div>

      {/* Receiver / Consignee */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #000', fontSize: 11.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Details of Receiver | Billed to</div>
          <div style={{ fontWeight: 700 }}>{bill.billToName}</div>
          {(bill.billToAddress || '').split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
          {bill.billToMobile && <div>Mobile: {bill.billToMobile}</div>}
          <div>Email: {bill.billToEmail || 'None'}</div>
          {bill.billToGst && <div>GSTIN: {bill.billToGst}<span style={stateCodeBadge}>State Code : {bill.billToGst.slice(0, 2)}</span></div>}
          {bill.billToState && <div>State: {bill.billToState}</div>}
        </div>
        <div style={{ flex: 1, padding: '8px 12px', fontSize: 11.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Details of Consignee | Shipped to</div>
          <div style={{ fontWeight: 700 }}>{shipToName}</div>
          {(shipToAddress || '').split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
          {shipToGst && <div>GSTIN: {shipToGst}<span style={stateCodeBadge}>State Code : {shipToGst.slice(0, 2)}</span></div>}
          {shipToState && <div>State: {shipToState}</div>}
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '3%' }} rowSpan={2}>Sr.<br />No.</th>
            <th style={{ ...th, textAlign: 'left', whiteSpace: 'normal' }} rowSpan={2}>Name of Product</th>
            <th style={{ ...th, width: '6%' }} rowSpan={2}>HSN/SAC</th>
            <th style={{ ...th, width: '4%' }} rowSpan={2}>QTY</th>
            <th style={{ ...th, width: '4%' }} rowSpan={2}>Unit</th>
            <th style={{ ...th, width: '8%' }} rowSpan={2}>Rate</th>
            <th style={{ ...th, width: '11%' }} rowSpan={2}>Taxable<br />Value</th>
            <th style={{ ...th, width: '13%' }} colSpan={2}>CGST</th>
            <th style={{ ...th, width: '13%' }} colSpan={2}>SGST</th>
            <th style={{ ...th, width: '14%' }} rowSpan={2}>Total</th>
          </tr>
          <tr>
            <th style={{ ...th, width: '4%' }}>Rate</th>
            <th style={{ ...th, width: '9%' }}>Amount</th>
            <th style={{ ...th, width: '4%' }}>Rate</th>
            <th style={{ ...th, width: '9%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const cgstAmt = +(it.amount * gstRate / 100).toFixed(2)
            const sgstAmt = +(it.amount * gstRate / 100).toFixed(2)
            const lineTotal = it.amount + cgstAmt + sgstAmt
            return (
              <tr key={i}>
                <td style={{ ...numCell, textAlign: 'center' }}>{it.lineNo || i + 1}</td>
                <td style={cell}>{it.description}</td>
                <td style={{ ...numCell, textAlign: 'center' }}>{it.hsnCode}</td>
                <td style={{ ...numCell, textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ ...numCell, textAlign: 'center' }}>{it.unit}</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{inr(it.unitPrice)}</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{inr(it.amount)}</td>
                <td style={{ ...numCell, textAlign: 'center' }}>{gstRate}%</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{inr(cgstAmt)}</td>
                <td style={{ ...numCell, textAlign: 'center' }}>{gstRate}%</td>
                <td style={{ ...numCell, textAlign: 'right' }}>{inr(sgstAmt)}</td>
                <td style={{ ...numCell, textAlign: 'right', fontWeight: 700 }}>{inr(lineTotal)}</td>
              </tr>
            )
          })}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...cell, height: 24 }}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals — one summary row, not a stacked box */}
      <div style={{ display: 'flex', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #000' }}>
          <div style={{ fontSize: 11, color: '#333' }}>Taxable Amount</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{inr(bill.subtotal)}</div>
        </div>
        <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #000' }}>
          <div style={{ fontSize: 11, color: '#333' }}>Add : CGST</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{inr(bill.cgst)}</div>
        </div>
        <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #000' }}>
          <div style={{ fontSize: 11, color: '#333' }}>Add : SGST</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{inr(bill.sgst)}</div>
        </div>
        <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center', background: '#f2f2f2' }}>
          <div style={{ fontSize: 11, color: '#333' }}>TOTAL</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Rs. {inr(bill.total)}</div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRight: '1px solid #000' }}>
          Total Amount in words :- {bill.amountInWords}
        </div>
        <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
          Total &nbsp; Rs. {inr(bill.total)}
        </div>
      </div>

      {/* Bank + receiver sign + authorised signatory */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #000', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🏦 Bank and Payment Details</div>
          <div>Account Name &nbsp; <strong>{COMPANY.name}</strong></div>
          <div>Account No. &nbsp; <strong>{COMPANY.bankAccount}</strong></div>
          <div>IFSC Code &nbsp; <strong>{COMPANY.bankIfsc}</strong></div>
          <div>Bank Name &nbsp; <strong>{COMPANY.bankName}</strong></div>
          <div>Branch Name &nbsp; <strong>{COMPANY.bankBranch}</strong></div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #000', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Goods Received In Good Condition</div>
          <div>&nbsp;</div>
          <div>&nbsp;</div>
          <div>&nbsp;</div>
          <div>&nbsp;</div>
          <div>Receiver's Signature: ____________________</div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>
          <div>Certified that the particulars given above are true and correct for,</div>
          <img src="/weworksign.jpeg" alt="Authorised signatory" style={{ width: 230, height: 'auto', marginTop: 5, marginLeft: 'auto', display: 'block' }} />
        </div>
      </div>

      {/* Terms */}
      <div style={{ padding: '10px 14px', fontSize: 12.5 }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>Terms And Conditions</div>
        <div>100% ADVANCE PAYMENT BEFORE DELIVERY.</div>
        <div>GST EXTRA.</div>
        <div>PACKING CHARGES EXTRA.</div>
        <div>TRANSPORT CHARGES EXTRA.</div>
      </div>

      <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12.5, borderTop: '1px solid #000', padding: '6px 0' }}>
        This is computer generated invoice
      </div>
    </div>
  )
}
