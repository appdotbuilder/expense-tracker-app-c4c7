import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First, verify the transaction exists
    const existing = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Partial<typeof transactionsTable.$inferInsert> = {
      updated_at: new Date()
    };

    // Only include fields that are explicitly provided in the input
    if (input.pool_id !== undefined) {
      updateData.pool_id = input.pool_id;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.vendor_id !== undefined) {
      updateData.vendor_id = input.vendor_id;
    }
    if (input.associated_person !== undefined) {
      updateData.associated_person = input.associated_person;
    }
    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};