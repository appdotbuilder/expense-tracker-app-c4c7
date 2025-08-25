import { db } from '../db';
import { transactionsTable, usersTable, categoriesTable, vendorsTable, poolsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Validate that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate pool_id if provided
    if (input.pool_id !== null && input.pool_id !== undefined) {
      const poolExists = await db.select({ id: poolsTable.id })
        .from(poolsTable)
        .where(eq(poolsTable.id, input.pool_id))
        .execute();

      if (poolExists.length === 0) {
        throw new Error(`Pool with id ${input.pool_id} does not exist`);
      }
    }

    // Validate category_id for income, expense, and credit transactions
    if (['income', 'expense', 'credit'].includes(input.type)) {
      if (input.category_id !== null && input.category_id !== undefined) {
        const categoryExists = await db.select({ id: categoriesTable.id, type: categoriesTable.type })
          .from(categoriesTable)
          .where(eq(categoriesTable.id, input.category_id))
          .execute();

        if (categoryExists.length === 0) {
          throw new Error(`Category with id ${input.category_id} does not exist`);
        }

        // Validate category type matches transaction type
        if (categoryExists[0].type !== input.type) {
          throw new Error(`Category type '${categoryExists[0].type}' does not match transaction type '${input.type}'`);
        }
      }
    }

    // Validate vendor_id for payment transactions
    if (input.type === 'payment') {
      if (input.vendor_id !== null && input.vendor_id !== undefined) {
        const vendorExists = await db.select({ id: vendorsTable.id })
          .from(vendorsTable)
          .where(eq(vendorsTable.id, input.vendor_id))
          .execute();

        if (vendorExists.length === 0) {
          throw new Error(`Vendor with id ${input.vendor_id} does not exist`);
        }
      }
    }

    // Insert the transaction
    const result = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        pool_id: input.pool_id || null,
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        category_id: input.category_id || null,
        vendor_id: input.vendor_id || null,
        associated_person: input.associated_person || null,
        transaction_date: input.transaction_date
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};