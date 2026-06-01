import {
  pgTable,
  uuid,
  varchar,
  boolean,
  numeric,
  timestamp,
  date,
  text,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/pg-core';

export const budgetBinders = pgTable('budget_binders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const payees = pgTable('payees', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).default('#3B82F6'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const accountTags = pgTable(
  'account_tags',
  {
    binderId: uuid('binder_id')
      .notNull()
      .references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.tagId] }),
  }),
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    binderId: uuid('binder_id')
      .notNull()
      .references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    payeeId: uuid('payee_id').references(() => payees.id, { onDelete: 'set null' }),
    transferId: uuid('transfer_id'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    date: date('date').notNull(),
    notes: text('notes'),
    isCleared: boolean('is_cleared').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    transferFk: foreignKey({
      columns: [table.transferId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  }),
);

export const paymentSchedules = pgTable('payment_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  payeeId: uuid('payee_id').references(() => payees.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  nextDueDate: date('next_due_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const investments = pgTable('investments', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  principalAmount: numeric('principal_amount', { precision: 12, scale: 2 })
    .notNull()
    .default('0.00'),
  interestRate: numeric('interest_rate', { precision: 5, scale: 4 }).notNull(),
  interestPeriod: varchar('interest_period', { length: 20 }).notNull(),
  compoundingFrequency: varchar('compounding_frequency', { length: 20 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0.0000'),
  startDate: date('start_date').notNull(),
  maturityDate: date('maturity_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
