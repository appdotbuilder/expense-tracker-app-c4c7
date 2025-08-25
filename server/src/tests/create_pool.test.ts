import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { poolsTable, usersTable } from '../db/schema';
import { type CreatePoolInput } from '../schema';
import { createPool } from '../handlers/create_pool';
import { eq } from 'drizzle-orm';

describe('createPool', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a pool with all fields', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const testInput: CreatePoolInput = {
      user_id: userId,
      name: 'Emergency Fund',
      type: 'expense',
      description: 'Pool for emergency expenses'
    };

    const result = await createPool(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.name).toEqual('Emergency Fund');
    expect(result.type).toEqual('expense');
    expect(result.description).toEqual('Pool for emergency expenses');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a pool with null description', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const testInput: CreatePoolInput = {
      user_id: userId,
      name: 'Income Pool',
      type: 'income',
      description: null
    };

    const result = await createPool(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.name).toEqual('Income Pool');
    expect(result.type).toEqual('income');
    expect(result.description).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save pool to database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test3@example.com',
        name: 'Test User 3'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const testInput: CreatePoolInput = {
      user_id: userId,
      name: 'Credit Pool',
      type: 'credit',
      description: 'Pool for credit transactions'
    };

    const result = await createPool(testInput);

    // Query using proper drizzle syntax
    const pools = await db.select()
      .from(poolsTable)
      .where(eq(poolsTable.id, result.id))
      .execute();

    expect(pools).toHaveLength(1);
    expect(pools[0].name).toEqual('Credit Pool');
    expect(pools[0].type).toEqual('credit');
    expect(pools[0].description).toEqual('Pool for credit transactions');
    expect(pools[0].user_id).toEqual(userId);
    expect(pools[0].created_at).toBeInstanceOf(Date);
  });

  it('should create pools with different types', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test4@example.com',
        name: 'Test User 4'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const poolTypes = ['income', 'expense', 'credit', 'payment'] as const;
    
    for (const type of poolTypes) {
      const testInput: CreatePoolInput = {
        user_id: userId,
        name: `${type} Pool`,
        type: type,
        description: `Pool for ${type} transactions`
      };

      const result = await createPool(testInput);

      expect(result.type).toEqual(type);
      expect(result.name).toEqual(`${type} Pool`);
      expect(result.user_id).toEqual(userId);
    }

    // Verify all pools were created
    const allPools = await db.select()
      .from(poolsTable)
      .where(eq(poolsTable.user_id, userId))
      .execute();

    expect(allPools).toHaveLength(4);
    
    const createdTypes = allPools.map(pool => pool.type).sort();
    expect(createdTypes).toEqual(['credit', 'expense', 'income', 'payment']);
  });

  it('should throw error for invalid user_id', async () => {
    const testInput: CreatePoolInput = {
      user_id: 99999, // Non-existent user ID
      name: 'Test Pool',
      type: 'expense',
      description: 'Test description'
    };

    await expect(createPool(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});