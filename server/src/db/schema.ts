import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for transaction and pool types
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'credit', 'payment']);
export const poolTypeEnum = pgEnum('pool_type', ['income', 'expense', 'credit', 'payment']);
export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense', 'credit']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table (for Income, Expense, and Credit transactions)
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: categoryTypeEnum('type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Vendors table (for Payment transactions)
export const vendorsTable = pgTable('vendors', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Pools table for grouping related transactions
export const poolsTable = pgTable('pools', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: poolTypeEnum('type').notNull(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Budgets table for monitoring spending/income against targets
export const budgetsTable = pgTable('budgets', {
  id: serial('id').primaryKey(),
  pool_id: integer('pool_id').references(() => poolsTable.id).notNull(),
  target_amount: numeric('target_amount', { precision: 15, scale: 2 }).notNull(), // Amount in INR with precision
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  pool_id: integer('pool_id').references(() => poolsTable.id), // Nullable - optional pool association
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(), // Amount in INR with precision
  description: text('description').notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id), // Nullable - only for income, expense, credit
  vendor_id: integer('vendor_id').references(() => vendorsTable.id), // Nullable - only for payment
  associated_person: varchar('associated_person', { length: 255 }), // Nullable - only for credit transactions
  transaction_date: timestamp('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  categories: many(categoriesTable),
  vendors: many(vendorsTable),
  pools: many(poolsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [categoriesTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const vendorsRelations = relations(vendorsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [vendorsTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const poolsRelations = relations(poolsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [poolsTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable)
}));

export const budgetsRelations = relations(budgetsTable, ({ one }) => ({
  pool: one(poolsTable, {
    fields: [budgetsTable.pool_id],
    references: [poolsTable.id]
  })
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  pool: one(poolsTable, {
    fields: [transactionsTable.pool_id],
    references: [poolsTable.id]
  }),
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id]
  }),
  vendor: one(vendorsTable, {
    fields: [transactionsTable.vendor_id],
    references: [vendorsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Vendor = typeof vendorsTable.$inferSelect;
export type NewVendor = typeof vendorsTable.$inferInsert;

export type Pool = typeof poolsTable.$inferSelect;
export type NewPool = typeof poolsTable.$inferInsert;

export type Budget = typeof budgetsTable.$inferSelect;
export type NewBudget = typeof budgetsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  vendors: vendorsTable,
  pools: poolsTable,
  budgets: budgetsTable,
  transactions: transactionsTable
};