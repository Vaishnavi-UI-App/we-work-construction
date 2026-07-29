import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
import { accessMiddleware, requirePermission } from '../utils/access';
import { toCsv, sendCsv } from '../utils/csv';

export default function (prisma: PrismaClient) {
  const router = Router();
  router.use(authMiddleware);
  router.use(accessMiddleware(prisma));

  router.get('/summary', requirePermission('reports', 'canView'), async (req: any, res) => {
    try {
      const siteFilter = req.access.allSites ? {} : { siteId: req.access.siteId ?? -1 };
      const invoices = await prisma.invoice.findMany({ where: siteFilter, include: { site: true } });
      const expenses = await prisma.expense.findMany({ where: siteFilter, include: { site: true } });
      const customers = await prisma.customer.findMany();
      const vendors = await prisma.vendor.findMany();

      const totalSales = invoices.reduce((s, i) => s + (i.total || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const pendingInvoices = invoices.filter((i: any) => !i.status || i.status === 'PENDING').length;

      const siteExpenses: Record<string, number> = {};
      expenses.forEach((e) => {
        const name = e.site?.name || 'Unknown';
        siteExpenses[name] = (siteExpenses[name] || 0) + e.amount;
      });

      const monthlySales: Record<string, number> = {};
      const monthlyExpenses: Record<string, number> = {};
      invoices.forEach((i) => {
        const k = new Date(i.date).toISOString().slice(0, 7);
        monthlySales[k] = (monthlySales[k] || 0) + (i.total || 0);
      });
      expenses.forEach((e) => {
        const k = new Date(e.date).toISOString().slice(0, 7);
        monthlyExpenses[k] = (monthlyExpenses[k] || 0) + e.amount;
      });

      res.json({
        totalSales,
        totalExpenses,
        pendingInvoices,
        totalCustomers: customers.length,
        totalVendors: vendors.length,
        siteExpenses,
        monthlySales,
        monthlyExpenses,
        recentInvoices: invoices.slice(-5).reverse(),
        recentExpenses: expenses.slice(-5).reverse(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // Branch-wise totals: funds, spend, sales and profit per site
  router.get('/export/branches', requirePermission('reports', 'canView'), async (req: any, res) => {
    try {
      const siteWhere = req.access.allSites ? {} : { id: req.access.siteId ?? -1 };
      const sites = await prisma.site.findMany({
        where: siteWhere,
        include: { wallet: true, invoices: true, expenses: true },
      });

      const rows = sites.map((s) => {
        const totalSales = s.invoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const totalExpenses = s.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const w = s.wallet;
        return [
          s.name,
          w?.totalFundsReceived || 0,
          w?.companyBalance || 0,
          w?.totalCompanySpent || 0,
          w?.totalPersonalSpent || 0,
          w?.totalPersonalReimbursed || 0,
          totalSales,
          totalExpenses,
          totalSales - totalExpenses,
        ];
      });

      const csv = toCsv(
        ['Branch', 'Total Funds Received', 'Company Balance', 'Company Spent', 'Personal Spent', 'Personal Reimbursed', 'Total Sales', 'Total Expenses', 'Profit'],
        rows
      );
      sendCsv(res, `branch-wise-report-${Date.now()}.csv`, csv);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate branch report' });
    }
  });

  // Person-wise totals: how much each "Ordered By" person has spent, per branch
  router.get('/export/ordered-by', requirePermission('reports', 'canView'), async (req: any, res) => {
    try {
      const siteFilter = req.access.allSites ? {} : { siteId: req.access.siteId ?? -1 };
      const expenses = await prisma.expense.findMany({
        where: { ...siteFilter, orderedBy: { not: null } },
        include: { site: true },
      });

      const groups: Record<string, { count: number; total: number }> = {};
      for (const e of expenses) {
        const person = (e.orderedBy || '').trim();
        if (!person) continue;
        const key = `${person}|||${e.site?.name || 'Unknown'}`;
        if (!groups[key]) groups[key] = { count: 0, total: 0 };
        groups[key].count += 1;
        groups[key].total += e.amount || 0;
      }

      const rows = Object.entries(groups)
        .map(([key, v]) => { const [person, site] = key.split('|||'); return [person, site, v.count, v.total]; })
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

      const csv = toCsv(['Ordered By', 'Branch', 'Expense Count', 'Total Amount'], rows);
      sendCsv(res, `person-wise-report-${Date.now()}.csv`, csv);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate person-wise report' });
    }
  });

  // Manager-wise totals: how much each manager recorded, per branch
  router.get('/export/managers', requirePermission('reports', 'canView'), async (req: any, res) => {
    try {
      const siteFilter = req.access.allSites ? {} : { siteId: req.access.siteId ?? -1 };
      const expenses = await prisma.expense.findMany({
        where: siteFilter,
        include: { site: true, manager: { select: { name: true, email: true } } },
      });

      const groups: Record<string, { count: number; total: number; company: number; personal: number }> = {};
      for (const e of expenses) {
        const manager = e.manager?.name || e.manager?.email || 'Unassigned';
        const key = `${manager}|||${e.site?.name || 'Unknown'}`;
        if (!groups[key]) groups[key] = { count: 0, total: 0, company: 0, personal: 0 };
        groups[key].count += 1;
        groups[key].total += e.amount || 0;
        groups[key].company += e.companyPaid || 0;
        groups[key].personal += e.personalPaid || 0;
      }

      const rows = Object.entries(groups)
        .map(([key, v]) => { const [manager, site] = key.split('|||'); return [manager, site, v.count, v.total, v.company, v.personal]; })
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

      const csv = toCsv(['Manager', 'Branch', 'Expense Count', 'Total Amount', 'Company Paid', 'Personal Paid'], rows);
      sendCsv(res, `manager-wise-report-${Date.now()}.csv`, csv);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate manager-wise report' });
    }
  });

  return router;
}
