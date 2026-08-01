import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'

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

  // Next auto challan number
  router.get('/next-number', requirePermission('delivery-challan', 'canView'), async (_req: any, res) => {
    const count = await prisma.deliveryChallan.count()
    const number = `DC ${count + 1}/${fiscalYear(new Date())}`
    res.json({ challanNumber: number })
  })

  // List challans
  router.get('/', requirePermission('delivery-challan', 'canView'), async (_req: any, res) => {
    const challans = await prisma.deliveryChallan.findMany({
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(challans)
  })

  // Get one challan
  router.get('/:id', requirePermission('delivery-challan', 'canView'), async (req: any, res) => {
    const id = Number(req.params.id)
    const challan = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    })
    if (!challan) return res.status(404).json({ error: 'Not found' })
    res.json(challan)
  })

  // Create challan
  router.post('/', requirePermission('delivery-challan', 'canAdd'), async (req: any, res) => {
    try {
      const {
        challanNumber, date, billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
        shipToName, shipToAddress, shipToGst, shipToState,
        poNumber, poDate, purpose, dateOfSupply, placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
        items,
      } = req.body

      if (!billToName) return res.status(400).json({ error: 'Bill To name is required' })
      const rawItems = Array.isArray(items) ? items.filter((it: any) => it && it.description) : []
      if (rawItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' })

      const computedItems = rawItems.map((it: any, i: number) => ({
        lineNo: Number(it.lineNo) || (i + 1),
        description: String(it.description),
        hsnCode: it.hsnCode ? String(it.hsnCode) : null,
        unit: it.unit ? String(it.unit) : 'EA',
        quantity: Number(it.quantity) || 0,
      }))

      // Resolve challan number (auto if missing / ensure unique)
      let finalNumber = (challanNumber && String(challanNumber).trim())
        || `DC ${(await prisma.deliveryChallan.count()) + 1}/${fiscalYear(new Date())}`
      let attempt = 0
      while (await prisma.deliveryChallan.findUnique({ where: { challanNumber: finalNumber } })) {
        attempt++
        finalNumber = `DC ${(await prisma.deliveryChallan.count()) + 1 + attempt}/${fiscalYear(new Date())}`
      }

      const created = await prisma.deliveryChallan.create({
        data: {
          challanNumber: finalNumber,
          date: date ? new Date(date) : new Date(),
          billToName, billToAddress, billToGst, billToMobile, billToEmail, billToState,
          shipToName: shipToName || null, shipToAddress: shipToAddress || null,
          shipToGst: shipToGst || null, shipToState: shipToState || null,
          poNumber, poDate, purpose: purpose || 'Delivery',
          dateOfSupply: dateOfSupply ? new Date(dateOfSupply) : (date ? new Date(date) : new Date()),
          placeOfSupply, vehicleNumber, transportMode, siteName, deliveredThrough,
          items: { create: computedItems },
        },
        include: { items: { orderBy: { lineNo: 'asc' } } },
      })

      res.json(created)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to create delivery challan' })
    }
  })

  // Delete challan
  router.delete('/:id', requirePermission('delivery-challan', 'canDelete'), async (req: any, res) => {
    try {
      const id = Number(req.params.id)
      await prisma.deliveryChallan.delete({ where: { id } })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete delivery challan' })
    }
  })

  return router
}
