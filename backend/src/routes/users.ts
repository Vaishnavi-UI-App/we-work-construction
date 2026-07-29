import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../utils/auth';

function adminOnly(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}

export default function (prisma: PrismaClient) {
  const router = Router();
  router.use(authMiddleware);

  const userSelect = {
    id: true, email: true, name: true, role: true, roleId: true, siteId: true,
    phone: true, isActive: true, createdAt: true,
    roleRef: { select: { id: true, name: true, isAllSites: true } },
    site: { select: { id: true, name: true } },
  };

  // List all users (admin only)
  router.get('/', adminOnly, async (_req, res) => {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  });

  // Create user (admin only). Pass roleId for a custom role, or omit it for ADMIN.
  router.post('/', adminOnly, async (req, res) => {
    const { email, password, name, roleId, siteId, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    let roleName = 'ADMIN';
    let finalRoleId: number | null = null;
    if (roleId) {
      const roleRow = await prisma.role.findUnique({ where: { id: Number(roleId) } });
      if (!roleRow) return res.status(400).json({ error: 'Invalid role' });
      roleName = roleRow.name;
      finalRoleId = roleRow.id;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email, password: hash, name, phone,
        role: roleName, roleId: finalRoleId,
        siteId: siteId ? Number(siteId) : null,
      },
      select: userSelect,
    });
    res.json(user);
  });

  // Update user (admin only)
  router.put('/:id', adminOnly, async (req, res) => {
    const id = Number(req.params.id);
    const { name, roleId, siteId, phone, isActive, password } = req.body;
    const data: any = { name, phone, isActive };

    if (roleId === null) {
      data.role = 'ADMIN';
      data.roleId = null;
    } else if (roleId !== undefined) {
      const roleRow = await prisma.role.findUnique({ where: { id: Number(roleId) } });
      if (!roleRow) return res.status(400).json({ error: 'Invalid role' });
      data.role = roleRow.name;
      data.roleId = roleRow.id;
    }
    if (siteId !== undefined) data.siteId = siteId ? Number(siteId) : null;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
    res.json(user);
  });

  // Delete user (admin only)
  router.delete('/:id', adminOnly, async (req: any, res) => {
    const id = Number(req.params.id);
    if (id === req.user?.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  });

  return router;
}
