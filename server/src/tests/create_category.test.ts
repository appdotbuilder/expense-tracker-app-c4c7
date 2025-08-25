import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

describe('createCategory', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user for foreign key relationship
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create an income category', async () => {
    const testInput: CreateCategoryInput = {
      user_id: userId,
      name: 'Salary',
      type: 'income'
    };

    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Salary');
    expect(result.type).toEqual('income');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an expense category', async () => {
    const testInput: CreateCategoryInput = {
      user_id: userId,
      name: 'Groceries',
      type: 'expense'
    };

    const result = await createCategory(testInput);

    expect(result.name).toEqual('Groceries');
    expect(result.type).toEqual('expense');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a credit category', async () => {
    const testInput: CreateCategoryInput = {
      user_id: userId,
      name: 'Personal Loan',
      type: 'credit'
    };

    const result = await createCategory(testInput);

    expect(result.name).toEqual('Personal Loan');
    expect(result.type).toEqual('credit');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const testInput: CreateCategoryInput = {
      user_id: userId,
      name: 'Utilities',
      type: 'expense'
    };

    const result = await createCategory(testInput);

    // Query database to verify category was saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Utilities');
    expect(categories[0].type).toEqual('expense');
    expect(categories[0].user_id).toEqual(userId);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories for the same user', async () => {
    const inputs: CreateCategoryInput[] = [
      { user_id: userId, name: 'Food', type: 'expense' },
      { user_id: userId, name: 'Transport', type: 'expense' },
      { user_id: userId, name: 'Freelance', type: 'income' }
    ];

    const results = await Promise.all(
      inputs.map(input => createCategory(input))
    );

    expect(results).toHaveLength(3);
    
    // Verify all categories were created with different IDs
    const ids = results.map(r => r.id);
    expect(new Set(ids).size).toEqual(3); // All IDs should be unique

    // Verify all categories are in database
    const dbCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, userId))
      .execute();

    expect(dbCategories).toHaveLength(3);
    
    const names = dbCategories.map(c => c.name).sort();
    expect(names).toEqual(['Food', 'Freelance', 'Transport']);
  });

  it('should handle foreign key constraint when user does not exist', async () => {
    const testInput: CreateCategoryInput = {
      user_id: 99999, // Non-existent user ID
      name: 'Test Category',
      type: 'expense'
    };

    await expect(createCategory(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});