import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, vendorsTable, poolsTable, transactionsTable } from '../db/schema';
import { type GetTransactionsQuery } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data setup
let testUserId: number;
let testUser2Id: number;
let testCategoryId: number;
let testVendorId: number;
let testPoolId: number;

const setupTestData = async () => {
  // Create test users
  const users = await db.insert(usersTable)
    .values([
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' }
    ])
    .returning()
    .execute();
  
  testUserId = users[0].id;
  testUser2Id = users[1].id;

  // Create test category
  const categories = await db.insert(categoriesTable)
    .values({
      user_id: testUserId,
      name: 'Food',
      type: 'expense'
    })
    .returning()
    .execute();
  
  testCategoryId = categories[0].id;

  // Create test vendor
  const vendors = await db.insert(vendorsTable)
    .values({
      user_id: testUserId,
      name: 'Test Vendor',
      description: 'Test vendor description'
    })
    .returning()
    .execute();
  
  testVendorId = vendors[0].id;

  // Create test pool
  const pools = await db.insert(poolsTable)
    .values({
      user_id: testUserId,
      name: 'Monthly Budget',
      type: 'expense',
      description: 'Monthly expense pool'
    })
    .returning()
    .execute();
  
  testPoolId = pools[0].id;

  // Create test transactions with different types and dates
  const baseDate = new Date('2024-01-15');
  const olderDate = new Date('2023-12-15');
  const newerDate = new Date('2024-02-15');

  await db.insert(transactionsTable)
    .values([
      {
        user_id: testUserId,
        type: 'expense',
        amount: '100.50',
        description: 'Grocery shopping',
        category_id: testCategoryId,
        pool_id: testPoolId,
        transaction_date: baseDate
      },
      {
        user_id: testUserId,
        type: 'income',
        amount: '2000.00',
        description: 'Salary',
        category_id: null,
        pool_id: null,
        transaction_date: baseDate
      },
      {
        user_id: testUserId,
        type: 'payment',
        amount: '50.75',
        description: 'Coffee shop',
        vendor_id: testVendorId,
        category_id: null,
        pool_id: testPoolId,
        transaction_date: olderDate
      },
      {
        user_id: testUserId,
        type: 'credit',
        amount: '25.00',
        description: 'Loan to friend',
        associated_person: 'John Doe',
        category_id: null,
        pool_id: null,
        transaction_date: newerDate
      },
      {
        user_id: testUser2Id,
        type: 'expense',
        amount: '200.00',
        description: 'Different user transaction',
        category_id: null,
        pool_id: null,
        transaction_date: baseDate
      }
    ])
    .execute();
};

describe('getTransactions', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });

  afterEach(resetDB);

  it('should get all transactions for a user', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(4);
    
    // Verify all transactions belong to correct user
    result.forEach(transaction => {
      expect(transaction.user_id).toBe(testUserId);
      expect(typeof transaction.amount).toBe('number');
    });

    // Verify different transaction types are included
    const types = result.map(t => t.type);
    expect(types).toContain('expense');
    expect(types).toContain('income');
    expect(types).toContain('payment');
    expect(types).toContain('credit');
  });

  it('should filter transactions by type', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      type: 'expense'
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('expense');
    expect(result[0].description).toBe('Grocery shopping');
    expect(result[0].amount).toBe(100.50);
  });

  it('should filter transactions by pool_id', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      pool_id: testPoolId
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.pool_id).toBe(testPoolId);
    });

    // Should include both expense and payment transactions in the pool
    const types = result.map(t => t.type);
    expect(types).toContain('expense');
    expect(types).toContain('payment');
  });

  it('should filter transactions by category_id', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(testCategoryId);
    expect(result[0].type).toBe('expense');
    expect(result[0].description).toBe('Grocery shopping');
  });

  it('should filter transactions by vendor_id', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      vendor_id: testVendorId
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].vendor_id).toBe(testVendorId);
    expect(result[0].type).toBe('payment');
    expect(result[0].description).toBe('Coffee shop');
  });

  it('should filter transactions by start_date', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(3); // Excludes the 2023-12-15 transaction
    result.forEach(transaction => {
      expect(transaction.transaction_date >= new Date('2024-01-01')).toBe(true);
    });
  });

  it('should filter transactions by end_date', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      end_date: new Date('2024-01-31')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(3); // Excludes the 2024-02-15 transaction
    result.forEach(transaction => {
      expect(transaction.transaction_date <= new Date('2024-01-31')).toBe(true);
    });
  });

  it('should filter transactions by date range', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(2); // Only transactions from January 2024
    result.forEach(transaction => {
      expect(transaction.transaction_date >= new Date('2024-01-01')).toBe(true);
      expect(transaction.transaction_date <= new Date('2024-01-31')).toBe(true);
    });
  });

  it('should filter transactions with multiple criteria', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      type: 'payment',
      pool_id: testPoolId,
      vendor_id: testVendorId
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('payment');
    expect(result[0].pool_id).toBe(testPoolId);
    expect(result[0].vendor_id).toBe(testVendorId);
    expect(result[0].description).toBe('Coffee shop');
  });

  it('should return empty array when no transactions match filters', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      type: 'expense',
      start_date: new Date('2025-01-01')
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const query: GetTransactionsQuery = {
      user_id: 99999
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(0);
  });

  it('should correctly convert numeric amounts', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      type: 'income'
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toBe(2000.00);
  });

  it('should handle transactions with null optional fields', async () => {
    const query: GetTransactionsQuery = {
      user_id: testUserId,
      type: 'credit'
    };

    const result = await getTransactions(query);

    expect(result).toHaveLength(1);
    expect(result[0].pool_id).toBeNull();
    expect(result[0].category_id).toBeNull();
    expect(result[0].vendor_id).toBeNull();
    expect(result[0].associated_person).toBe('John Doe');
  });
});