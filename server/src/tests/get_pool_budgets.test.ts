import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poolsTable, budgetsTable } from '../db/schema';
import { getPoolBudgets } from '../handlers/get_pool_budgets';

describe('getPoolBudgets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no budgets exist for pool', async () => {
    // Create test user and pool without budgets
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const poolResult = await db.insert(poolsTable)
      .values({
        user_id: userResult[0].id,
        name: 'Test Pool',
        type: 'expense',
        description: 'A test pool'
      })
      .returning()
      .execute();

    const result = await getPoolBudgets(poolResult[0].id);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all budgets for a specific pool', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create test pool
    const poolResult = await db.insert(poolsTable)
      .values({
        user_id: userResult[0].id,
        name: 'Test Pool',
        type: 'expense',
        description: 'A test pool'
      })
      .returning()
      .execute();

    const poolId = poolResult[0].id;

    // Create multiple budgets for the pool
    const budget1Start = new Date('2024-01-01');
    const budget1End = new Date('2024-01-31');
    const budget2Start = new Date('2024-02-01');
    const budget2End = new Date('2024-02-28');

    await db.insert(budgetsTable)
      .values([
        {
          pool_id: poolId,
          target_amount: '1000.50',
          period_start: budget1Start,
          period_end: budget1End
        },
        {
          pool_id: poolId,
          target_amount: '1200.75',
          period_start: budget2Start,
          period_end: budget2End
        }
      ])
      .execute();

    const result = await getPoolBudgets(poolId);

    expect(result).toHaveLength(2);

    // Check first budget
    const firstBudget = result[0];
    expect(firstBudget.pool_id).toEqual(poolId);
    expect(firstBudget.target_amount).toEqual(1000.50);
    expect(typeof firstBudget.target_amount).toBe('number');
    expect(firstBudget.period_start).toBeInstanceOf(Date);
    expect(firstBudget.period_end).toBeInstanceOf(Date);
    expect(firstBudget.id).toBeDefined();
    expect(firstBudget.created_at).toBeInstanceOf(Date);

    // Check second budget
    const secondBudget = result[1];
    expect(secondBudget.pool_id).toEqual(poolId);
    expect(secondBudget.target_amount).toEqual(1200.75);
    expect(typeof secondBudget.target_amount).toBe('number');
    expect(secondBudget.period_start).toBeInstanceOf(Date);
    expect(secondBudget.period_end).toBeInstanceOf(Date);
    expect(secondBudget.id).toBeDefined();
    expect(secondBudget.created_at).toBeInstanceOf(Date);
  });

  it('should only return budgets for the specified pool', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create two different pools
    const poolsResult = await db.insert(poolsTable)
      .values([
        {
          user_id: userResult[0].id,
          name: 'Pool 1',
          type: 'expense',
          description: 'First pool'
        },
        {
          user_id: userResult[0].id,
          name: 'Pool 2',
          type: 'income',
          description: 'Second pool'
        }
      ])
      .returning()
      .execute();

    const pool1Id = poolsResult[0].id;
    const pool2Id = poolsResult[1].id;

    // Create budgets for both pools
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    await db.insert(budgetsTable)
      .values([
        {
          pool_id: pool1Id,
          target_amount: '1000.00',
          period_start: startDate,
          period_end: endDate
        },
        {
          pool_id: pool1Id,
          target_amount: '1500.00',
          period_start: startDate,
          period_end: endDate
        },
        {
          pool_id: pool2Id,
          target_amount: '2000.00',
          period_start: startDate,
          period_end: endDate
        }
      ])
      .execute();

    // Get budgets for pool 1 only
    const result = await getPoolBudgets(pool1Id);

    expect(result).toHaveLength(2);
    result.forEach(budget => {
      expect(budget.pool_id).toEqual(pool1Id);
    });

    // Verify amounts are correctly converted to numbers
    const amounts = result.map(budget => budget.target_amount);
    expect(amounts).toEqual([1000.00, 1500.00]);
  });

  it('should return empty array for non-existent pool', async () => {
    const nonExistentPoolId = 999999;
    const result = await getPoolBudgets(nonExistentPoolId);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});