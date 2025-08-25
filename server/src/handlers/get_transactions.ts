import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsQuery, type Transaction } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getTransactions = async (query: GetTransactionsQuery): Promise<Transaction[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id (required field)
    conditions.push(eq(transactionsTable.user_id, query.user_id));

    // Apply optional filters
    if (query.type) {
      conditions.push(eq(transactionsTable.type, query.type));
    }

    if (query.pool_id) {
      conditions.push(eq(transactionsTable.pool_id, query.pool_id));
    }

    if (query.category_id) {
      conditions.push(eq(transactionsTable.category_id, query.category_id));
    }

    if (query.vendor_id) {
      conditions.push(eq(transactionsTable.vendor_id, query.vendor_id));
    }

    if (query.start_date) {
      conditions.push(gte(transactionsTable.transaction_date, query.start_date));
    }

    if (query.end_date) {
      conditions.push(lte(transactionsTable.transaction_date, query.end_date));
    }

    // Execute query with all conditions
    const results = await db.select()
      .from(transactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
};