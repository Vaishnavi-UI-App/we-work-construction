import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware, requirePermission } from '../utils/access'

export default function(prisma: PrismaClient){
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  router.get('/', requirePermission('customers', 'canView'), async (req, res) => {
    const customers = await prisma.customer.findMany()
    res.json(customers)
  })

  router.post('/', requirePermission('customers', 'canAdd'), async (req, res) => {
    const data = req.body
    const c = await prisma.customer.create({ data })
    res.json(c)
  })

  router.put('/:id', requirePermission('customers', 'canEdit'), async (req, res) => {
    const id = Number(req.params.id)
    const c = await prisma.customer.update({ where: { id }, data: req.body })
    res.json(c)
  })

  router.delete('/:id', requirePermission('customers', 'canDelete'), async (req, res) => {
    const id = Number(req.params.id)
    await prisma.customer.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}
