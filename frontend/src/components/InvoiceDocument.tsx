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

export default function InvoiceDocument({ bill }: { bill: any }) {
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const items: any[] = bill.items || []
  const gstRate = bill.gstRate || 0

  const shipToName = bill.shipToName || bill.billToName
  const shipToAddress = bill.shipToAddress || bill.billToAddress
  const shipToGst = bill.shipToGst || bill.billToGst
  const shipToState = bill.shipToState || bill.billToState

  const cell: React.CSSProperties = { border: '1px solid #000', padding: '5px 7px', fontSize: 13, verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }
  const th: React.CSSProperties = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f2f2f2' }

  return (
    <div style={{
      width: 860, margin: '0 auto', background: '#fff', color: '#000',
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
          <MetaCell label="Reverse Charge" value={bill.reverseCharge || 'NO'} />
          <MetaCell label="PO Number" value={bill.poNumber} />
          <MetaCell label="PO Date" value={bill.poDate} />
          <MetaCell label="Vehicle Number" value={bill.vehicleNumber} />
          <MetaCell label="Transportation Mode" value={bill.transportMode} />
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
            <th style={{ ...th, width: 28 }} rowSpan={2}>Sr.<br />No.</th>
            <th style={{ ...th, textAlign: 'left' }} rowSpan={2}>Name of Product</th>
            <th style={{ ...th, width: 60 }} rowSpan={2}>HSN/SAC</th>
            <th style={{ ...th, width: 34 }} rowSpan={2}>QTY</th>
            <th style={{ ...th, width: 34 }} rowSpan={2}>Unit</th>
            <th style={{ ...th, width: 55 }} rowSpan={2}>Rate</th>
            <th style={{ ...th, width: 68 }} rowSpan={2}>Taxable<br />Value</th>
            <th style={{ ...th, width: 90 }} colSpan={2}>CGST</th>
            <th style={{ ...th, width: 90 }} colSpan={2}>SGST</th>
            <th style={{ ...th, width: 78 }} rowSpan={2}>Total</th>
          </tr>
          <tr>
            <th style={{ ...th, width: 40 }}>Rate</th>
            <th style={{ ...th, width: 50 }}>Amount</th>
            <th style={{ ...th, width: 40 }}>Rate</th>
            <th style={{ ...th, width: 50 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const cgstAmt = +(it.amount * gstRate / 100).toFixed(2)
            const sgstAmt = +(it.amount * gstRate / 100).toFixed(2)
            const lineTotal = it.amount + cgstAmt + sgstAmt
            return (
              <tr key={i}>
                <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
                <td style={cell}>{it.description}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{it.hsnCode}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{it.unit}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{inr(it.unitPrice)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{inr(it.amount)}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{gstRate}%</td>
                <td style={{ ...cell, textAlign: 'right' }}>{inr(cgstAmt)}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{gstRate}%</td>
                <td style={{ ...cell, textAlign: 'right' }}>{inr(sgstAmt)}</td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>Rs. {inr(lineTotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
        <table style={{ width: 260, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, textAlign: 'right' }}>Taxable Amount</td>
              <td style={{ ...cell, width: 100, textAlign: 'right' }}>{inr(bill.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: 'right' }}>Add : CGST</td>
              <td style={{ ...cell, textAlign: 'right' }}>{inr(bill.cgst)}</td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: 'right' }}>Add : SGST</td>
              <td style={{ ...cell, textAlign: 'right' }}>{inr(bill.sgst)}</td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>Rs. {inr(bill.total)}</td>
            </tr>
          </tbody>
        </table>
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

      {/* Bank + signature */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #000', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🏦 Bank and Payment Details</div>
          <div>Account Name &nbsp; <strong>{COMPANY.name}</strong></div>
          <div>Account No. &nbsp; <strong>{COMPANY.bankAccount}</strong></div>
          <div>IFSC Code &nbsp; <strong>{COMPANY.bankIfsc}</strong></div>
          <div>Bank Name &nbsp; <strong>{COMPANY.bankName}</strong></div>
          <div>Branch Name &nbsp; <strong>{COMPANY.bankBranch}</strong></div>
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
