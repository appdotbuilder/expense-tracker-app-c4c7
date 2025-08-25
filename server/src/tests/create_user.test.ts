import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User'
};

const testInput2: CreateUserInput = {
  email: 'another@example.com',
  name: 'Another User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Verify returned user object
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify persistence
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].id).toEqual(result.id);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with unique emails', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(testInput2);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('another@example.com');

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    
    const emails = allUsers.map(user => user.email);
    expect(emails).toContain('test@example.com');
    expect(emails).toContain('another@example.com');
  });

  it('should handle email validation constraint', async () => {
    const invalidEmailInput = {
      email: 'invalid-email',
      name: 'Test User'
    };

    // Note: Email validation happens at Zod schema level, not database level
    // This test demonstrates the handler would work with any string passed to it
    // but in practice, the input would be validated before reaching the handler
    await expect(createUser(invalidEmailInput as CreateUserInput)).resolves.toBeDefined();
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email should fail
    await expect(createUser(testInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    // Verify timestamps are within expected range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    
    // Initially, created_at and updated_at should be the same
    expect(result.created_at.getTime()).toEqual(result.updated_at.getTime());
  });

  it('should handle special characters in name and email', async () => {
    const specialInput: CreateUserInput = {
      email: 'test+special@example-domain.co.uk',
      name: "O'Connor-Smith Jr."
    };

    const result = await createUser(specialInput);

    expect(result.email).toEqual('test+special@example-domain.co.uk');
    expect(result.name).toEqual("O'Connor-Smith Jr.");

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].email).toEqual('test+special@example-domain.co.uk');
    expect(users[0].name).toEqual("O'Connor-Smith Jr.");
  });
});