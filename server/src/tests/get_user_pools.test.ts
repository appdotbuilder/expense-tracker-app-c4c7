import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poolsTable } from '../db/schema';
import { type CreateUserInput, type CreatePoolInput } from '../schema';
import { getUserPools } from '../handlers/get_user_pools';

// Test data
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  name: 'Test User 1'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  name: 'Test User 2'
};

const testPool1: CreatePoolInput = {
  user_id: 1,
  name: 'Income Pool',
  type: 'income',
  description: 'Pool for tracking income'
};

const testPool2: CreatePoolInput = {
  user_id: 1,
  name: 'Expense Pool',
  type: 'expense',
  description: 'Pool for tracking expenses'
};

const testPool3: CreatePoolInput = {
  user_id: 2,
  name: 'Credit Pool',
  type: 'credit',
  description: 'Pool for credit transactions'
};

describe('getUserPools', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no pools', async () => {
    // Create user but no pools
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const result = await getUserPools(1);

    expect(result).toEqual([]);
  });

  it('should return all pools for a specific user', async () => {
    // Create users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Create pools for both users
    await db.insert(poolsTable)
      .values([testPool1, testPool2, testPool3])
      .execute();

    const result = await getUserPools(1);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Income Pool');
    expect(result[0].type).toEqual('income');
    expect(result[0].description).toEqual('Pool for tracking income');
    expect(result[0].user_id).toEqual(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Expense Pool');
    expect(result[1].type).toEqual('expense');
    expect(result[1].description).toEqual('Pool for tracking expenses');
    expect(result[1].user_id).toEqual(1);
  });

  it('should only return pools belonging to the specified user', async () => {
    // Create users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Create pools for both users
    await db.insert(poolsTable)
      .values([testPool1, testPool2, testPool3])
      .execute();

    const user1Pools = await getUserPools(1);
    const user2Pools = await getUserPools(2);

    expect(user1Pools).toHaveLength(2);
    expect(user2Pools).toHaveLength(1);

    // Verify user1 pools don't include user2's pool
    user1Pools.forEach(pool => {
      expect(pool.user_id).toEqual(1);
      expect(pool.name).not.toEqual('Credit Pool');
    });

    // Verify user2 pool
    expect(user2Pools[0].name).toEqual('Credit Pool');
    expect(user2Pools[0].user_id).toEqual(2);
  });

  it('should handle pools with null descriptions', async () => {
    // Create user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Create pool with null description
    const poolWithNullDescription: CreatePoolInput = {
      user_id: 1,
      name: 'Payment Pool',
      type: 'payment',
      description: null
    };

    await db.insert(poolsTable)
      .values(poolWithNullDescription)
      .execute();

    const result = await getUserPools(1);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Payment Pool');
    expect(result[0].type).toEqual('payment');
    expect(result[0].description).toBeNull();
  });

  it('should return pools in the order they were created', async () => {
    // Create user
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Create pools in specific order
    await db.insert(poolsTable)
      .values(testPool1)
      .execute();

    await db.insert(poolsTable)
      .values(testPool2)
      .execute();

    const result = await getUserPools(1);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Income Pool');
    expect(result[1].name).toEqual('Expense Pool');
  });

  it('should handle non-existent user gracefully', async () => {
    // Don't create any users or pools
    const result = await getUserPools(999);

    expect(result).toEqual([]);
  });
});