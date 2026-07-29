import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../utils/auth'
import { MODULES } from '../constants'

function adminOnly(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' })
  next()
}

function normalizePermissions(input: any[]): { module: string; canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }[] {
  const byModule = new Map((Array.isArray(input) ? input : []).map((p: any) => [p.module, p]))
  return MODULES.map((m) => {
    const p = byModule.get(m) || {}
    return {
      module: m,
      canView: !!p.canView,
      canAdd: !!p.canAdd,
      canEdit: !!p.canEdit,
      canDelete: !!p.canDelete,
    }
  })
}

export default function (prisma: PrismaClient) {
  const router = Router()
  router.use(authMiddleware)
  router.use(adminOnly)

  // List roles with their permission matrix + member count
  router.get('/', async (_req, res) => {
    const roles = await prisma.role.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(roles)
  })

  // Create role
  router.post('/', async (req, res) => {
    const { name, isAllSites, permissions } = req.body
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Role name is required' })
    try {
      const role = await prisma.role.create({
        data: {
          name: String(name).trim(),
          isAllSites: !!isAllSites,
          permissions: { create: normalizePermissions(permissions) },
        },
        include: { permissions: true },
      })
      res.json(role)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'A role with this name already exists' })
      res.status(500).json({ error: 'Failed to create role' })
    }
  })

  // Update role (name, all-sites flag, permission matrix)
  router.put('/:id', async (req, res) => {
    const id = Number(req.params.id)
    const { name, isAllSites, permissions } = req.body
    try {
      const role = await prisma.role.update({
        where: { id },
        data: { name: name ? String(name).trim() : undefined, isAllSites: typeof isAllSites === 'boolean' ? isAllSites : undefined },
      })

      // Keep denormalized User.role display name in sync with any rename
      if (name) {
        await prisma.user.updateMany({ where: { roleId: id }, data: { role: role.name } })
      }

      if (Array.isArray(permissions)) {
        const normalized = normalizePermissions(permissions)
        for (const p of normalized) {
          await prisma.rolePermission.upsert({
            where: { roleId_module: { roleId: id, module: p.module } },
            update: { canView: p.canView, canAdd: p.canAdd, canEdit: p.canEdit, canDelete: p.canDelete },
            create: { roleId: id, module: p.module, canView: p.canView, canAdd: p.canAdd, canEdit: p.canEdit, canDelete: p.canDelete },
          })
        }
      }

      const updated = await prisma.role.findUnique({ where: { id }, include: { permissions: true } })
      res.json(updated)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'A role with this name already exists' })
      res.status(500).json({ error: 'Failed to update role' })
    }
  })

  // Delete role — blocked while users are still assigned to it
  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    const memberCount = await prisma.user.count({ where: { roleId: id } })
    if (memberCount > 0) {
      return res.status(400).json({ error: `Cannot delete — ${memberCount} user(s) still have this role. Reassign them first.` })
    }
    await prisma.role.delete({ where: { id } })
    res.json({ ok: true })
  })

  return router
}
