import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { accessMiddleware } from '../utils/access'

export default function(prisma: PrismaClient){
  const router = Router()
  router.use(authMiddleware)
  router.use(accessMiddleware(prisma))

  // Every page needs the site list for dropdowns — scoped to the user's branch unless all-sites
  router.get('/', async (req: any, res) => {
    const sites = await prisma.site.findMany({
      where: req.access.allSites ? {} : { id: req.access.siteId ?? -1 },
    })
    res.json(sites)
  })

  router.post('/', async (req: any, res: any) => {
    if (!req.access.isAdmin) {
      return res.status(403).json({ error: 'Admin only' })
    }
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Site name is required' })
    try {
      const site = await prisma.site.create({ data: { name: name.trim() } })
      res.json(site)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'A site with this name already exists' })
      res.status(500).json({ error: e.message })
    }
  })

  return router
}
