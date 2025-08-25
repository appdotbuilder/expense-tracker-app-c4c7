import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, vendorsTable, poolsTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type CreateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testCategory: any;
  let testVendor: any;
  let testPool: any;
  let testTransaction: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUser.id,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    testCategory = categoryResult[0];

    // Create test vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        user_id: testUser.id,
        name: 'Test Vendor',
        description: 'Test vendor description'
      })
      .returning()
      .execute();
    testVendor = vendorResult[0];

    // Create test pool
    const poolResult = await db.insert(poolsTable)
      .values({
        user_id: testUser.id,
        name: 'Test Pool',
        type: 'expense',
        description: 'Test pool description'
      })
      .returning()
      .execute();
    testPool = poolResult[0];

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUser.id,
        type: 'expense',
        amount: '100.50',
        description: 'Original transaction',
        category_id: testCategory.id,
        transaction_date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    testTransaction = transactionResult[0];
  });

  it('should update transaction amount', async () => {
    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      amount: 250.75
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransaction.id);
    expect(result.amount).toEqual(250.75);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Original transaction'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTransaction.updated_at).toBe(true);
  });

  it('should update transaction description', async () => {
    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      description: 'Updated transaction description'
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransaction.id);
    expect(result.description).toEqual('Updated transaction description');
    expect(result.amount).toEqual(parseFloat(testTransaction.amount)); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      amount: 300.00,
      description: 'Multi-field update',
      pool_id: testPool.id,
      transaction_date: new Date('2024-02-01')
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransaction.id);
    expect(result.amount).toEqual(300.00);
    expect(result.description).toEqual('Multi-field update');
    expect(result.pool_id).toEqual(testPool.id);
    expect(result.transaction_date).toEqual(new Date('2024-02-01'));
  });

  it('should update nullable fields to null', async () => {
    // First set some values
    await updateTransaction({
      id: testTransaction.id,
      pool_id: testPool.id,
      vendor_id: testVendor.id,
      associated_person: 'John Doe'
    });

    // Then update them to null
    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      pool_id: null,
      vendor_id: null,
      associated_person: null
    };

    const result = await updateTransaction(input);

    expect(result.pool_id).toBeNull();
    expect(result.vendor_id).toBeNull();
    expect(result.associated_person).toBeNull();
  });

  it('should update vendor_id for payment type transaction', async () => {
    // Create a payment transaction
    const paymentResult = await db.insert(transactionsTable)
      .values({
        user_id: testUser.id,
        type: 'payment',
        amount: '500.00',
        description: 'Payment transaction',
        vendor_id: testVendor.id,
        transaction_date: new Date('2024-01-20')
      })
      .returning()
      .execute();

    const paymentTransaction = paymentResult[0];

    // Create another vendor
    const newVendorResult = await db.insert(vendorsTable)
      .values({
        user_id: testUser.id,
        name: 'New Vendor',
        description: 'New vendor description'
      })
      .returning()
      .execute();

    const newVendor = newVendorResult[0];

    const input: UpdateTransactionInput = {
      id: paymentTransaction.id,
      vendor_id: newVendor.id
    };

    const result = await updateTransaction(input);

    expect(result.vendor_id).toEqual(newVendor.id);
    expect(result.type).toEqual('payment');
  });

  it('should update category_id for expense transaction', async () => {
    // Create another category
    const newCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUser.id,
        name: 'New Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const newCategory = newCategoryResult[0];

    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      category_id: newCategory.id
    };

    const result = await updateTransaction(input);

    expect(result.category_id).toEqual(newCategory.id);
    expect(result.type).toEqual('expense');
  });

  it('should persist changes to database', async () => {
    const input: UpdateTransactionInput = {
      id: testTransaction.id,
      amount: 999.99,
      description: 'Database persistence test'
    };

    await updateTransaction(input);

    // Query directly from database to verify persistence
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransaction.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toEqual(999.99);
    expect(transactions[0].description).toEqual('Database persistence test');
    expect(transactions[0].updated_at > testTransaction.updated_at).toBe(true);
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionInput = {
      id: 999999, // Non-existent ID
      amount: 100.00
    };

    expect(updateTransaction(input)).rejects.toThrow(/Transaction with id 999999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Update only one field
    const input1: UpdateTransactionInput = {
      id: testTransaction.id,
      amount: 150.25
    };

    const result1 = await updateTransaction(input1);
    expect(result1.amount).toEqual(150.25);
    expect(result1.description).toEqual(testTransaction.description); // Unchanged

    // Update a different field
    const input2: UpdateTransactionInput = {
      id: testTransaction.id,
      description: 'Partially updated'
    };

    const result2 = await updateTransaction(input2);
    expect(result2.amount).toEqual(150.25); // From previous update
    expect(result2.description).toEqual('Partially updated');
  });

  it('should update associated_person for credit transaction', async () => {
    // Create a credit transaction
    const creditResult = await db.insert(transactionsTable)
      .values({
        user_id: testUser.id,
        type: 'credit',
        amount: '1000.00',
        description: 'Credit transaction',
        category_id: testCategory.id,
        associated_person: 'Original Person',
        transaction_date: new Date('2024-01-25')
      })
      .returning()
      .execute();

    const creditTransaction = creditResult[0];

    const input: UpdateTransactionInput = {
      id: creditTransaction.id,
      associated_person: 'Updated Person'
    };

    const result = await updateTransaction(input);

    expect(result.associated_person).toEqual('Updated Person');
    expect(result.type).toEqual('credit');
  });
});