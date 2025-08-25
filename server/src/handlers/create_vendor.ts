import { db } from '../db';
import { vendorsTable, usersTable } from '../db/schema';
import { type CreateVendorInput, type Vendor } from '../schema';
import { eq } from 'drizzle-orm';

export const createVendor = async (input: CreateVendorInput): Promise<Vendor> => {
  try {
    // Verify that the user exists before creating vendor
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert vendor record
    const result = await db.insert(vendorsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description
      })
      .returning()
      .execute();

    const vendor = result[0];
    return {
      ...vendor
    };
  } catch (error) {
    console.error('Vendor creation failed:', error);
    throw error;
  }
};