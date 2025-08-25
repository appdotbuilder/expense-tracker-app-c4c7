import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type CreateBudgetInput, type Budget } from '../schema';

export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  try {
    // Insert budget record
    const result = await db.insert(budgetsTable)
      .values({
        pool_id: input.pool_id,
        target_amount: input.target_amount.toString(), // Convert number to string for numeric column
        period_start: input.period_start,
        period_end: input.period_end
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const budget = result[0];
    return {
      ...budget,
      target_amount: parseFloat(budget.target_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Budget creation failed:', error);
    throw error;
  }
};