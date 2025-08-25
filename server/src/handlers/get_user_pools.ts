import { db } from '../db';
import { poolsTable } from '../db/schema';
import { type Pool } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserPools = async (userId: number): Promise<Pool[]> => {
  try {
    const results = await db.select()
      .from(poolsTable)
      .where(eq(poolsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(pool => ({
      ...pool,
      // No numeric fields in pools table that need conversion
    }));
  } catch (error) {
    console.error('Failed to fetch user pools:', error);
    throw error;
  }
};