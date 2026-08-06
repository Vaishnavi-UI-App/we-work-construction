import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../utils/auth';
import { accessMiddleware, requirePermission } from '../utils/access';

const uploadsDir = path.join(__dirname, '../../../uploads/attendance');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function (prisma: PrismaClient) {
  const router = Router();
  router.use(authMiddleware);
  router.use(accessMiddleware(prisma));

  // Check In
  router.post('/checkin', requirePermission('attendance', 'canAdd'), upload.single('photo'), async (req: any, res) => {
    const { lat, lng, notes } = req.body;
    const checkInLat = lat !== undefined ? Number(lat) : undefined;
    const checkInLng = lng !== undefined ? Number(lng) : undefined;
    const photoUrl = req.file ? `/uploads/attendance/${req.file.filename}` : undefined;
    const today = toDateString(new Date());
    const userId = req.user.id;

    try {
      const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } });
      if (existing?.checkIn) return res.status(400).json({ error: 'Already checked in today' });

      const record = existing
        ? await prisma.attendance.update({
            where: { userId_date: { userId, date: today } },
            data: { checkIn: new Date(), checkInLat, checkInLng, checkInPhotoUrl: photoUrl, notes },
            include: { user: { select: { name: true, email: true, role: true } } },
          })
        : await prisma.attendance.create({
            data: { userId, date: today, checkIn: new Date(), checkInLat, checkInLng, checkInPhotoUrl: photoUrl, notes },
            include: { user: { select: { name: true, email: true, role: true } } },
          });

      res.json(record);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Check-in failed' });
    }
  });

  // Check Out
  router.post('/checkout', requirePermission('attendance', 'canAdd'), upload.single('photo'), async (req: any, res) => {
    const { lat, lng } = req.body;
    const checkOutLat = lat !== undefined ? Number(lat) : undefined;
    const checkOutLng = lng !== undefined ? Number(lng) : undefined;
    const photoUrl = req.file ? `/uploads/attendance/${req.file.filename}` : undefined;
    const today = toDateString(new Date());
    const userId = req.user.id;

    try {
      const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } });
      if (!existing?.checkIn) return res.status(400).json({ error: 'Must check in first' });
      if (existing.checkOut) return res.status(400).json({ error: 'Already checked out today' });

      const checkOutTime = new Date();
      const hours = (checkOutTime.getTime() - existing.checkIn!.getTime()) / 3600000;

      const record = await prisma.attendance.update({
        where: { userId_date: { userId, date: today } },
        data: { checkOut: checkOutTime, checkOutLat, checkOutLng, checkOutPhotoUrl: photoUrl, hoursWorked: +hours.toFixed(2) },
        include: { user: { select: { name: true, email: true, role: true } } },
      });
      res.json(record);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Check-out failed' });
    }
  });

  // My attendance (own user)
  router.get('/my', requirePermission('attendance', 'canView'), async (req: any, res) => {
    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(records);
  });

  // Today's record for current user
  router.get('/today', requirePermission('attendance', 'canView'), async (req: any, res) => {
    const today = toDateString(new Date());
    const record = await prisma.attendance.findUnique({
      where: { userId_date: { userId: req.user.id, date: today } },
    });
    res.json(record || null);
  });

  // All attendance for a date — scoped to the user's branch unless they're all-sites
  router.get('/all', requirePermission('admin-attendance', 'canView'), async (req: any, res) => {
    const { date } = req.query;
    const where: any = date ? { date: String(date) } : {};
    if (!req.access.allSites) where.user = { siteId: req.access.siteId };
    const records = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    res.json(records);
  });

  return router;
}
