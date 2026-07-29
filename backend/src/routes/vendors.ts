import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'

export default function(prisma: PrismaClient){
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  router.get('/', requirePermission('vendors', 'canView'), async (req, res) => {
    const vendors = await prisma.vendor.findMany()
    res.json(vendors)
  })

  router.post('/', requirePermission('vendors', 'canAdd'), async (req, res) => {
    const data = req.body
    const v = await prisma.vendor.create({ data })
    res.json(v)
  })

  router.put('/:id', requirePermission('vendors', 'canEdit'), async (req, res) => {
    const id = Number(req.params.id)
    const v = await prisma.vendor.update({ where: { id }, data: req.body })
    res.json(v)
  })

  router.delete('/:id', requirePermission('vendors', 'canDelete'), async (req, res) => {
    const id = Number(req.params.id)
    await prisma.vendor.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}
