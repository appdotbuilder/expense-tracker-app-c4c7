import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type CreateUserInput, type CreateCategoryInput } from '../schema';
import { getUserCategories } from '../handlers/get_user_categories';

// Test data
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  name: 'Test User 1'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  name: 'Test User 2'
};

describe('getUserCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no categories', async () => {
    // Create a user but no categories
    const users = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    
    const userId = users[0].id;

    const result = await getUserCategories(userId);

    expect(result).toEqual([]);
  });

  it('should return all categories for a specific user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();
    
    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create categories for user1
    const user1Categories: CreateCategoryInput[] = [
      { user_id: user1Id, name: 'Salary', type: 'income' },
      { user_id: user1Id, name: 'Groceries', type: 'expense' },
      { user_id: user1Id, name: 'Credit Card', type: 'credit' }
    ];

    // Create categories for user2
    const user2Categories: CreateCategoryInput[] = [
      { user_id: user2Id, name: 'Freelance', type: 'income' },
      { user_id: user2Id, name: 'Utilities', type: 'expense' }
    ];

    await db.insert(categoriesTable)
      .values([...user1Categories, ...user2Categories])
      .execute();

    const result = await getUserCategories(user1Id);

    // Should return only user1's categories
    expect(result).toHaveLength(3);
    expect(result.every(cat => cat.user_id === user1Id)).toBe(true);
    
    // Check specific categories exist
    const categoryNames = result.map(cat => cat.name);
    expect(categoryNames).toContain('Salary');
    expect(categoryNames).toContain('Groceries');
    expect(categoryNames).toContain('Credit Card');
    expect(categoryNames).not.toContain('Freelance'); // This belongs to user2
  });

  it('should return categories ordered by name alphabetically', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    
    const userId = users[0].id;

    // Create categories in random order
    const categories: CreateCategoryInput[] = [
      { user_id: userId, name: 'Zebra Fund', type: 'income' },
      { user_id: userId, name: 'Apple Purchases', type: 'expense' },
      { user_id: userId, name: 'Monthly Budget', type: 'credit' }
    ];

    await db.insert(categoriesTable)
      .values(categories)
      .execute();

    const result = await getUserCategories(userId);

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Apple Purchases');
    expect(result[1].name).toEqual('Monthly Budget');
    expect(result[2].name).toEqual('Zebra Fund');
  });

  it('should return categories with all required fields', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    
    const userId = users[0].id;

    // Create a category
    const categoryInput: CreateCategoryInput = {
      user_id: userId,
      name: 'Test Category',
      type: 'income'
    };

    await db.insert(categoriesTable)
      .values(categoryInput)
      .execute();

    const result = await getUserCategories(userId);

    expect(result).toHaveLength(1);
    const category = result[0];
    
    // Verify all fields are present
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('number');
    expect(category.user_id).toEqual(userId);
    expect(category.name).toEqual('Test Category');
    expect(category.type).toEqual('income');
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should handle different category types correctly', async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    
    const userId = users[0].id;

    // Create categories of all types
    const categories: CreateCategoryInput[] = [
      { user_id: userId, name: 'Income Category', type: 'income' },
      { user_id: userId, name: 'Expense Category', type: 'expense' },
      { user_id: userId, name: 'Credit Category', type: 'credit' }
    ];

    await db.insert(categoriesTable)
      .values(categories)
      .execute();

    const result = await getUserCategories(userId);

    expect(result).toHaveLength(3);
    
    // Verify all category types are present
    const types = result.map(cat => cat.type);
    expect(types).toContain('income');
    expect(types).toContain('expense');
    expect(types).toContain('credit');
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserId = 99999;

    const result = await getUserCategories(nonExistentUserId);

    expect(result).toEqual([]);
  });
});