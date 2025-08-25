import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTransaction = async (transactionId: number): Promise<boolean> => {
  try {
    // Delete the transaction with the given ID
    const result = await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    // Check if any rows were affected (transaction was found and deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
};