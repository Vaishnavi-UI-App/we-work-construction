import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'

export default function (prisma: PrismaClient) {
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  // Next auto challan number — plain sequential (matches the paper challan pad, e.g. "115", "116")
  router.get('/next-number', requirePermission('simple-challan', 'canView'), async (_req: any, res) => {
    const count = await prisma.simpleChallan.count()
    res.json({ challanNumber: String(count + 1) })
  })

  // List challans
  router.get('/', requirePermission('simple-challan', 'canView'), async (_req: any, res) => {
    const challans = await prisma.simpleChallan.findMany({
      include: { items: { orderBy: { lineNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(challans)
  })

  // Get one challan
  router.get('/:id', requirePermission('simple-challan', 'canView'), async (req: any, res) => {
    const id = Number(req.params.id)
    const challan = await prisma.simpleChallan.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    })
    if (!challan) return res.status(404).json({ error: 'Not found' })
    res.json(challan)
  })

  // Create challan
  router.post('/', requirePermission('simple-challan', 'canAdd'), async (req: any, res) => {
    try {
      const { challanNumber, date, vehicleNumber, partyName, siteName, kindAttn, items } = req.body

      if (!partyName) return res.status(400).json({ error: 'Party name is required' })
      const rawItems = Array.isArray(items) ? items.filter((it: any) => it && it.description) : []
      if (rawItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' })

      const computedItems = rawItems.map((it: any, i: number) => ({
        lineNo: Number(it.lineNo) || (i + 1),
        description: String(it.description),
        quantity: Number(it.quantity) || 0,
        unit: it.unit ? String(it.unit) : "NO'S",
      }))

      // Resolve challan number (auto if missing / ensure unique)
      let finalNumber = (challanNumber && String(challanNumber).trim())
        || String((await prisma.simpleChallan.count()) + 1)
      let attempt = 0
      while (await prisma.simpleChallan.findUnique({ where: { challanNumber: finalNumber } })) {
        attempt++
        finalNumber = String((await prisma.simpleChallan.count()) + 1 + attempt)
      }

      const created = await prisma.simpleChallan.create({
        data: {
          challanNumber: finalNumber,
          date: date ? new Date(date) : new Date(),
          vehicleNumber, partyName, siteName, kindAttn,
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

  // Update challan — replaces line items, keeps the existing challan number
  // unless a different, still-unique one is explicitly provided
  router.put('/:id', requirePermission('simple-challan', 'canEdit'), async (req: any, res) => {
    try {
      const id = Number(req.params.id)
      const existing = await prisma.simpleChallan.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Not found' })

      const { challanNumber, date, vehicleNumber, partyName, siteName, kindAttn, items } = req.body

      if (!partyName) return res.status(400).json({ error: 'Party name is required' })
      const rawItems = Array.isArray(items) ? items.filter((it: any) => it && it.description) : []
      if (rawItems.length === 0) return res.status(400).json({ error: 'At least one line item is required' })

      const computedItems = rawItems.map((it: any, i: number) => ({
        lineNo: Number(it.lineNo) || (i + 1),
        description: String(it.description),
        quantity: Number(it.quantity) || 0,
        unit: it.unit ? String(it.unit) : "NO'S",
      }))

      let finalNumber = existing.challanNumber
      const trimmedNumber = challanNumber ? String(challanNumber).trim() : ''
      if (trimmedNumber && trimmedNumber !== existing.challanNumber) {
        const clash = await prisma.simpleChallan.findUnique({ where: { challanNumber: trimmedNumber } })
        if (clash) return res.status(400).json({ error: `Challan number "${trimmedNumber}" is already used` })
        finalNumber = trimmedNumber
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.simpleChallanItem.deleteMany({ where: { challanId: id } })
        return tx.simpleChallan.update({
          where: { id },
          data: {
            challanNumber: finalNumber,
            date: date ? new Date(date) : existing.date,
            vehicleNumber, partyName, siteName, kindAttn,
            items: { create: computedItems },
          },
          include: { items: { orderBy: { lineNo: 'asc' } } },
        })
      })

      res.json(updated)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to update delivery challan' })
    }
  })

  // Delete challan — requires a reason, logged before the record is gone
  router.delete('/:id', requirePermission('simple-challan', 'canDelete'), async (req: any, res) => {
    const reason = req.body?.reason ? String(req.body.reason).trim() : ''
    if (!reason) return res.status(400).json({ error: 'A reason is required to delete a delivery challan' })
    try {
      const id = Number(req.params.id)
      const existing = await prisma.simpleChallan.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Not found' })

      await prisma.$transaction([
        prisma.deletionLog.create({
          data: {
            entityType: 'simple-challan', entityId: id, entityLabel: existing.challanNumber,
            reason, deletedById: req.user?.id, deletedByName: req.user?.email,
          },
        }),
        prisma.simpleChallan.delete({ where: { id } }),
      ])
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete delivery challan' })
    }
  })

  return router
}
