import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'

// ---- Indian-format number to words (rupees) ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10), o = n % 10
  return TENS[t] + (o ? ' ' + ONES[o] : '')
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100
  let out = ''
  if (h) out += ONES[h] + ' Hundred' + (rest ? ' ' : '')
  if (rest) out += twoDigits(rest)
  return out
}

export function numberToWords(amount: number): string {
  const rupees = Math.floor(amount)
  if (rupees === 0) return 'Zero Only'
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const hundred = rupees % 1000

  const parts: string[] = []
  if (crore) parts.push(threeDigits(crore) + ' Crore')
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand')
  if (hundred) parts.push(threeDigits(hundred))
  return parts.join(' ').replace(/\s+/g, ' ').trim().toUpperCase() + ' ONLY'
}

// Indian fiscal year for a date, e.g. 2026-07 -> "26-27"
function fiscalYear(d: Date): string {
  const y = d.getFullYear()
  const startYear = d.getMonth() >= 3 ? y : y - 1 // FY starts April (month index 3)
  const a = String(startYear).slice(-2)
  const b = String(startYear + 1).slice(-2)
  return `${a}-${b}`
}

export default function (prisma: PrismaClient) {
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  // Next auto invoice number
  router.get('/next-number', requirePermission('billing', 'canView'), async (_req: any, res) => {
    const count = await prisma.bill.count()
    const number = `WWC ${count + 1}/${fiscalYear(new Date())}`
    res.json({ invoiceNumber: number })
  })

  // Saved HSN/product suggestions
  router.get('/hsn', requirePermission('billing', 'canView'), async (_req: any, res) => {
    const codes = await prisma.hsnCode.findMany({ orderBy: { updatedAt: 'desc' } })
    res.json(codes)
  })

  // List bills
  router.get('/', requirePermission('billing', 'canView'), async (_req: any, res) => {
    const bills = await prisma.bill.findMany({
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(bills)
  })

  // Get one bill
  router.get('/:id', requirePermission('billing', 'canView'), async (req: any, res) => {
    const id = Number(req.params.id)
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    })
    if (!bill) return res.status(404).json({ error: 'Not found' })
    res.json(bill)
  })

  // Create bill
  router.post('/', requirePermission('billing', 'canAdd'), async (req: any, res) => {
    try {
      const {
        invoiceNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName, shipToAddress, shipToGst, shipToState,
        poNumber, poNumberLabel, poDate, poDateLabel, vendorCode, projectCode, projectName,
        dateOfSupply, placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
        gstRate, items,
      } = req.body

      if (!billToName) return res.status(400).json({ error: 'Bill To name is required' })
      const rawItems = Array.isArray(items) ? items.filter((it: any) => it && it.description) : []
      if (rawItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' })

      const rate = Number(gstRate) || 0
      const computedItems = rawItems.map((it: any, i: number) => {
        const quantity = Number(it.quantity) || 0
        const unitPrice = Number(it.unitPrice) || 0
        const amount = +(quantity * unitPrice).toFixed(2)
        return {
          lineNo: Number(it.lineNo) || (i + 1),
          description: String(it.description),
          hsnCode: it.hsnCode ? String(it.hsnCode) : null,
          unit: it.unit ? String(it.unit) : 'EA',
          quantity,
          unitPrice,
          amount,
        }
      })

      const subtotal = +computedItems.reduce((s, it) => s + it.amount, 0).toFixed(2)
      const cgst = +(subtotal * rate / 100).toFixed(2)
      const sgst = +(subtotal * rate / 100).toFixed(2)
      const total = +(subtotal + cgst + sgst).toFixed(2)
      const amountInWords = numberToWords(total) // floors to whole rupees, per invoice convention

      // Resolve invoice number (auto if missing / ensure unique)
      let finalNumber = (invoiceNumber && String(invoiceNumber).trim())
        || `WWC ${(await prisma.bill.count()) + 1}/${fiscalYear(new Date())}`
      let attempt = 0
      while (await prisma.bill.findUnique({ where: { invoiceNumber: finalNumber } })) {
        attempt++
        finalNumber = `WWC ${(await prisma.bill.count()) + 1 + attempt}/${fiscalYear(new Date())}`
      }

      const created = await prisma.bill.create({
        data: {
          invoiceNumber: finalNumber,
          date: date ? new Date(date) : new Date(),
          billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
          shipToName: shipToName || null, shipToAddress: shipToAddress || null,
          shipToGst: shipToGst || null, shipToState: shipToState || null,
          poNumber, poNumberLabel, poDate, poDateLabel, vendorCode, projectCode, projectName,
          dateOfSupply: dateOfSupply ? new Date(dateOfSupply) : (date ? new Date(date) : new Date()),
          placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
          gstRate: rate, subtotal, cgst, sgst, total, amountInWords,
          items: { create: computedItems },
        },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      })

      // Remember HSN codes (product -> code) for quick reuse
      for (const it of computedItems) {
        if (it.hsnCode && it.description) {
          try {
            await prisma.hsnCode.upsert({
              where: { description: it.description },
              update: { code: it.hsnCode, unit: it.unit, unitPrice: it.unitPrice },
              create: { description: it.description, code: it.hsnCode, unit: it.unit, unitPrice: it.unitPrice },
            })
          } catch (e) { /* ignore individual hsn save errors */ }
        }
      }

      res.json(created)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to create bill' })
    }
  })

  // Update bill — replaces line items and recomputes totals the same way creation does
  router.put('/:id', requirePermission('billing', 'canEdit'), async (req: any, res) => {
    try {
      const id = Number(req.params.id)
      const existing = await prisma.bill.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Not found' })

      const {
        invoiceNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName, shipToAddress, shipToGst, shipToState,
        poNumber, poNumberLabel, poDate, poDateLabel, vendorCode, projectCode, projectName,
        dateOfSupply, placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
        gstRate, items,
      } = req.body

      if (!billToName) return res.status(400).json({ error: 'Bill To name is required' })
      const rawItems = Array.isArray(items) ? items.filter((it: any) => it && it.description) : []
      if (rawItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' })

      const rate = Number(gstRate) || 0
      const computedItems = rawItems.map((it: any, i: number) => {
        const quantity = Number(it.quantity) || 0
        const unitPrice = Number(it.unitPrice) || 0
        const amount = +(quantity * unitPrice).toFixed(2)
        return {
          lineNo: Number(it.lineNo) || (i + 1),
          description: String(it.description),
          hsnCode: it.hsnCode ? String(it.hsnCode) : null,
          unit: it.unit ? String(it.unit) : 'EA',
          quantity,
          unitPrice,
          amount,
        }
      })

      const subtotal = +computedItems.reduce((s, it) => s + it.amount, 0).toFixed(2)
      const cgst = +(subtotal * rate / 100).toFixed(2)
      const sgst = +(subtotal * rate / 100).toFixed(2)
      const total = +(subtotal + cgst + sgst).toFixed(2)
      const amountInWords = numberToWords(total)

      // Keep the existing invoice number unless a different, still-unique one is explicitly provided
      let finalNumber = existing.invoiceNumber
      const trimmedNumber = invoiceNumber ? String(invoiceNumber).trim() : ''
      if (trimmedNumber && trimmedNumber !== existing.invoiceNumber) {
        const clash = await prisma.bill.findUnique({ where: { invoiceNumber: trimmedNumber } })
        if (clash) return res.status(400).json({ error: `Invoice number "${trimmedNumber}" is already used` })
        finalNumber = trimmedNumber
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.billItem.deleteMany({ where: { billId: id } })
        return tx.bill.update({
          where: { id },
          data: {
            invoiceNumber: finalNumber,
            date: date ? new Date(date) : existing.date,
            billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
            shipToName: shipToName || null, shipToAddress: shipToAddress || null,
            shipToGst: shipToGst || null, shipToState: shipToState || null,
            poNumber, poNumberLabel, poDate, poDateLabel, vendorCode, projectCode, projectName,
            dateOfSupply: dateOfSupply ? new Date(dateOfSupply) : existing.dateOfSupply,
            placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
            gstRate: rate, subtotal, cgst, sgst, total, amountInWords,
            items: { create: computedItems },
          },
          include: { items: { orderBy: { lineNo: 'asc' } } },
        })
      })

      // Remember HSN codes (product -> code) for quick reuse
      for (const it of computedItems) {
        if (it.hsnCode && it.description) {
          try {
            await prisma.hsnCode.upsert({
              where: { description: it.description },
              update: { code: it.hsnCode, unit: it.unit, unitPrice: it.unitPrice },
              create: { description: it.description, code: it.hsnCode, unit: it.unit, unitPrice: it.unitPrice },
            })
          } catch (e) { /* ignore individual hsn save errors */ }
        }
      }

      res.json(updated)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to update bill' })
    }
  })

  // Delete bill — requires a reason, logged before the record is gone
  router.delete('/:id', requirePermission('billing', 'canDelete'), async (req: any, res) => {
    const reason = req.body?.reason ? String(req.body.reason).trim() : ''
    if (!reason) return res.status(400).json({ error: 'A reason is required to delete an invoice' })
    try {
      const id = Number(req.params.id)
      const existing = await prisma.bill.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Not found' })

      await prisma.$transaction([
        prisma.deletionLog.create({
          data: {
            entityType: 'invoice', entityId: id, entityLabel: existing.invoiceNumber,
            reason, deletedById: req.user?.id, deletedByName: req.user?.email,
          },
        }),
        prisma.bill.delete({ where: { id } }),
      ])
      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to delete bill' })
    }
  })

  return router
}
