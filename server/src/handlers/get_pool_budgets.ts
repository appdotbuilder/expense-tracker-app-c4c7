import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const getPoolBudgets = async (poolId: number): Promise<Budget[]> => {
  try {
    // Fetch all budgets for the specified pool
    const results = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.pool_id, poolId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(budget => ({
      ...budget,
      target_amount: parseFloat(budget.target_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch pool budgets:', error);
    throw error;
  }
};