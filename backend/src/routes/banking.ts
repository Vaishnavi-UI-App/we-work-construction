import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'
import { toCsv, sendCsv } from '../utils/csv'

async function buildSummary(prisma: PrismaClient) {
  const [bills, payments, customers] = await Promise.all([
    prisma.bill.findMany({ select: { billToName: true, billToMobile: true, billToEmail: true, total: true, createdAt: true } }),
    prisma.payment.findMany({ select: { customerName: true, amount: true } }),
    prisma.customer.findMany({ select: { name: true, phone: true } }),
  ])

  const names = new Set<string>()
  bills.forEach((b) => b.billToName && names.add(b.billToName))
  payments.forEach((p) => names.add(p.customerName))
  customers.forEach((c) => names.add(c.name))

  return Array.from(names).map((name) => {
    const custBills = bills.filter((b) => b.billToName === name)
    const billed = custBills.reduce((s, b) => s + (b.total || 0), 0)
    const paid = payments.filter((p) => p.customerName === name).reduce((s, p) => s + (p.amount || 0), 0)
    const due = Math.max(0, +(billed - paid).toFixed(2))
    const advance = Math.max(0, +(paid - billed).toFixed(2))

    // Best-effort contact info: most recent bill's contact details, falling back to the Customer record
    const latestBill = [...custBills].sort((a, b) => (b.createdAt as any) - (a.createdAt as any))[0]
    const customer = customers.find((c) => c.name === name)
    const mobile = latestBill?.billToMobile || customer?.phone || ''
    const email = latestBill?.billToEmail || ''

    return { customerName: name, billed: +billed.toFixed(2), paid: +paid.toFixed(2), due, advance, mobile, email }
  }).sort((a, b) => a.customerName.localeCompare(b.customerName))
}

export default function (prisma: PrismaClient) {
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  // Customer-wise ledger: total billed, total paid, due, and advance
  router.get('/summary', requirePermission('banking', 'canView'), async (_req, res) => {
    try {
      res.json(await buildSummary(prisma))
    } catch (err) {
      res.status(500).json({ error: 'Failed to load banking summary' })
    }
  })

  // Download the customer ledger as CSV — all customers, or one customer (with their payment history) if ?customerName= is given
  router.get('/export', requirePermission('banking', 'canView'), async (req, res) => {
    try {
      const { customerName } = req.query
      const summary = await buildSummary(prisma)

      if (customerName) {
        const c = summary.find((s) => s.customerName === String(customerName))
        if (!c) return res.status(404).json({ error: 'Customer not found' })

        const payments = await prisma.payment.findMany({ where: { customerName: String(customerName) }, orderBy: { date: 'desc' } })
        const lines = [
          toCsv(['Customer', 'Billed', 'Paid', 'Due', 'Advance', 'Mobile', 'Email'], [[c.customerName, c.billed, c.paid, c.due, c.advance, c.mobile, c.email]]),
          '',
          toCsv(['Payment Date', 'Amount', 'Method', 'Reference', 'Notes'], payments.map((p) => [
            new Date(p.date).toLocaleDateString('en-IN'), p.amount, p.method || '', p.reference || '', p.notes || '',
          ])),
        ]
        sendCsv(res, `${c.customerName.replace(/[^a-z0-9]+/gi, '-')}-ledger-${Date.now()}.csv`, lines.join('\r\n'))
        return
      }

      const rows = summary.map((c) => [c.customerName, c.billed, c.paid, c.due, c.advance, c.mobile, c.email])
      const csv = toCsv(['Customer', 'Billed', 'Paid', 'Due', 'Advance', 'Mobile', 'Email'], rows)
      sendCsv(res, `customer-ledger-${Date.now()}.csv`, csv)
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate report' })
    }
  })

  // Payment history — optionally scoped to one customer
  router.get('/payments', requirePermission('banking', 'canView'), async (req, res) => {
    try {
      const { customerName } = req.query
      const where = customerName ? { customerName: String(customerName) } : {}
      const payments = await prisma.payment.findMany({ where, orderBy: { date: 'desc' } })
      res.json(payments)
    } catch (err) {
      res.status(500).json({ error: 'Failed to load payments' })
    }
  })

  // Record a payment received from (or advance paid by) a customer
  router.post('/payments', requirePermission('banking', 'canAdd'), async (req, res) => {
    try {
      const { customerName, amount, date, method, reference, notes } = req.body
      if (!customerName || !String(customerName).trim()) return res.status(400).json({ error: 'Customer name is required' })
      if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Enter a valid amount' })

      const payment = await prisma.payment.create({
        data: {
          customerName: String(customerName).trim(),
          amount: Number(amount),
          date: date ? new Date(date) : new Date(),
          method: method || null,
          reference: reference || null,
          notes: notes || null,
        },
      })
      res.json(payment)
    } catch (err) {
      res.status(500).json({ error: 'Failed to record payment' })
    }
  })

  router.delete('/payments/:id', requirePermission('banking', 'canDelete'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      await prisma.payment.delete({ where: { id } })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete payment' })
    }
  })

  return router
}
