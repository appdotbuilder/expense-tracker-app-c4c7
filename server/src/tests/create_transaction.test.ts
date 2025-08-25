import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable, categoriesTable, vendorsTable, poolsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testIncomeCategory = {
  name: 'Salary',
  type: 'income' as const
};

const testExpenseCategory = {
  name: 'Groceries',
  type: 'expense' as const
};

const testCreditCategory = {
  name: 'Personal Loan',
  type: 'credit' as const
};

const testVendor = {
  name: 'Test Store',
  description: 'A test vendor'
};

const testPool = {
  name: 'Monthly Budget',
  type: 'expense' as const,
  description: 'Test pool'
};

describe('createTransaction', () => {
  let userId: number;
  let incomeCategoryId: number;
  let expenseCategoryId: number;
  let creditCategoryId: number;
  let vendorId: number;
  let poolId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test categories
    const incomeCategoryResult = await db.insert(categoriesTable)
      .values({ ...testIncomeCategory, user_id: userId })
      .returning()
      .execute();
    incomeCategoryId = incomeCategoryResult[0].id;

    const expenseCategoryResult = await db.insert(categoriesTable)
      .values({ ...testExpenseCategory, user_id: userId })
      .returning()
      .execute();
    expenseCategoryId = expenseCategoryResult[0].id;

    const creditCategoryResult = await db.insert(categoriesTable)
      .values({ ...testCreditCategory, user_id: userId })
      .returning()
      .execute();
    creditCategoryId = creditCategoryResult[0].id;

    // Create test vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({ ...testVendor, user_id: userId })
      .returning()
      .execute();
    vendorId = vendorResult[0].id;

    // Create test pool
    const poolResult = await db.insert(poolsTable)
      .values({ ...testPool, user_id: userId })
      .returning()
      .execute();
    poolId = poolResult[0].id;
  });

  afterEach(resetDB);

  it('should create an income transaction with category', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'income',
      amount: 5000.00,
      description: 'Monthly salary',
      category_id: incomeCategoryId,
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    // Validate returned transaction
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(5000.00);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Monthly salary');
    expect(result.category_id).toEqual(incomeCategoryId);
    expect(result.vendor_id).toBeNull();
    expect(result.associated_person).toBeNull();
    expect(result.transaction_date).toEqual(new Date('2023-12-01'));
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an expense transaction with category and pool', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      pool_id: poolId,
      type: 'expense',
      amount: 250.50,
      description: 'Weekly groceries',
      category_id: expenseCategoryId,
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(250.50);
    expect(result.pool_id).toEqual(poolId);
    expect(result.category_id).toEqual(expenseCategoryId);
  });

  it('should create a credit transaction with associated person', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'credit',
      amount: 1000.00,
      description: 'Borrowed from friend',
      category_id: creditCategoryId,
      associated_person: 'John Doe',
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    expect(result.type).toEqual('credit');
    expect(result.amount).toEqual(1000.00);
    expect(result.category_id).toEqual(creditCategoryId);
    expect(result.associated_person).toEqual('John Doe');
  });

  it('should create a payment transaction with vendor', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'payment',
      amount: 150.75,
      description: 'Store purchase',
      vendor_id: vendorId,
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    expect(result.type).toEqual('payment');
    expect(result.amount).toEqual(150.75);
    expect(result.vendor_id).toEqual(vendorId);
    expect(result.category_id).toBeNull();
  });

  it('should save transaction to database', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'income',
      amount: 3000.00,
      description: 'Freelance work',
      category_id: incomeCategoryId,
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    // Query the database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(userId);
    expect(transactions[0].type).toEqual('income');
    expect(parseFloat(transactions[0].amount)).toEqual(3000.00);
    expect(transactions[0].description).toEqual('Freelance work');
    expect(transactions[0].category_id).toEqual(incomeCategoryId);
  });

  it('should throw error when user does not exist', async () => {
    const input: CreateTransactionInput = {
      user_id: 999999, // Non-existent user
      type: 'income',
      amount: 1000.00,
      description: 'Test transaction',
      transaction_date: new Date('2023-12-01')
    };

    await expect(createTransaction(input)).rejects.toThrow(/User with id 999999 does not exist/i);
  });

  it('should throw error when pool does not exist', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      pool_id: 999999, // Non-existent pool
      type: 'expense',
      amount: 100.00,
      description: 'Test expense',
      transaction_date: new Date('2023-12-01')
    };

    await expect(createTransaction(input)).rejects.toThrow(/Pool with id 999999 does not exist/i);
  });

  it('should throw error when category does not exist', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'income',
      amount: 1000.00,
      description: 'Test income',
      category_id: 999999, // Non-existent category
      transaction_date: new Date('2023-12-01')
    };

    await expect(createTransaction(input)).rejects.toThrow(/Category with id 999999 does not exist/i);
  });

  it('should throw error when vendor does not exist', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'payment',
      amount: 100.00,
      description: 'Test payment',
      vendor_id: 999999, // Non-existent vendor
      transaction_date: new Date('2023-12-01')
    };

    await expect(createTransaction(input)).rejects.toThrow(/Vendor with id 999999 does not exist/i);
  });

  it('should throw error when category type does not match transaction type', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'income',
      amount: 1000.00,
      description: 'Test income',
      category_id: expenseCategoryId, // Using expense category for income transaction
      transaction_date: new Date('2023-12-01')
    };

    await expect(createTransaction(input)).rejects.toThrow(/Category type 'expense' does not match transaction type 'income'/i);
  });

  it('should create transaction without optional fields', async () => {
    const input: CreateTransactionInput = {
      user_id: userId,
      type: 'expense',
      amount: 50.00,
      description: 'Simple expense',
      transaction_date: new Date('2023-12-01')
    };

    const result = await createTransaction(input);

    expect(result.pool_id).toBeNull();
    expect(result.category_id).toBeNull();
    expect(result.vendor_id).toBeNull();
    expect(result.associated_person).toBeNull();
    expect(result.amount).toEqual(50.00);
  });
});