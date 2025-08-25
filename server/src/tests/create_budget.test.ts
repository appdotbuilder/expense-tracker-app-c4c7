import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, poolsTable } from '../db/schema';
import { type CreateBudgetInput } from '../schema';
import { createBudget } from '../handlers/create_budget';
import { eq } from 'drizzle-orm';

describe('createBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPoolId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test pool
    const poolResult = await db.insert(poolsTable)
      .values({
        user_id: testUserId,
        name: 'Test Pool',
        type: 'income',
        description: 'A test pool'
      })
      .returning()
      .execute();
    testPoolId = poolResult[0].id;
  });

  const testInput: CreateBudgetInput = {
    pool_id: 1, // Will be overridden in tests
    target_amount: 50000.75,
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31')
  };

  it('should create a budget', async () => {
    const input = { ...testInput, pool_id: testPoolId };
    const result = await createBudget(input);

    // Basic field validation
    expect(result.pool_id).toEqual(testPoolId);
    expect(result.target_amount).toEqual(50000.75);
    expect(typeof result.target_amount).toBe('number');
    expect(result.period_start).toEqual(new Date('2024-01-01'));
    expect(result.period_end).toEqual(new Date('2024-01-31'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save budget to database', async () => {
    const input = { ...testInput, pool_id: testPoolId };
    const result = await createBudget(input);

    // Query using proper drizzle syntax
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].pool_id).toEqual(testPoolId);
    expect(parseFloat(budgets[0].target_amount)).toEqual(50000.75);
    expect(budgets[0].period_start).toEqual(new Date('2024-01-01'));
    expect(budgets[0].period_end).toEqual(new Date('2024-01-31'));
    expect(budgets[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different target amounts correctly', async () => {
    const testCases = [
      { amount: 1000, description: 'simple integer' },
      { amount: 999.99, description: 'decimal with cents' },
      { amount: 0.01, description: 'very small amount' },
      { amount: 1234567.89, description: 'large amount with decimals' }
    ];

    for (const testCase of testCases) {
      const input = { 
        ...testInput, 
        pool_id: testPoolId,
        target_amount: testCase.amount 
      };
      const result = await createBudget(input);

      expect(result.target_amount).toEqual(testCase.amount);
      expect(typeof result.target_amount).toBe('number');

      // Verify in database
      const budgets = await db.select()
        .from(budgetsTable)
        .where(eq(budgetsTable.id, result.id))
        .execute();

      expect(parseFloat(budgets[0].target_amount)).toEqual(testCase.amount);
    }
  });

  it('should handle date ranges correctly', async () => {
    const input = {
      ...testInput,
      pool_id: testPoolId,
      period_start: new Date('2024-06-01T00:00:00.000Z'),
      period_end: new Date('2024-06-30T23:59:59.999Z')
    };
    
    const result = await createBudget(input);

    expect(result.period_start).toEqual(input.period_start);
    expect(result.period_end).toEqual(input.period_end);

    // Verify dates are stored correctly in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets[0].period_start).toEqual(input.period_start);
    expect(budgets[0].period_end).toEqual(input.period_end);
  });

  it('should throw error for invalid pool_id', async () => {
    const input = { 
      ...testInput, 
      pool_id: 99999 // Non-existent pool ID
    };

    await expect(createBudget(input)).rejects.toThrow(/foreign key constraint/i);
  });
});