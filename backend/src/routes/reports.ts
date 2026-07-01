import { FastifyInstance } from 'fastify';
import { eq, and, sql, inArray, gte, lte, notInArray } from 'drizzle-orm';
import { addDays, format, parseISO, isBefore } from 'date-fns';
import { db } from '../db';
import {
  transactions,
  accounts,
  payees,
  categories,
  accountCategories,
  paymentSchedules,
  paymentScheduleOccurrences,
  transactionTags,
} from '../db/schema';
import { computeNextOccurrences, type ScheduleRule } from '../recurrence';

const truncMap = {
  daily: 'date',
  weekly: `date(date, '-' || ((cast(strftime('%w', date) as integer) + 6) % 7) || ' days')`,
  monthly: `strftime('%Y-%m-01', date)`,
} as const;

const amountReal = (col: string) => `CAST(${col} AS REAL)`;

export async function reportRoutes(app: FastifyInstance) {
  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      interval?: 'daily' | 'weekly' | 'monthly';
      accountIds?: string;
      tagIds?: string;
    };
  }>('/binders/:id/reports/cash-flow', async (req, reply) => {
    const { id } = req.params;
    const {
      startDate = format(new Date(), 'yyyy-01-01'),
      endDate = format(new Date(), 'yyyy-MM-dd'),
      interval = 'monthly',
      accountIds,
      tagIds,
    } = req.query;

    const accountIdList = accountIds
      ? accountIds.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const tagIdList = tagIds
      ? tagIds.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const truncExpr = truncMap[interval];
    const conditions = [
      eq(transactions.binderId, id),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
    ];
    if (accountIdList.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIdList));
    }
    if (tagIdList.length > 0) {
      const matchingTxIds = db
        .select({ transactionId: transactionTags.transactionId })
        .from(transactionTags)
        .where(inArray(transactionTags.tagId, tagIdList));
      conditions.push(inArray(transactions.id, matchingTxIds));
    }

    const result = await db
      .select({
        period: sql<string>`${sql.raw(truncExpr)}`,
        income: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} > 0 THEN ${sql.raw(amountReal('amount'))} ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} < 0 THEN ABS(${sql.raw(amountReal('amount'))}) ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(sql.raw(truncExpr))
      .orderBy(sql.raw(truncExpr));

    return reply.send(
      result.map((r) => ({
        date: r.period.slice(0, 10),
        income: parseFloat(r.income),
        expense: parseFloat(r.expense),
      })),
    );
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      transactionType?: 'income' | 'expense';
      excludeTagIds?: string;
    };
  }>('/binders/:id/reports/spending-breakdown', async (req, reply) => {
    const { id } = req.params;
    const {
      startDate = format(new Date(), 'yyyy-MM-01'),
      endDate = format(new Date(), 'yyyy-MM-dd'),
      transactionType = 'expense',
      excludeTagIds,
    } = req.query;

    const excludeTagIdList = excludeTagIds
      ? excludeTagIds.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const conditions = [
      eq(transactions.binderId, id),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      transactionType === 'expense'
        ? sql`${sql.raw(amountReal('amount'))} < 0`
        : sql`${sql.raw(amountReal('amount'))} > 0`,
    ];

    if (excludeTagIdList.length > 0) {
      const excludeTxIds = db
        .select({ transactionId: transactionTags.transactionId })
        .from(transactionTags)
        .where(inArray(transactionTags.tagId, excludeTagIdList));
      conditions.push(notInArray(transactions.id, excludeTxIds));
    }

    const result = await db
      .select({
        categoryName: categories.name,
        totalAmount: sql<string>`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(accountCategories, eq(accounts.id, accountCategories.accountId))
      .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(categories.name)
      .orderBy(sql`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0) desc`);

    return reply.send(
      result.map((r) => ({
        categoryName: r.categoryName,
        totalAmount: parseFloat(r.totalAmount),
      })),
    );
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      sortBy?: 'amount' | 'count';
      limit?: string;
    };
  }>('/binders/:id/reports/payee-analysis', async (req, reply) => {
    const { id } = req.params;
    const {
      startDate = format(new Date(), 'yyyy-01-01'),
      endDate = format(new Date(), 'yyyy-MM-dd'),
      sortBy = 'amount',
      limit = '10',
    } = req.query;

    const result = await db
      .select({
        payeeName: payees.name,
        totalVolume: sql<string>`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0)`,
        transactionCount: sql<number>`COUNT(${transactions.id})`,
      })
      .from(transactions)
      .innerJoin(payees, eq(transactions.payeeId, payees.id))
      .where(
        and(
          eq(transactions.binderId, id),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(payees.name)
      .orderBy(
        sortBy === 'amount'
          ? sql`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0) desc`
          : sql`COUNT(${transactions.id}) desc`,
      )
      .limit(parseInt(limit) || 10);

    return reply.send(
      result.map((r) => ({
        payeeName: r.payeeName,
        totalVolume: parseFloat(r.totalVolume),
        transactionCount: Number(r.transactionCount),
      })),
    );
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      accountId: string;
      horizonDays?: string;
      includeDrafts?: string;
    };
  }>('/binders/:id/reports/forecast', async (req, reply) => {
    const { id } = req.params;
    const {
      accountId,
      horizonDays = '30',
      includeDrafts = 'false',
    } = req.query;

    if (!accountId) {
      return reply.status(400).send({ error: 'accountId is required' });
    }

    const horizon = parseInt(horizonDays) || 30;
    const showDrafts = includeDrafts === 'true';

    const [balanceRow] = await db
      .select({
        balance: sql<string>`COALESCE(SUM(${sql.raw(amountReal('amount'))}), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.accountId, accountId));

    const currentBalance = parseFloat(balanceRow?.balance || '0');

    const scheduleRows = await db
      .select({
        id: paymentSchedules.id,
        name: paymentSchedules.name,
        accountId: paymentSchedules.accountId,
        amount: paymentSchedules.amount,
        repeatInterval: paymentSchedules.repeatInterval,
        repeatType: paymentSchedules.repeatType,
        startDate: paymentSchedules.startDate,
        endType: paymentSchedules.endType,
        endDate: paymentSchedules.endDate,
        endOccurrences: paymentSchedules.endOccurrences,
        specificDays: paymentSchedules.specificDays,
        weekendAdjustment: paymentSchedules.weekendAdjustment,
        isActive: paymentSchedules.isActive,
      })
      .from(paymentSchedules)
      .where(
        and(
          eq(paymentSchedules.accountId, accountId),
          eq(paymentSchedules.binderId, id),
          showDrafts ? undefined : eq(paymentSchedules.isActive, true),
        ),
      );

    if (scheduleRows.length === 0) {
      const today = new Date();
      const result: { date: string; projectedBalance: number; scheduledOutflow: number }[] = [];
      for (let i = 0; i <= horizon; i++) {
        const d = format(addDays(today, i), 'yyyy-MM-dd');
        result.push({ date: d, projectedBalance: currentBalance, scheduledOutflow: 0 });
      }
      return reply.send(result);
    }

    const scheduleIds = scheduleRows.map((s) => s.id);
    const paidOccurrences = await db
      .select({
        scheduleId: paymentScheduleOccurrences.scheduleId,
        dueDate: paymentScheduleOccurrences.dueDate,
      })
      .from(paymentScheduleOccurrences)
      .where(inArray(paymentScheduleOccurrences.scheduleId, scheduleIds));

    const paidBySchedule: Record<string, string[]> = {};
    for (const occ of paidOccurrences) {
      if (!paidBySchedule[occ.scheduleId]) paidBySchedule[occ.scheduleId] = [];
      paidBySchedule[occ.scheduleId].push(occ.dueDate);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonDate = addDays(today, horizon);

    const outflowByDate: Record<string, number> = {};

    for (const schedule of scheduleRows) {
      const rule: ScheduleRule = {
        repeatInterval: schedule.repeatInterval,
        repeatType: schedule.repeatType as ScheduleRule['repeatType'],
        startDate: schedule.startDate,
        endType: schedule.endType as ScheduleRule['endType'],
        endDate: schedule.endDate,
        endOccurrences: schedule.endOccurrences,
        specificDays: schedule.specificDays as string[] | null,
        weekendAdjustment: schedule.weekendAdjustment as ScheduleRule['weekendAdjustment'],
      };

      const paidDates = paidBySchedule[schedule.id] || [];
      const occurrences = computeNextOccurrences(rule, paidDates, horizon * 2);

      for (const occ of occurrences) {
        const occDate = parseISO(occ.dueDate);
        if (isBefore(occDate, today) || isBefore(horizonDate, occDate)) continue;

        const amount = parseFloat(schedule.amount);
        outflowByDate[occ.dueDate] = (outflowByDate[occ.dueDate] || 0) - amount;
      }
    }

    const sortedDates = Object.keys(outflowByDate).sort();
    const result: { date: string; projectedBalance: number; scheduledOutflow: number }[] = [];

    let runningBalance = currentBalance;
    const dateSet = new Set(sortedDates);

    for (let i = 0; i <= horizon; i++) {
      const d = format(addDays(today, i), 'yyyy-MM-dd');
      let outflow = 0;
      if (dateSet.has(d)) {
        outflow = outflowByDate[d];
        runningBalance -= outflow;
      }
      result.push({
        date: d,
        projectedBalance: runningBalance,
        scheduledOutflow: outflow,
      });
    }

    return reply.send(result);
  });
}
