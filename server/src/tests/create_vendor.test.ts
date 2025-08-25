import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, usersTable } from '../db/schema';
import { type CreateVendorInput } from '../schema';
import { createVendor } from '../handlers/create_vendor';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

// Test vendor inputs
const testVendorWithDescription: CreateVendorInput = {
  user_id: 1,
  name: 'Test Vendor',
  description: 'A reliable vendor for payments'
};

const testVendorWithoutDescription: CreateVendorInput = {
  user_id: 1,
  name: 'Another Vendor',
  description: null
};

describe('createVendor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create a test user for each test
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  it('should create a vendor with description', async () => {
    const result = await createVendor(testVendorWithDescription);

    // Basic field validation
    expect(result.name).toEqual('Test Vendor');
    expect(result.description).toEqual('A reliable vendor for payments');
    expect(result.user_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a vendor without description', async () => {
    const result = await createVendor(testVendorWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Another Vendor');
    expect(result.description).toBeNull();
    expect(result.user_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save vendor to database', async () => {
    const result = await createVendor(testVendorWithDescription);

    // Query using proper drizzle syntax
    const vendors = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, result.id))
      .execute();

    expect(vendors).toHaveLength(1);
    expect(vendors[0].name).toEqual('Test Vendor');
    expect(vendors[0].description).toEqual('A reliable vendor for payments');
    expect(vendors[0].user_id).toEqual(1);
    expect(vendors[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const invalidVendorInput: CreateVendorInput = {
      user_id: 999, // Non-existent user
      name: 'Invalid Vendor',
      description: 'Should fail'
    };

    await expect(createVendor(invalidVendorInput))
      .rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should create multiple vendors for same user', async () => {
    const vendor1 = await createVendor(testVendorWithDescription);
    const vendor2 = await createVendor(testVendorWithoutDescription);

    // Both vendors should be created successfully
    expect(vendor1.id).toBeDefined();
    expect(vendor2.id).toBeDefined();
    expect(vendor1.id).not.toEqual(vendor2.id);

    // Verify both exist in database
    const vendors = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.user_id, 1))
      .execute();

    expect(vendors).toHaveLength(2);
    
    const vendorNames = vendors.map(v => v.name).sort();
    expect(vendorNames).toEqual(['Another Vendor', 'Test Vendor']);
  });

  it('should allow vendors with same name for different users', async () => {
    // Create second user
    const secondUser = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User 2'
      })
      .returning()
      .execute();

    const vendor1 = await createVendor({
      user_id: 1,
      name: 'Common Vendor Name',
      description: 'First user vendor'
    });

    const vendor2 = await createVendor({
      user_id: secondUser[0].id,
      name: 'Common Vendor Name',
      description: 'Second user vendor'
    });

    expect(vendor1.name).toEqual(vendor2.name);
    expect(vendor1.user_id).not.toEqual(vendor2.user_id);
    expect(vendor1.id).not.toEqual(vendor2.id);
  });
});