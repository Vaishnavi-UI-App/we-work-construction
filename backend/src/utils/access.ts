import { PrismaClient } from '@prisma/client'
import { MODULES, PermissionAction } from '../constants'

// Resolves req.access = { isAdmin, allSites, siteId, can(module, action) } from the
// authenticated user's custom role + branch assignment. ADMIN always bypasses.
export function accessMiddleware(prisma: PrismaClient) {
  return async (req: any, res: any, next: any) => {
    try {
      if (req.user?.role === 'ADMIN') {
        req.access = { isAdmin: true, allSites: true, siteId: null, can: () => true }
        return next()
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { roleRef: { include: { permissions: true } } },
      })
      const allSites = !!user?.roleRef?.isAllSites || !user?.siteId
      const siteId = user?.siteId ?? null
      const perms = user?.roleRef?.permissions || []
      const can = (moduleKey: string, action: PermissionAction) => {
        const p = perms.find((p: any) => p.module === moduleKey)
        return !!p && !!(p as any)[action]
      }
      req.access = { isAdmin: false, allSites, siteId, can }
      next()
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve access' })
    }
  }
}

export function requirePermission(moduleKey: string, action: PermissionAction) {
  return (req: any, res: any, next: any) => {
    if (!req.access) return res.status(500).json({ error: 'Access not resolved' })
    if (req.access.isAdmin || req.access.can(moduleKey, action)) return next()
    res.status(403).json({ error: 'Permission denied' })
  }
}

// Builds the user object returned at login and stored client-side for UI
// permission checks. Real enforcement always happens server-side via
// accessMiddleware/requirePermission above.
export async function buildUserPayload(prisma: PrismaClient, userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleRef: { include: { permissions: true } }, site: true },
  })
  if (!user) return null

  const isAdmin = user.role === 'ADMIN'
  const allSites = isAdmin || !!user.roleRef?.isAllSites || !user.siteId

  const permissions: Record<string, { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }> = {}
  for (const m of MODULES) {
    if (isAdmin) {
      permissions[m] = { canView: true, canAdd: true, canEdit: true, canDelete: true }
    } else {
      const p = user.roleRef?.permissions.find((p) => p.module === m)
      permissions[m] = {
        canView: !!p?.canView,
        canAdd: !!p?.canAdd,
        canEdit: !!p?.canEdit,
        canDelete: !!p?.canDelete,
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: isAdmin ? 'ADMIN' : (user.roleRef?.name || 'No Role'),
    roleId: user.roleId,
    siteId: user.siteId,
    siteName: user.site?.name || null,
    isAdmin,
    allSites,
    permissions,
  }
}
