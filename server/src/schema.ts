import { z } from 'zod';

// Enums for transaction types and categories
export const transactionTypeEnum = z.enum(['income', 'expense', 'credit', 'payment']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const poolTypeEnum = z.enum(['income', 'expense', 'credit', 'payment']);
export type PoolType = z.infer<typeof poolTypeEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category schema for Income, Expense, and Credit transactions
export const categorySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: z.enum(['income', 'expense', 'credit']), // Only these types can have categories
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Vendor schema for Payment transactions
export const vendorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Vendor = z.infer<typeof vendorSchema>;

// Pool schema for grouping related transactions
export const poolSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: poolTypeEnum,
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Pool = z.infer<typeof poolSchema>;

// Budget schema for monitoring spending/income against targets
export const budgetSchema = z.object({
  id: z.number(),
  pool_id: z.number(),
  target_amount: z.number(), // Amount in INR
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Budget = z.infer<typeof budgetSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  pool_id: z.number().nullable(), // Optional pool association
  type: transactionTypeEnum,
  amount: z.number(), // Amount in INR
  description: z.string(),
  category_id: z.number().nullable(), // Only for income, expense, credit
  vendor_id: z.number().nullable(), // Only for payment
  associated_person: z.string().nullable(), // Only for credit transactions
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCategoryInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  type: z.enum(['income', 'expense', 'credit'])
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createVendorInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable()
});

export type CreateVendorInput = z.infer<typeof createVendorInputSchema>;

export const createPoolInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  type: poolTypeEnum,
  description: z.string().nullable()
});

export type CreatePoolInput = z.infer<typeof createPoolInputSchema>;

export const createBudgetInputSchema = z.object({
  pool_id: z.number(),
  target_amount: z.number().positive(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  pool_id: z.number().nullable().optional(),
  type: transactionTypeEnum,
  amount: z.number().positive(),
  description: z.string(),
  category_id: z.number().nullable().optional(),
  vendor_id: z.number().nullable().optional(),
  associated_person: z.string().nullable().optional(),
  transaction_date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Update schemas
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  pool_id: z.number().nullable().optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  category_id: z.number().nullable().optional(),
  vendor_id: z.number().nullable().optional(),
  associated_person: z.string().nullable().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Query schemas for filtering and reporting
export const getTransactionsQuerySchema = z.object({
  user_id: z.number(),
  type: transactionTypeEnum.optional(),
  pool_id: z.number().optional(),
  category_id: z.number().optional(),
  vendor_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;

export const getMonthlyReportQuerySchema = z.object({
  user_id: z.number(),
  year: z.number(),
  month: z.number()
});

export type GetMonthlyReportQuery = z.infer<typeof getMonthlyReportQuerySchema>;

export const getCategoryReportQuerySchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetCategoryReportQuery = z.infer<typeof getCategoryReportQuerySchema>;