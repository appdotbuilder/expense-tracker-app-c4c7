import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, vendorsTable } from '../db/schema';
import { getUserVendors } from '../handlers/get_user_vendors';

describe('getUserVendors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all vendors for a specific user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'user1@test.com', name: 'User One' },
        { email: 'user2@test.com', name: 'User Two' }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create vendors for user1
    await db.insert(vendorsTable)
      .values([
        {
          user_id: user1.id,
          name: 'Amazon',
          description: 'Online marketplace'
        },
        {
          user_id: user1.id,
          name: 'Local Grocery Store',
          description: null
        }
      ])
      .execute();

    // Create vendor for user2 (should not be returned)
    await db.insert(vendorsTable)
      .values({
        user_id: user2.id,
        name: 'Different Store',
        description: 'Another user vendor'
      })
      .execute();

    const result = await getUserVendors(user1.id);

    expect(result).toHaveLength(2);
    expect(result.every(vendor => vendor.user_id === user1.id)).toBe(true);
    
    // Check vendor names
    const vendorNames = result.map(v => v.name).sort();
    expect(vendorNames).toEqual(['Amazon', 'Local Grocery Store']);

    // Verify vendor details
    const amazonVendor = result.find(v => v.name === 'Amazon');
    expect(amazonVendor?.description).toBe('Online marketplace');
    expect(amazonVendor?.id).toBeDefined();
    expect(amazonVendor?.created_at).toBeInstanceOf(Date);

    const groceryVendor = result.find(v => v.name === 'Local Grocery Store');
    expect(groceryVendor?.description).toBeNull();
  });

  it('should return empty array when user has no vendors', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({ email: 'user@test.com', name: 'Test User' })
      .returning()
      .execute();

    const result = await getUserVendors(users[0].id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getUserVendors(99999);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle vendors with all null optional fields', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({ email: 'user@test.com', name: 'Test User' })
      .returning()
      .execute();

    // Create vendor with minimal data
    await db.insert(vendorsTable)
      .values({
        user_id: users[0].id,
        name: 'Minimal Vendor',
        description: null
      })
      .execute();

    const result = await getUserVendors(users[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Minimal Vendor');
    expect(result[0].description).toBeNull();
    expect(result[0].user_id).toBe(users[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should maintain correct order of vendors', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({ email: 'user@test.com', name: 'Test User' })
      .returning()
      .execute();

    // Create multiple vendors
    const vendorData = [
      { user_id: users[0].id, name: 'Vendor A', description: 'First vendor' },
      { user_id: users[0].id, name: 'Vendor B', description: 'Second vendor' },
      { user_id: users[0].id, name: 'Vendor C', description: 'Third vendor' }
    ];

    await db.insert(vendorsTable)
      .values(vendorData)
      .execute();

    const result = await getUserVendors(users[0].id);

    expect(result).toHaveLength(3);
    
    // Verify all vendors belong to the correct user
    expect(result.every(vendor => vendor.user_id === users[0].id)).toBe(true);
    
    // Verify all required fields are present
    result.forEach(vendor => {
      expect(vendor.id).toBeDefined();
      expect(vendor.name).toBeTruthy();
      expect(vendor.created_at).toBeInstanceOf(Date);
      expect(typeof vendor.user_id).toBe('number');
    });
  });
});