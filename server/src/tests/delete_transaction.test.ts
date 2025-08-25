import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing transaction', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create a test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'expense',
        amount: '100.50',
        description: 'Test transaction',
        category_id: categoryId,
        transaction_date: new Date()
      })
      .returning()
      .execute();
    
    const transactionId = transactionResult[0].id;

    // Verify transaction exists before deletion
    const beforeDeletion = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();
    
    expect(beforeDeletion).toHaveLength(1);

    // Delete the transaction
    const result = await deleteTransaction(transactionId);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify transaction no longer exists in database
    const afterDeletion = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();
    
    expect(afterDeletion).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent transaction', async () => {
    // Try to delete a transaction that doesn't exist
    const result = await deleteTransaction(99999);

    expect(result).toBe(false);
  });

  it('should handle deletion of transaction with all optional fields', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create a transaction with minimal fields (no category, vendor, pool, etc.)
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'income',
        amount: '250.75',
        description: 'Income transaction',
        transaction_date: new Date()
      })
      .returning()
      .execute();
    
    const transactionId = transactionResult[0].id;

    // Delete the transaction
    const result = await deleteTransaction(transactionId);

    expect(result).toBe(true);

    // Verify it's deleted
    const afterDeletion = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();
    
    expect(afterDeletion).toHaveLength(0);
  });

  it('should handle deletion of credit transaction with associated person', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create a test category for credit
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Credit Category',
        type: 'credit'
      })
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create a credit transaction with associated person
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'credit',
        amount: '500.00',
        description: 'Credit transaction',
        category_id: categoryId,
        associated_person: 'John Doe',
        transaction_date: new Date()
      })
      .returning()
      .execute();
    
    const transactionId = transactionResult[0].id;

    // Delete the transaction
    const result = await deleteTransaction(transactionId);

    expect(result).toBe(true);

    // Verify it's deleted
    const afterDeletion = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();
    
    expect(afterDeletion).toHaveLength(0);
  });
});