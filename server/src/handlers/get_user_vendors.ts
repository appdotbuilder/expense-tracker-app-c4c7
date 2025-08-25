import { db } from '../db';
import { vendorsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Vendor } from '../schema';

export const getUserVendors = async (userId: number): Promise<Vendor[]> => {
  try {
    const vendors = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.user_id, userId))
      .execute();

    return vendors;
  } catch (error) {
    console.error('Failed to fetch user vendors:', error);
    throw error;
  }
};