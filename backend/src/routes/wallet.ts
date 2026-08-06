import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../utils/auth';
import { accessMiddleware, requirePermission } from '../utils/access';

const uploadsDir = path.join(__dirname, '../../../uploads/receipts');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

export default function (prisma: PrismaClient) {
  const router = Router();
  router.use(authMiddleware);
  router.use(accessMiddleware(prisma));

  // Get all site wallets with full summary — scoped to the user's branch unless they're all-sites
  router.get('/', requirePermission('tracker', 'canView'), async (req: any, res) => {
    try {
      const siteFilter = req.access.allSites ? {} : { id: req.access.siteId ?? -1 };

      const sites = await prisma.site.findMany({
        where: siteFilter,
        include: {
          wallet: true,
          fundAllocations: { orderBy: { date: 'desc' }, take: 10 },
          expenses: {
            orderBy: { date: 'desc' },
            take: 20,
            include: { manager: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      // Auto-create wallet for sites that don't have one
      for (const site of sites) {
        if (!site.wallet) {
          await prisma.siteWallet.create({ data: { siteId: site.id } });
        }
      }

      const result = await prisma.site.findMany({
        where: siteFilter,
        include: {
          wallet: true,
          fundAllocations: { orderBy: { date: 'desc' } },
          expenses: {
            orderBy: { date: 'desc' },
            include: { manager: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });

  // Add company funds to a site — auto-reimburses manager personal money first
  router.post('/fund', requirePermission('tracker', 'canAdd'), async (req: any, res) => {
    const { siteId, amount, notes } = req.body;
    if (!siteId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'siteId and amount required' });
    }
    if (!req.access.allSites && Number(siteId) !== req.access.siteId) {
      return res.status(403).json({ error: 'You can only add funds to your assigned branch' });
    }
    try {
      const fund = Number(amount);

      // Ensure wallet exists
      let wallet = await prisma.siteWallet.findUnique({ where: { siteId: Number(siteId) } });
      if (!wallet) {
        wallet = await prisma.siteWallet.create({ data: { siteId: Number(siteId) } });
      }

      const pendingReimbursement = wallet.totalPersonalSpent - wallet.totalPersonalReimbursed;
      const reimbursedNow = Math.min(fund, pendingReimbursement);
      const addedToBalance = fund - reimbursedNow;

      // Update wallet
      await prisma.siteWallet.update({
        where: { siteId: Number(siteId) },
        data: {
          companyBalance: { increment: addedToBalance },
          totalFundsReceived: { increment: fund },
          totalPersonalReimbursed: { increment: reimbursedNow },
        },
      });

      // Record fund allocation
      const allocation = await prisma.fundAllocation.create({
        data: {
          siteId: Number(siteId),
          amount: fund,
          reimbursedAmount: reimbursedNow,
          notes,
          addedById: req.user?.id,
        },
        include: { site: true, addedBy: { select: { name: true, email: true } } },
      });

      const updatedWallet = await prisma.siteWallet.findUnique({ where: { siteId: Number(siteId) } });

      res.json({
        allocation,
        wallet: updatedWallet,
        summary: {
          fundAdded: fund,
          reimbursedToManager: reimbursedNow,
          addedToCompanyBalance: addedToBalance,
          pendingReimbursementBefore: pendingReimbursement,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add funds' });
    }
  });

  // Ordered-by people master list (for the "Ordered By" dropdown on expenses)
  router.get('/ordered-by', requirePermission('tracker', 'canView'), async (_req, res) => {
    try {
      const people = await prisma.orderedByPerson.findMany({ orderBy: { name: 'asc' } });
      res.json(people);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch people' });
    }
  });

  router.post('/ordered-by', requirePermission('tracker', 'canAdd'), async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    try {
      const person = await prisma.orderedByPerson.upsert({
        where: { name: String(name).trim() },
        update: {},
        create: { name: String(name).trim() },
      });
      res.json(person);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add person' });
    }
  });

  // Expense category master list (for the "Category" dropdown — user-created, not fixed)
  router.get('/categories', requirePermission('tracker', 'canView'), async (_req, res) => {
    try {
      const categories = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  router.post('/categories', requirePermission('tracker', 'canAdd'), async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    try {
      const category = await prisma.expenseCategory.upsert({
        where: { name: String(name).trim() },
        update: {},
        create: { name: String(name).trim() },
      });
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add category' });
    }
  });

  // Add expense — auto-deducts from company balance first, then personal (with optional receipt upload)
  router.post('/expense', requirePermission('tracker', 'canAdd'), upload.single('receipt'), async (req: any, res) => {
    const { siteId, category, amount, notes, orderedBy, date } = req.body;
    const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : undefined;
    if (!siteId || !category || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'siteId, category and amount required' });
    }
    if (!req.access.allSites && Number(siteId) !== req.access.siteId) {
      return res.status(403).json({ error: 'You can only add expenses to your assigned branch' });
    }
    try {
      const total = Number(amount);

      let wallet = await prisma.siteWallet.findUnique({ where: { siteId: Number(siteId) } });
      if (!wallet) {
        wallet = await prisma.siteWallet.create({ data: { siteId: Number(siteId) } });
      }

      // Calculate how much comes from company vs personal
      const companyPaid = Math.min(wallet.companyBalance, total);
      const personalPaid = +(total - companyPaid).toFixed(2);

      let fundType = 'COMPANY';
      if (companyPaid === 0) fundType = 'PERSONAL';
      else if (personalPaid > 0) fundType = 'SPLIT';

      // Update wallet
      await prisma.siteWallet.update({
        where: { siteId: Number(siteId) },
        data: {
          companyBalance: { decrement: companyPaid },
          totalCompanySpent: { increment: companyPaid },
          totalPersonalSpent: { increment: personalPaid },
        },
      });

      // Create expense record
      const expense = await prisma.expense.create({
        data: {
          siteId: Number(siteId),
          managerId: req.user?.id,
          category,
          amount: total,
          companyPaid,
          personalPaid,
          fundType,
          notes,
          orderedBy: orderedBy || undefined,
          date: date ? new Date(date) : undefined,
          receiptUrl,
        },
        include: {
          site: true,
          manager: { select: { id: true, name: true, email: true } },
        },
      });

      const updatedWallet = await prisma.siteWallet.findUnique({ where: { siteId: Number(siteId) } });

      res.json({ expense, wallet: updatedWallet });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add expense' });
    }
  });

  // Edit an expense — reverses its old effect on the wallet, then re-derives the
  // company/personal split fresh against the now-reversed balance (same rule as
  // creating one), so editing the amount can't leave the wallet's running totals
  // out of sync with what's actually been paid from each pot.
  router.put('/expense/:id', requirePermission('tracker', 'canEdit'), upload.single('receipt'), async (req: any, res) => {
    const id = Number(req.params.id);
    const { category, amount, notes, orderedBy, date } = req.body;
    const total = Number(amount);
    if (!category || !total || total <= 0) {
      return res.status(400).json({ error: 'category and amount required' });
    }
    try {
      const existing = await prisma.expense.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Expense not found' });
      if (!req.access.allSites && existing.siteId !== req.access.siteId) {
        return res.status(403).json({ error: 'You can only edit expenses for your assigned branch' });
      }

      const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : existing.receiptUrl;

      const expense = await prisma.$transaction(async (tx) => {
        // Undo the old split's effect on the wallet
        await tx.siteWallet.update({
          where: { siteId: existing.siteId },
          data: {
            companyBalance: { increment: existing.companyPaid },
            totalCompanySpent: { decrement: existing.companyPaid },
            totalPersonalSpent: { decrement: existing.personalPaid },
          },
        });

        // Re-derive the split against the now-reversed balance
        const wallet = await tx.siteWallet.findUniqueOrThrow({ where: { siteId: existing.siteId } });
        const companyPaid = Math.min(wallet.companyBalance, total);
        const personalPaid = +(total - companyPaid).toFixed(2);
        let fundType = 'COMPANY';
        if (companyPaid === 0) fundType = 'PERSONAL';
        else if (personalPaid > 0) fundType = 'SPLIT';

        await tx.siteWallet.update({
          where: { siteId: existing.siteId },
          data: {
            companyBalance: { decrement: companyPaid },
            totalCompanySpent: { increment: companyPaid },
            totalPersonalSpent: { increment: personalPaid },
          },
        });

        return tx.expense.update({
          where: { id },
          data: {
            category, amount: total, companyPaid, personalPaid, fundType, notes,
            orderedBy: orderedBy || undefined,
            date: date ? new Date(date) : existing.date,
            receiptUrl,
          },
          include: { site: true, manager: { select: { id: true, name: true, email: true } } },
        });
      });

      const updatedWallet = await prisma.siteWallet.findUnique({ where: { siteId: existing.siteId } });
      res.json({ expense, wallet: updatedWallet });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  });

  // Delete an expense — reverses its effect on the wallet's running totals first.
  router.delete('/expense/:id', requirePermission('tracker', 'canDelete'), async (req: any, res) => {
    const id = Number(req.params.id);
    try {
      const existing = await prisma.expense.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Expense not found' });
      if (!req.access.allSites && existing.siteId !== req.access.siteId) {
        return res.status(403).json({ error: 'You can only delete expenses for your assigned branch' });
      }

      await prisma.$transaction([
        prisma.siteWallet.update({
          where: { siteId: existing.siteId },
          data: {
            companyBalance: { increment: existing.companyPaid },
            totalCompanySpent: { decrement: existing.companyPaid },
            totalPersonalSpent: { decrement: existing.personalPaid },
          },
        }),
        prisma.expense.delete({ where: { id } }),
      ]);

      const updatedWallet = await prisma.siteWallet.findUnique({ where: { siteId: existing.siteId } });
      res.json({ ok: true, wallet: updatedWallet });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  // Full transaction history for a site
  router.get('/history/:siteId', requirePermission('tracker', 'canView'), async (req: any, res) => {
    const siteId = Number(req.params.siteId);
    if (!req.access.allSites && siteId !== req.access.siteId) {
      return res.status(403).json({ error: 'You can only view history for your assigned branch' });
    }
    try {
      const [expenses, funds, wallet] = await Promise.all([
        prisma.expense.findMany({
          where: { siteId },
          orderBy: { date: 'desc' },
          include: { manager: { select: { id: true, name: true, email: true } }, site: true },
        }),
        prisma.fundAllocation.findMany({
          where: { siteId },
          orderBy: { date: 'desc' },
          include: { addedBy: { select: { name: true, email: true } }, site: true },
        }),
        prisma.siteWallet.findUnique({ where: { siteId } }),
      ]);

      // Merge and sort chronologically
      const timeline = [
        ...expenses.map(e => ({ ...e, txType: 'EXPENSE' })),
        ...funds.map(f => ({ ...f, txType: 'FUND' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({ timeline, wallet });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  return router;
}
