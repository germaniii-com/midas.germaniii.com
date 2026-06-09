import {
  pgTable,
  uuid,
  varchar,
  boolean,
  numeric,
  integer,
  jsonb,
  timestamp,
  date,
  text,
  primaryKey,
  foreignKey,
  unique,
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
  name: varchar('name', { length: 100 }).notNull(),
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

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const accountCategories = pgTable(
  'account_categories',
  {
    binderId: uuid('binder_id')
      .notNull()
      .references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.categoryId] }),
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

export const transactionTags = pgTable(
  'transaction_tags',
  {
    binderId: uuid('binder_id')
      .notNull()
      .references(() => budgetBinders.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.transactionId, table.tagId] }),
  }),
);

export const paymentSchedules = pgTable('payment_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  payeeId: uuid('payee_id').references(() => payees.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  repeatInterval: integer('repeat_interval').notNull().default(1),
  repeatType: varchar('repeat_type', { length: 10 }).notNull(),
  startDate: date('start_date').notNull(),
  endType: varchar('end_type', { length: 10 }).notNull().default('never'),
  endDate: date('end_date'),
  endOccurrences: integer('end_occurrences'),
  specificDays: jsonb('specific_days'),
  weekendAdjustment: varchar('weekend_adjustment', { length: 10 }).notNull().default('none'),
  notifyBefore: integer('notify_before').notNull().default(7),
  notifyType: varchar('notify_type', { length: 10 }).default('days'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const paymentScheduleOccurrences = pgTable(
  'payment_schedule_occurrences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    binderId: uuid('binder_id')
      .notNull()
      .references(() => budgetBinders.id, { onDelete: 'cascade' }),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => paymentSchedules.id, { onDelete: 'cascade' }),
    dueDate: date('due_date').notNull(),
    transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueScheduleDueDate: unique().on(table.scheduleId, table.dueDate),
  }),
);

export const transactionAttachments = pgTable('transaction_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  binderId: uuid('binder_id')
    .notNull()
    .references(() => budgetBinders.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  objectName: varchar('object_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),
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
